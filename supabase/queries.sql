-- ============================================================
-- ENTERPRISE INTELLIGENCE PLATFORM
-- ONLINE SUPABASE DATABASE MIGRATION
-- ============================================================
--
-- IMPORTANT:
-- Existing public.users table is preserved.
--
-- Existing users:
-- 1 | admin@example.com
-- 2 | analyst@example.com
-- 3 | customer@example.com
--
-- Current backend authentication uses:
--
--     public.users
--
-- Therefore application foreign keys use:
--
--     public.users(id)
--
-- NOT auth.users.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. VERIFY EXISTING USERS TABLE
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
    ) THEN

        RAISE EXCEPTION
        'public.users does not exist. Migration stopped to prevent creating an incompatible users table.';

    END IF;

END $$;


-- ============================================================
-- 2. INDEXES FOR EXISTING USERS TABLE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_users_role
ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_users_created_at
ON public.users(created_at DESC);


-- ============================================================
-- 3. PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    sku TEXT UNIQUE NOT NULL,

    category TEXT NOT NULL,

    description TEXT,

    price NUMERIC(15,2) NOT NULL DEFAULT 0
        CHECK (price >= 0),

    inventory_count INTEGER NOT NULL DEFAULT 0
        CHECK (inventory_count >= 0),

    brand TEXT,

    image_url TEXT,

    specifications JSONB NOT NULL DEFAULT '{}'::JSONB,

    tags TEXT[] NOT NULL DEFAULT '{}',

    rating NUMERIC(3,2)
        CHECK (
            rating IS NULL
            OR (
                rating >= 0
                AND rating <= 5
            )
        ),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 4. TRANSACTIONS / DATAMART FACT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transactions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE RESTRICT,

    customer_id INTEGER
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    unit_price NUMERIC(15,2) NOT NULL
        CHECK (unit_price >= 0),

    total_amount NUMERIC(15,2) NOT NULL
        CHECK (total_amount >= 0),

    region TEXT,

    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    payment_method TEXT,

    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (
            status IN (
                'pending',
                'completed',
                'cancelled',
                'refunded'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 5. MARKET DATA
-- ============================================================
-- OHLCV historical market data used by the backtesting engine.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.market_data (

    id BIGSERIAL PRIMARY KEY,

    ticker TEXT NOT NULL,

    timestamp TIMESTAMPTZ NOT NULL,

    open NUMERIC(20,8) NOT NULL,

    high NUMERIC(20,8) NOT NULL,

    low NUMERIC(20,8) NOT NULL,

    close NUMERIC(20,8) NOT NULL,

    volume NUMERIC(30,8) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT market_data_ohlc_valid
    CHECK (
        high >= low
        AND high >= open
        AND high >= close
        AND low <= open
        AND low <= close
    ),

    CONSTRAINT unique_market_data_point
    UNIQUE (ticker, timestamp)

);


-- ============================================================
-- 6. BACKTESTS
-- ============================================================
-- One record per strategy execution.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.backtests (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id INTEGER
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    strategy_name TEXT NOT NULL,

    ticker TEXT NOT NULL,

    start_date TIMESTAMPTZ NOT NULL,

    end_date TIMESTAMPTZ NOT NULL,

    initial_capital NUMERIC(20,2) NOT NULL
        CHECK (initial_capital > 0),

    final_capital NUMERIC(20,2),

    total_return NUMERIC(15,6),

    cagr NUMERIC(15,6),

    sharpe_ratio NUMERIC(15,6),

    max_drawdown NUMERIC(15,6),

    volatility NUMERIC(15,6),

    win_rate NUMERIC(15,6),

    total_trades INTEGER NOT NULL DEFAULT 0
        CHECK (total_trades >= 0),

    profitable_trades INTEGER NOT NULL DEFAULT 0
        CHECK (profitable_trades >= 0),

    losing_trades INTEGER NOT NULL DEFAULT 0
        CHECK (losing_trades >= 0),

    execution_time_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_backtest_dates
    CHECK (end_date > start_date)

);


-- ============================================================
-- 7. BACKTEST TRADES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trades (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    backtest_id UUID NOT NULL
        REFERENCES public.backtests(id)
        ON DELETE CASCADE,

    ticker TEXT NOT NULL,

    trade_type TEXT NOT NULL
        CHECK (
            trade_type IN ('BUY', 'SELL')
        ),

    quantity NUMERIC(20,8) NOT NULL
        CHECK (quantity > 0),

    price NUMERIC(20,8) NOT NULL
        CHECK (price >= 0),

    timestamp TIMESTAMPTZ NOT NULL,

    commission NUMERIC(20,8) NOT NULL DEFAULT 0
        CHECK (commission >= 0),

    pnl NUMERIC(20,8),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 8. CHAT SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id INTEGER NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL DEFAULT 'New Conversation',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 9. CHAT MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.chat_sessions(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (
            role IN (
                'user',
                'assistant',
                'system',
                'tool'
            )
        ),

    content TEXT NOT NULL,

    tool_name TEXT,

    tool_arguments JSONB,

    tool_result JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 10. SHOPPING CARTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.carts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id INTEGER NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'completed',
                'abandoned'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 11. CART ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cart_id UUID NOT NULL
        REFERENCES public.carts(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE RESTRICT,

    quantity INTEGER NOT NULL DEFAULT 1
        CHECK (quantity > 0),

    unit_price NUMERIC(15,2) NOT NULL
        CHECK (unit_price >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_cart_product
    UNIQUE(cart_id, product_id)

);


-- ============================================================
-- 12. KNOWLEDGE DOCUMENTS
-- ============================================================
-- Used by the AI assistant / RAG layer.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_documents (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    content TEXT NOT NULL,

    document_type TEXT,

    source TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ============================================================
-- 13. INDEXES - PRODUCTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_category
ON public.products(category);

CREATE INDEX IF NOT EXISTS idx_products_brand
ON public.products(brand);

CREATE INDEX IF NOT EXISTS idx_products_price
ON public.products(price);

CREATE INDEX IF NOT EXISTS idx_products_inventory
ON public.products(inventory_count);

CREATE INDEX IF NOT EXISTS idx_products_active
ON public.products(is_active);


-- ============================================================
-- 14. INDEXES - TRANSACTIONS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_product_id
ON public.transactions(product_id);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id
ON public.transactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date
ON public.transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_region
ON public.transactions(region);

CREATE INDEX IF NOT EXISTS idx_transactions_status
ON public.transactions(status);


-- ============================================================
-- 15. INDEXES - MARKET DATA
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_market_data_ticker_timestamp
ON public.market_data(ticker, timestamp);

CREATE INDEX IF NOT EXISTS idx_market_data_timestamp
ON public.market_data(timestamp DESC);


-- ============================================================
-- 16. INDEXES - BACKTESTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_backtests_user_id
ON public.backtests(user_id);

CREATE INDEX IF NOT EXISTS idx_backtests_strategy
ON public.backtests(strategy_name);

CREATE INDEX IF NOT EXISTS idx_backtests_ticker
ON public.backtests(ticker);

CREATE INDEX IF NOT EXISTS idx_backtests_sharpe
ON public.backtests(sharpe_ratio DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_backtests_created_at
ON public.backtests(created_at DESC);


-- ============================================================
-- 17. INDEXES - TRADES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trades_backtest_id
ON public.trades(backtest_id);

CREATE INDEX IF NOT EXISTS idx_trades_timestamp
ON public.trades(timestamp DESC);


-- ============================================================
-- 18. INDEXES - CHAT
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
ON public.chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at
ON public.chat_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
ON public.chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
ON public.chat_messages(created_at DESC);


-- ============================================================
-- 19. INDEXES - CART
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_carts_user_id
ON public.carts(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
ON public.cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
ON public.cart_items(product_id);


-- ============================================================
-- 20. INDEXES - KNOWLEDGE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type
ON public.knowledge_documents(document_type);


-- ============================================================
-- 21. UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;
$$;


-- ============================================================
-- 22. PRODUCT UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS products_updated_at
ON public.products;

CREATE TRIGGER products_updated_at

BEFORE UPDATE ON public.products

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 23. CHAT SESSION UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS chat_sessions_updated_at
ON public.chat_sessions;

CREATE TRIGGER chat_sessions_updated_at

BEFORE UPDATE ON public.chat_sessions

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 24. CART UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS carts_updated_at
ON public.carts;

CREATE TRIGGER carts_updated_at

BEFORE UPDATE ON public.carts

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 25. KNOWLEDGE DOCUMENT UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS knowledge_documents_updated_at
ON public.knowledge_documents;

CREATE TRIGGER knowledge_documents_updated_at

BEFORE UPDATE ON public.knowledge_documents

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 26. PRODUCT INVENTORY VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.product_inventory_status AS

SELECT

    p.id,

    p.name,

    p.sku,

    p.category,

    p.brand,

    p.price,

    p.inventory_count,

    CASE

        WHEN p.inventory_count = 0
            THEN 'Out of Stock'

        WHEN p.inventory_count < 10
            THEN 'Low Stock'

        WHEN p.inventory_count < 50
            THEN 'Medium Stock'

        ELSE 'Good Stock'

    END AS stock_status,

    (
        p.price * p.inventory_count
    )::NUMERIC(15,2) AS inventory_value

FROM public.products p

WHERE p.is_active = TRUE;


-- ============================================================
-- 27. SALES BY PRODUCT VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.sales_by_product AS

SELECT

    p.id AS product_id,

    p.name AS product_name,

    p.category,

    p.brand,

    COUNT(t.id) AS transaction_count,

    COALESCE(
        SUM(t.quantity),
        0
    ) AS units_sold,

    COALESCE(
        SUM(t.total_amount)
        FILTER (
            WHERE t.status = 'completed'
        ),
        0
    )::NUMERIC(15,2) AS revenue

FROM public.products p

LEFT JOIN public.transactions t

    ON t.product_id = p.id

GROUP BY

    p.id,
    p.name,
    p.category,
    p.brand;


-- ============================================================
-- 28. MONTHLY SALES VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.monthly_sales AS

SELECT

    DATE_TRUNC(
        'month',
        transaction_date
    ) AS month,

    COUNT(*) AS transaction_count,

    COALESCE(
        SUM(quantity),
        0
    ) AS units_sold,

    COALESCE(
        SUM(total_amount)
        FILTER (
            WHERE status = 'completed'
        ),
        0
    )::NUMERIC(15,2) AS revenue

FROM public.transactions

GROUP BY

    DATE_TRUNC(
        'month',
        transaction_date
    )

ORDER BY month;


-- ============================================================
-- 29. REGIONAL SALES VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.regional_sales AS

SELECT

    COALESCE(
        region,
        'Unknown'
    ) AS region,

    COUNT(*) AS transaction_count,

    COALESCE(
        SUM(quantity),
        0
    ) AS units_sold,

    COALESCE(
        SUM(total_amount)
        FILTER (
            WHERE status = 'completed'
        ),
        0
    )::NUMERIC(15,2) AS revenue

FROM public.transactions

GROUP BY region

ORDER BY revenue DESC;


-- ============================================================
-- 30. DASHBOARD SUMMARY VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.dashboard_summary AS

SELECT

    (
        SELECT COUNT(*)
        FROM public.users
    ) AS total_users,

    (
        SELECT COUNT(*)
        FROM public.products
        WHERE is_active = TRUE
    ) AS total_products,

    (
        SELECT COALESCE(
            SUM(inventory_count),
            0
        )
        FROM public.products
        WHERE is_active = TRUE
    ) AS total_inventory,

    (
        SELECT COUNT(*)
        FROM public.transactions
    ) AS total_transactions,

    (
        SELECT COALESCE(
            SUM(total_amount),
            0
        )
        FROM public.transactions
        WHERE status = 'completed'
    ) AS total_revenue,

    (
        SELECT COUNT(*)
        FROM public.backtests
    ) AS total_backtests,

    (
        SELECT COUNT(*)
        FROM public.chat_sessions
    ) AS total_chat_sessions,

    (
        SELECT COUNT(*)
        FROM public.users
        WHERE created_at >= NOW() - INTERVAL '30 days'
    ) AS new_users_30d,

    (
        SELECT COUNT(*)
        FROM public.transactions
        WHERE transaction_date >= NOW() - INTERVAL '30 days'
    ) AS transactions_30d,

    (
        SELECT COALESCE(
            SUM(total_amount),
            0
        )
        FROM public.transactions
        WHERE transaction_date >= NOW() - INTERVAL '30 days'
        AND status = 'completed'
    ) AS revenue_30d;


-- ============================================================
-- 31. BACKTEST PERFORMANCE VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.backtest_performance AS

SELECT

    b.id,

    b.user_id,

    u.email AS user_email,

    u.full_name AS user_name,

    b.strategy_name,

    b.ticker,

    b.start_date,

    b.end_date,

    b.initial_capital,

    b.final_capital,

    b.total_return,

    b.cagr,

    b.sharpe_ratio,

    b.max_drawdown,

    b.volatility,

    b.win_rate,

    b.total_trades,

    b.profitable_trades,

    b.losing_trades,

    b.execution_time_ms,

    b.created_at

FROM public.backtests b

LEFT JOIN public.users u

    ON u.id = b.user_id;


-- ============================================================
-- 32. CHAT ANALYTICS VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.chat_analytics AS

SELECT

    cs.id AS session_id,

    cs.user_id,

    u.email AS user_email,

    cs.title,

    COUNT(cm.id) AS message_count,

    COUNT(cm.id)
        FILTER (
            WHERE cm.role = 'user'
        ) AS user_messages,

    COUNT(cm.id)
        FILTER (
            WHERE cm.role = 'assistant'
        ) AS assistant_messages,

    MIN(cm.created_at) AS first_message_at,

    MAX(cm.created_at) AS last_message_at,

    cs.created_at AS session_created_at

FROM public.chat_sessions cs

LEFT JOIN public.users u

    ON u.id = cs.user_id

LEFT JOIN public.chat_messages cm

    ON cm.session_id = cs.id

GROUP BY

    cs.id,

    cs.user_id,

    u.email,

    cs.title,

    cs.created_at;


-- ============================================================
-- 33. LOW STOCK VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.low_stock_products AS

SELECT

    id,

    name,

    sku,

    category,

    brand,

    price,

    inventory_count,

    CASE

        WHEN inventory_count = 0
            THEN 'Out of Stock'

        WHEN inventory_count < 10
            THEN 'Critical'

        ELSE 'Low'

    END AS alert_level

FROM public.products

WHERE is_active = TRUE

AND inventory_count < 10

ORDER BY inventory_count ASC;


-- ============================================================
-- 34. TOP PRODUCTS VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.top_products AS

SELECT

    p.id,

    p.name,

    p.category,

    p.brand,

    COALESCE(
        SUM(t.quantity)
        FILTER (
            WHERE t.status = 'completed'
        ),
        0
    ) AS units_sold,

    COALESCE(
        SUM(t.total_amount)
        FILTER (
            WHERE t.status = 'completed'
        ),
        0
    )::NUMERIC(15,2) AS revenue

FROM public.products p

LEFT JOIN public.transactions t

    ON t.product_id = p.id

GROUP BY

    p.id,

    p.name,

    p.category,

    p.brand

ORDER BY revenue DESC;


-- ============================================================
-- 35. DATA QUALITY VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.data_quality_summary AS

SELECT

    (
        SELECT COUNT(*)
        FROM public.products
    ) AS total_products,

    (
        SELECT COUNT(*)
        FROM public.transactions
    ) AS total_transactions,

    (
        SELECT COUNT(*)
        FROM public.market_data
    ) AS total_market_data_rows,

    (
        SELECT COUNT(*)
        FROM public.backtests
    ) AS total_backtests,

    (
        SELECT COUNT(*)
        FROM public.trades
    ) AS total_trades,

    (
        SELECT COUNT(*)
        FROM public.chat_sessions
    ) AS total_chat_sessions,

    (
        SELECT COUNT(*)
        FROM public.chat_messages
    ) AS total_chat_messages,

    (
        SELECT COUNT(*)
        FROM public.products
        WHERE inventory_count < 10
    ) AS low_stock_products,

    (
        SELECT COUNT(*)
        FROM public.products p
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.product_id = p.id
        )
    ) AS products_without_sales;


-- ============================================================
-- 36. VERIFY EXISTING USERS
-- ============================================================

SELECT

    id,

    email,

    full_name,

    role,

    created_at

FROM public.users

ORDER BY id;


SELECT

    table_name

FROM information_schema.tables

WHERE table_schema = 'public'

AND table_name IN (

    'users',

    'products',

    'transactions',

    'market_data',

    'backtests',

    'trades',

    'chat_sessions',

    'chat_messages',

    'carts',

    'cart_items',

    'knowledge_documents'

)

ORDER BY table_name;



COMMIT;