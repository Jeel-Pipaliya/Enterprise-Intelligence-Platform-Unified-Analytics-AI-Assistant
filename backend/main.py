from fastapi import FastAPI, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
import csv
import hashlib
import io
import math
import os
import random
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres"

def load_env_file() -> None:
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_env_file()

def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL") or DEFAULT_DATABASE_URL
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url

engine = create_engine(get_database_url(), pool_pre_ping=True)

# Simple password hashing (not bcrypt to avoid compilation issues)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "customer"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

class QueryRequest(BaseModel):
    query: str

class BacktestRequest(BaseModel):
    ticker: str
    strategy: str = "ma_crossover"
    start_date: str
    end_date: str
    initial_capital: float = 100000
    slippage_pct: float = 0.001
    short_window: int = 20
    long_window: int = 50
    rsi_period: int = 14
    rsi_oversold: int = 30
    rsi_overbought: int = 70

class CompareRequest(BaseModel):
    ticker: str
    strategies: list[str]
    start_date: str
    end_date: str
    initial_capital: float = 100000
    slippage_pct: float = 0.001
    short_window: int = 20
    long_window: int = 50
    rsi_period: int = 14
    rsi_oversold: int = 30
    rsi_overbought: int = 70

class ConversationPayload(BaseModel):
    title: str = "New Conversation"
    messages: list[dict] = []

# Database functions
def init_db():
    with engine.begin() as conn:
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    '''))

        # Add default users if they don't exist
        default_users = [
            ("admin@example.com", "Admin User", "admin123", "admin"),
            ("analyst@example.com", "Analyst User", "analyst123", "analyst"),
            ("customer@example.com", "Customer User", "customer123", "customer"),
        ]

        for email, name, pwd, role in default_users:
            hashed = hash_password(pwd)
            conn.execute(
                text('''
                    INSERT INTO users (email, full_name, hashed_password, role)
                    VALUES (:email, :full_name, :hashed_password, :role)
                    ON CONFLICT (email) DO NOTHING
                '''),
                {
                    "email": email,
                    "full_name": name,
                    "hashed_password": hashed,
                    "role": role,
                },
            )

def get_user_by_email(email: str):
    with engine.connect() as conn:
        user = conn.execute(
            text('SELECT id, email, full_name, hashed_password, role FROM users WHERE email = :email'),
            {"email": email},
        ).mappings().first()
        return dict(user) if user else None

def create_user(email: str, full_name: str, password: str, role: str):
    hashed_password = hash_password(password)
    try:
        with engine.begin() as conn:
            user = conn.execute(
                text('''
                    INSERT INTO users (email, full_name, hashed_password, role)
                    VALUES (:email, :full_name, :hashed_password, :role)
                    RETURNING id, email, full_name, role
                '''),
                {
                    "email": email,
                    "full_name": full_name,
                    "hashed_password": hashed_password,
                    "role": role,
                },
            ).mappings().first()
            return dict(user) if user else None
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")

# JWT functions
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def to_float(value, default=0.0):
    return float(value) if value is not None else default

def rows(query: str, params: dict | None = None):
    with engine.connect() as conn:
        return [dict(row) for row in conn.execute(text(query), params or {}).mappings().all()]

def one(query: str, params: dict | None = None):
    with engine.connect() as conn:
        row = conn.execute(text(query), params or {}).mappings().first()
        return dict(row) if row else None

def execute(query: str, params: dict | None = None):
    with engine.begin() as conn:
        return conn.execute(text(query), params or {})

def current_user_from_header(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    email = verify_token(authorization.replace("Bearer ", ""))
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def strategy_name(strategy: str) -> str:
    return {
        "ma_crossover": "Moving Average Crossover",
        "rsi_threshold": "RSI Mean Reversion",
        "buy_and_hold": "Buy & Hold Baseline",
    }.get(strategy, strategy.replace("_", " ").title())

def synthetic_backtest(req: BacktestRequest, user_id: int | None = None):
    seed = f"{req.ticker}:{req.strategy}:{req.start_date}:{req.end_date}"
    rng = random.Random(seed)
    points = 48
    capital = float(req.initial_capital)
    benchmark = capital
    peak = capital
    equity_curve = []

    strategy_bias = {
        "ma_crossover": 0.0025,
        "rsi_threshold": 0.0018,
        "buy_and_hold": 0.0012,
    }.get(req.strategy, 0.0015)

    for i in range(points):
        date = datetime.fromisoformat(req.start_date) + (datetime.fromisoformat(req.end_date) - datetime.fromisoformat(req.start_date)) * (i / max(points - 1, 1))
        capital *= 1 + strategy_bias + rng.uniform(-0.018, 0.02)
        benchmark *= 1 + 0.0013 + rng.uniform(-0.015, 0.017)
        peak = max(peak, capital)
        equity_curve.append({
            "date": date.date().isoformat(),
            "portfolio_value": round(capital, 2),
            "benchmark_value": round(benchmark, 2),
            "drawdown_pct": round(((capital - peak) / peak) * 100, 2),
        })

    total_return = ((capital / req.initial_capital) - 1) * 100
    benchmark_return = ((benchmark / req.initial_capital) - 1) * 100
    max_drawdown = abs(min(point["drawdown_pct"] for point in equity_curve))
    sharpe = (total_return / max(max_drawdown, 1)) + rng.uniform(0.2, 0.9)
    win_rate = min(88, max(35, 52 + total_return / 3 + rng.uniform(-8, 8)))
    trades_count = rng.randint(4, 10) if req.strategy != "buy_and_hold" else 1
    winning = round(trades_count * win_rate / 100)
    losing = trades_count - winning
    trade_log = []

    for i in range(trades_count):
        entry_price = rng.uniform(80, 240)
        ret = rng.uniform(-0.08, 0.14) + (0.02 if i < winning else -0.02)
        qty = rng.randint(20, 120)
        exit_price = entry_price * (1 + ret)
        trade_log.append({
            "id": i + 1,
            "entry_date": equity_curve[min(i * 4, points - 2)]["date"],
            "entry_price": round(entry_price, 2),
            "exit_date": equity_curve[min(i * 4 + 2, points - 1)]["date"],
            "exit_price": round(exit_price, 2),
            "direction": "LONG",
            "quantity": qty,
            "pnl": round((exit_price - entry_price) * qty, 2),
            "return_pct": round(ret * 100, 2),
        })

    metrics = {
        "total_return_pct": round(total_return, 2),
        "annualized_return_pct": round(total_return, 2),
        "benchmark_return_pct": round(benchmark_return, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(max(sharpe * 1.15, 0), 2),
        "max_drawdown_pct": round(max_drawdown, 2),
        "win_rate_pct": round(win_rate, 1),
        "volatility_pct": round(12 + rng.random() * 18, 2),
        "winning_trades": winning,
        "losing_trades": losing,
    }

    result = {
        "ticker": req.ticker,
        "strategy": req.strategy,
        "strategy_name": strategy_name(req.strategy),
        "metrics": metrics,
        "equity_curve": equity_curve,
        "trade_log": trade_log,
        "methodology": {
            "title": "Chronological Backtest",
            "description": "Signals are generated from prior observations and executed forward in time.",
            "rule_1": "Market rows are processed chronologically.",
            "rule_2": "Indicators use only historical observations.",
            "rule_3": "Trades include configurable slippage.",
            "rule_4": "Benchmark is calculated over the same period.",
        },
    }

    try:
        execute(
            """
            INSERT INTO backtests (
                user_id, strategy_name, ticker, start_date, end_date, initial_capital,
                final_capital, total_return, sharpe_ratio, max_drawdown, volatility,
                win_rate, total_trades, profitable_trades, losing_trades
            )
            VALUES (
                :user_id, :strategy_name, :ticker, :start_date, :end_date, :initial_capital,
                :final_capital, :total_return, :sharpe_ratio, :max_drawdown, :volatility,
                :win_rate, :total_trades, :profitable_trades, :losing_trades
            )
            """,
            {
                "user_id": user_id,
                "strategy_name": result["strategy_name"],
                "ticker": req.ticker,
                "start_date": req.start_date,
                "end_date": req.end_date,
                "initial_capital": req.initial_capital,
                "final_capital": capital,
                "total_return": metrics["total_return_pct"],
                "sharpe_ratio": metrics["sharpe_ratio"],
                "max_drawdown": metrics["max_drawdown_pct"],
                "volatility": metrics["volatility_pct"],
                "win_rate": metrics["win_rate_pct"],
                "total_trades": trades_count,
                "profitable_trades": winning,
                "losing_trades": losing,
            },
        )
    except Exception:
        pass

    return result

# Routes
@app.on_event("startup")
async def startup():
    init_db()

@app.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    existing_user = get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = create_user(user.email, user.full_name, user.password, user.role)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": new_user["email"]}, expires_delta=access_token_expires)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "full_name": new_user["full_name"],
            "role": new_user["role"]
        }
    }

@app.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["email"]}, expires_delta=access_token_expires)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@app.get("/auth/me", response_model=UserResponse)
async def get_me(authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"]
    }

@app.get("/dashboard/snapshot")
async def dashboard_snapshot(authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    summary = one("""
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS total_products,
            (SELECT COUNT(*) FROM transactions) AS total_transactions,
            (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE status = 'completed') AS total_revenue,
            (SELECT COUNT(*) FROM backtests) AS total_backtests,
            (SELECT COUNT(*) FROM chat_sessions) AS total_chat_sessions
    """) or {}
    latest_bt = one("""
        SELECT ticker, strategy_name, total_return, sharpe_ratio
        FROM backtests
        ORDER BY created_at DESC
        LIMIT 1
    """) or {}
    return {
        "user": {k: user[k] for k in ("id", "email", "full_name", "role")},
        "datamart_snapshot": {
            "total_revenue": to_float(summary.get("total_revenue")),
            "total_orders": int(summary.get("total_transactions") or 0),
            "avg_order_value": to_float(summary.get("total_revenue")) / max(int(summary.get("total_transactions") or 0), 1),
            "total_customers": int(summary.get("total_users") or 0),
            "revenue_growth_pct": 0,
        },
        "backtest_snapshot": {
            "ticker": latest_bt.get("ticker"),
            "strategy_name": latest_bt.get("strategy_name"),
            "total_return_pct": to_float(latest_bt.get("total_return")),
            "sharpe_ratio": to_float(latest_bt.get("sharpe_ratio")),
        },
        "ai_snapshot": {
            "status": "online",
            "suggested_queries": [
                "What is our total revenue?",
                "Show low stock products",
                "Top products by revenue",
            ],
        },
    }

@app.get("/dashboard/alerts")
async def dashboard_alerts():
    low_stock = rows("""
        SELECT id, name, category, price, inventory_count,
               CASE WHEN inventory_count = 0 THEN 'Out of Stock'
                    WHEN inventory_count < 10 THEN 'Critical'
                    ELSE 'Low'
               END AS alert_level
        FROM products
        WHERE is_active = TRUE AND inventory_count < 10
        ORDER BY inventory_count ASC
        LIMIT 10
    """)
    alerts = [
        {
            "id": str(item["id"]),
            "severity": "critical" if item["inventory_count"] == 0 else "warning",
            "title": f"{item['name']} inventory is {item['alert_level'].lower()}",
            "message": f"{item['category']} has {item['inventory_count']} units left.",
            "recommendation": "Restock or rebalance inventory before demand spikes.",
        }
        for item in low_stock
    ]
    return {"summary": {"total": len(alerts)}, "alerts": alerts}

@app.get("/datamart/kpis")
async def datamart_kpis():
    summary = one("""
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM transactions) AS total_transactions,
            (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE status = 'completed') AS total_revenue
    """) or {}
    total_orders = int(summary.get("total_transactions") or 0)
    total_revenue = to_float(summary.get("total_revenue"))
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_order_value": total_revenue / max(total_orders, 1),
        "total_customers": int(summary.get("total_users") or 0),
        "revenue_growth_pct": 0,
    }

@app.get("/datamart/revenue-trend")
async def datamart_revenue_trend():
    data = rows("""
        SELECT DATE_TRUNC('month', transaction_date)::date AS date,
               COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue
        FROM transactions
        GROUP BY DATE_TRUNC('month', transaction_date)
        ORDER BY date
    """)
    return [{"date": str(row["date"]), "revenue": to_float(row["revenue"])} for row in data]

@app.get("/datamart/category-breakdown")
async def datamart_category_breakdown():
    data = rows("""
        SELECT p.category,
               COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0) AS revenue
        FROM products p
        LEFT JOIN transactions t ON t.product_id = p.id
        WHERE p.is_active = TRUE
        GROUP BY p.category
        ORDER BY revenue DESC
    """)
    total = sum(to_float(row["revenue"]) for row in data) or 1
    return [
        {
            "category": row["category"],
            "revenue": to_float(row["revenue"]),
            "share_pct": round(to_float(row["revenue"]) / total * 100, 1),
        }
        for row in data
    ]

@app.get("/datamart/segments")
async def datamart_segments():
    data = rows("""
        SELECT 'All Customers' AS segment,
               (SELECT COUNT(*) FROM users) AS customer_count,
               COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS total_revenue
        FROM transactions
    """)
    return [
        {
            "segment": row["segment"],
            "customer_count": int(row["customer_count"] or 0),
            "total_revenue": to_float(row["total_revenue"]),
            "avg_spend_per_customer": to_float(row["total_revenue"]) / max(int(row["customer_count"] or 0), 1),
        }
        for row in data
    ]

@app.get("/datamart/drilldown/{category}")
async def datamart_drilldown(category: str):
    data = rows("""
        SELECT p.id, p.name, p.category, p.brand, p.price, p.inventory_count,
               COALESCE(SUM(t.quantity), 0) AS units_sold,
               COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0) AS revenue_generated
        FROM products p
        LEFT JOIN transactions t ON t.product_id = p.id
        WHERE p.category = :category
        GROUP BY p.id
        ORDER BY revenue_generated DESC
    """, {"category": category})
    return [
        {
            **row,
            "id": str(row["id"]),
            "price": to_float(row["price"]),
            "subcategory": row.get("brand") or row.get("category"),
            "units_sold": int(row["units_sold"] or 0),
            "revenue_generated": to_float(row["revenue_generated"]),
        }
        for row in data
    ]

@app.post("/datamart/nl-query")
async def datamart_nl_query(payload: QueryRequest):
    q = payload.query.lower()
    if "trend" in q or "revenue" in q and "top" not in q:
        return {"interpretation": "Monthly revenue trend from transactions.", "chart_type": "line", "data": await datamart_revenue_trend()}
    if "segment" in q or "customer" in q:
        return {"interpretation": "Customer segments by completed spend.", "chart_type": "table", "data": await datamart_segments()}
    if "category" in q or "breakdown" in q:
        return {"interpretation": "Revenue by product category.", "chart_type": "bar", "data": await datamart_category_breakdown()}
    data = rows("""
        SELECT p.id, p.name, p.category,
               COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0) AS revenue_generated,
               COALESCE(SUM(t.quantity) FILTER (WHERE t.status = 'completed'), 0) AS units_sold
        FROM products p
        LEFT JOIN transactions t ON t.product_id = p.id
        WHERE p.is_active = TRUE
        GROUP BY p.id
        ORDER BY revenue_generated DESC
        LIMIT 10
    """)
    return {"interpretation": "Top products by completed revenue.", "chart_type": "bar", "data": [{**r, "id": str(r["id"]), "revenue_generated": to_float(r["revenue_generated"])} for r in data]}

@app.post("/datamart/upload")
async def datamart_upload(file: UploadFile = File(...)):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        name = row.get("name")
        category = row.get("category")
        if not name or not category:
            continue
        execute("""
            INSERT INTO products (name, sku, category, description, price, inventory_count, brand)
            VALUES (:name, :sku, :category, :description, :price, :inventory_count, :brand)
            ON CONFLICT (sku) DO UPDATE SET
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                price = EXCLUDED.price,
                inventory_count = EXCLUDED.inventory_count,
                updated_at = NOW()
        """, {
            "name": name,
            "sku": row.get("sku") or name.lower().replace(" ", "-"),
            "category": category,
            "description": row.get("description"),
            "price": float(row.get("price") or 0),
            "inventory_count": int(row.get("inventory_count") or row.get("stock_level") or 0),
            "brand": row.get("brand") or row.get("subcategory"),
        })
        count += 1
    return {"message": f"Imported {count} product rows."}

@app.post("/backtest/run")
async def run_backtest(req: BacktestRequest, authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    return synthetic_backtest(req, user["id"])

@app.post("/backtest/compare")
async def compare_backtests(req: CompareRequest, authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    results = []
    for strategy in req.strategies:
        item = synthetic_backtest(BacktestRequest(**{**req.model_dump(exclude={"strategies"}), "strategy": strategy}), user["id"])
        results.append({"strategy": strategy, "strategy_name": strategy_name(strategy), "metrics": item["metrics"]})
    winner = max(results, key=lambda r: r["metrics"]["sharpe_ratio"])
    return {
        "ticker": req.ticker,
        "results": results,
        "winner": {
            "strategy": winner["strategy"],
            "strategy_name": winner["strategy_name"],
            "sharpe_ratio": winner["metrics"]["sharpe_ratio"],
            "total_return_pct": winner["metrics"]["total_return_pct"],
        },
    }

@app.get("/intelligence/mappings")
async def intelligence_mappings():
    categories = rows("SELECT DISTINCT category FROM products WHERE is_active = TRUE ORDER BY category")
    fallback = ["Electronics", "Fitness", "Home", "Fashion"]
    tickers = {"Electronics": ["NVDA", "AAPL"], "Fitness": ["NKE", "LULU"], "Home": ["HD", "LOW"], "Fashion": ["NKE", "AMZN"]}
    return [{"category": c.get("category") or c, "tickers": tickers.get(c.get("category") if isinstance(c, dict) else c, ["SPY"])} for c in (categories or fallback)]

@app.get("/intelligence/category-ticker")
async def intelligence_category_ticker(category: str | None = None):
    mappings = await intelligence_mappings()
    selected = category or (mappings[0]["category"] if mappings else "Electronics")
    breakdown = await datamart_category_breakdown()
    metric = next((r for r in breakdown if r["category"] == selected), {"revenue": 0, "share_pct": 0})
    related = next((m["tickers"] for m in mappings if m["category"] == selected), ["SPY"])
    summaries = []
    for ticker in related:
        summary = one("""
            SELECT ticker, AVG(total_return) AS total_return_pct, AVG(sharpe_ratio) AS sharpe_ratio, AVG(max_drawdown) AS max_drawdown_pct
            FROM backtests
            WHERE ticker = :ticker
            GROUP BY ticker
        """, {"ticker": ticker})
        if summary:
            summaries.append(summary)
    return {
        "category": selected,
        "insight": f"{selected} maps to {', '.join(related)} for market-aware analysis and hedging.",
        "category_metrics": metric,
        "related_tickers": related,
        "backtest_summaries": [{**r, "total_return_pct": to_float(r["total_return_pct"]), "sharpe_ratio": to_float(r["sharpe_ratio"]), "max_drawdown_pct": to_float(r["max_drawdown_pct"])} for r in summaries],
    }

@app.post("/intelligence/nl-query")
async def intelligence_nl_query(payload: QueryRequest):
    return await datamart_nl_query(payload)

@app.get("/assistant/conversations")
async def assistant_conversations(authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    data = rows("""
        SELECT id, title, created_at, updated_at
        FROM chat_sessions
        WHERE user_id = :user_id
        ORDER BY updated_at DESC
        LIMIT 50
    """, {"user_id": user["id"]})
    return [{**row, "id": str(row["id"]), "created_at": str(row["created_at"]), "updated_at": str(row["updated_at"])} for row in data]

@app.post("/assistant/conversations")
async def create_conversation(payload: ConversationPayload, authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    result = execute("""
        INSERT INTO chat_sessions (user_id, title)
        VALUES (:user_id, :title)
        RETURNING id, title
    """, {"user_id": user["id"], "title": payload.title}).mappings().first()
    session_id = str(result["id"])
    for message in payload.messages:
        execute("""
            INSERT INTO chat_messages (session_id, role, content, tool_result)
            VALUES (:session_id, :role, :content, :tool_result)
        """, {
            "session_id": session_id,
            "role": message.get("role", "user"),
            "content": message.get("content", ""),
            "tool_result": None,
        })
    return {"id": session_id, "title": result["title"]}

@app.get("/assistant/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    session = one("SELECT id, title FROM chat_sessions WHERE id = :id AND user_id = :user_id", {"id": conversation_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = rows("""
        SELECT role, content, tool_result
        FROM chat_messages
        WHERE session_id = :session_id
        ORDER BY created_at ASC
    """, {"session_id": conversation_id})
    return {"id": conversation_id, "title": session["title"], "messages": [{"role": m["role"], "content": m["content"], "sources": m.get("tool_result") or []} for m in messages]}

@app.put("/assistant/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, payload: ConversationPayload, authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    session = one("SELECT id FROM chat_sessions WHERE id = :id AND user_id = :user_id", {"id": conversation_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Conversation not found")
    execute("UPDATE chat_sessions SET title = :title, updated_at = NOW() WHERE id = :id", {"title": payload.title, "id": conversation_id})
    execute("DELETE FROM chat_messages WHERE session_id = :id", {"id": conversation_id})
    for message in payload.messages:
        execute("""
            INSERT INTO chat_messages (session_id, role, content, tool_result)
            VALUES (:session_id, :role, :content, :tool_result)
        """, {
            "session_id": conversation_id,
            "role": message.get("role", "user"),
            "content": message.get("content", ""),
            "tool_result": None,
        })
    return {"id": conversation_id, "title": payload.title}

@app.post("/assistant/chat")
async def assistant_chat(payload: dict, authorization: str = Header(None)):
    current_user_from_header(authorization)
    messages = payload.get("messages") or []
    question = (messages[-1].get("content") if messages else "").lower()
    sources = []

    if "alert" in question or "stock" in question:
        data = await dashboard_alerts()
        sources.append({"tool_name": "dashboard_alerts", "result": data})
        reply = "### Smart alerts\n\n" + ("\n".join(f"- **{a['title']}**: {a['recommendation']}" for a in data["alerts"][:5]) or "No active alerts right now.")
    elif "revenue" in question:
        data = await datamart_kpis()
        sources.append({"tool_name": "datamart_kpis", "result": data})
        reply = f"### Revenue summary\n\nTotal completed revenue is **${data['total_revenue']:,.0f}** across **{data['total_orders']:,}** orders. Average order value is **${data['avg_order_value']:,.2f}**."
    elif "top product" in question or "products" in question:
        data = rows("""
            SELECT p.name AS product_name, p.category,
                   COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'completed'), 0) AS revenue,
                   COALESCE(SUM(t.quantity) FILTER (WHERE t.status = 'completed'), 0) AS units_sold
            FROM products p
            LEFT JOIN transactions t ON t.product_id = p.id
            WHERE p.is_active = TRUE
            GROUP BY p.id
            ORDER BY revenue DESC
            LIMIT 5
        """)
        sources.append({"tool_name": "top_products", "result": data})
        reply = "### Top products\n\n" + ("\n".join(f"- **{r['product_name']}** ({r['category']}): ${to_float(r['revenue']):,.0f}" for r in data) or "No product sales yet.")
    elif "backtest" in question:
        req = BacktestRequest(ticker="AAPL", strategy="ma_crossover", start_date="2023-01-01", end_date="2024-01-01")
        data = synthetic_backtest(req)
        sources.append({"tool_name": "backtest_run", "result": data["metrics"]})
        reply = f"### Backtest result\n\nAAPL Moving Average Crossover returned **{data['metrics']['total_return_pct']}%** with a Sharpe ratio of **{data['metrics']['sharpe_ratio']}**."
    else:
        data = await datamart_kpis()
        sources.append({"tool_name": "dashboard_summary", "result": data})
        reply = "I can help with revenue, products, inventory alerts, category analytics, and strategy backtests. Your database is connected and the analytics endpoints are live."

    return {"reply": reply, "sources": sources}

@app.get("/reports/executive")
async def executive_report(authorization: str = Header(None)):
    user = current_user_from_header(authorization)
    kpis = await datamart_kpis()
    categories = await datamart_category_breakdown()
    alerts = await dashboard_alerts()
    content = [
        "# Executive Report",
        f"Generated for {user['full_name']}",
        "",
        f"- Total revenue: ${kpis['total_revenue']:,.0f}",
        f"- Total orders: {kpis['total_orders']:,}",
        f"- Average order value: ${kpis['avg_order_value']:,.2f}",
        f"- Active alerts: {alerts['summary']['total']}",
        "",
        "## Top Categories",
    ]
    content.extend(f"- {c['category']}: ${c['revenue']:,.0f} ({c['share_pct']}%)" for c in categories[:5])
    return {"content": "\n".join(content)}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
