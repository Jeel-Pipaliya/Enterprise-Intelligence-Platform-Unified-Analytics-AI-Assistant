-- Migration: Create backtests table
CREATE TABLE IF NOT EXISTS public.backtests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    strategy_name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    initial_capital NUMERIC(15, 2) NOT NULL,
    total_return NUMERIC(10, 4),
    sharpe_ratio NUMERIC(10, 4),
    max_drawdown NUMERIC(10, 4),
    parameters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
