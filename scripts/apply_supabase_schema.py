import os
import pathlib

import psycopg


ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


def load_env() -> None:
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def main() -> None:
    load_env()
    sql = """
    CREATE TABLE IF NOT EXISTS public.products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
        inventory_count INTEGER NOT NULL DEFAULT 0 CHECK (inventory_count >= 0),
        brand TEXT,
        image_url TEXT,
        specifications JSONB NOT NULL DEFAULT '{}'::JSONB,
        tags TEXT[] NOT NULL DEFAULT '{}',
        rating NUMERIC(3,2),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
        customer_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
        total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
        region TEXT,
        transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payment_method TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

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
        UNIQUE (ticker, timestamp)
    );

    CREATE TABLE IF NOT EXISTS public.backtests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
        strategy_name TEXT NOT NULL,
        ticker TEXT NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        initial_capital NUMERIC(20,2) NOT NULL CHECK (initial_capital > 0),
        final_capital NUMERIC(20,2),
        total_return NUMERIC(15,6),
        cagr NUMERIC(15,6),
        sharpe_ratio NUMERIC(15,6),
        max_drawdown NUMERIC(15,6),
        volatility NUMERIC(15,6),
        win_rate NUMERIC(15,6),
        total_trades INTEGER NOT NULL DEFAULT 0,
        profitable_trades INTEGER NOT NULL DEFAULT 0,
        losing_trades INTEGER NOT NULL DEFAULT 0,
        execution_time_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        backtest_id UUID REFERENCES public.backtests(id) ON DELETE CASCADE,
        ticker TEXT NOT NULL,
        trade_type TEXT NOT NULL,
        quantity NUMERIC(20,8) NOT NULL,
        price NUMERIC(20,8) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        commission NUMERIC(20,8) NOT NULL DEFAULT 0,
        pnl NUMERIC(20,8),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Conversation',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_name TEXT,
        tool_arguments JSONB,
        tool_result JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
        product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(15,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(cart_id, product_id)
    );

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

    ALTER TABLE IF EXISTS public.backtests
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL;
    ALTER TABLE IF EXISTS public.chat_sessions
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE IF EXISTS public.carts
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE IF EXISTS public.transactions
        ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL;

    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'backtests' AND column_name = 'profile_id') THEN
            ALTER TABLE public.backtests ALTER COLUMN profile_id DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_sessions' AND column_name = 'profile_id') THEN
            ALTER TABLE public.chat_sessions ALTER COLUMN profile_id DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'profile_id') THEN
            ALTER TABLE public.carts ALTER COLUMN profile_id DROP NOT NULL;
        END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
    CREATE INDEX IF NOT EXISTS idx_backtests_user_id ON public.backtests(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
    """

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute(sql)
        conn.commit()

    print("safe schema compatibility applied")


if __name__ == "__main__":
    main()
