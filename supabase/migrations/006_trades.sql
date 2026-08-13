-- Migration: Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backtest_id UUID REFERENCES public.backtests(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    action TEXT NOT NULL, -- BUY/SELL
    quantity NUMERIC(15, 4) NOT NULL,
    price NUMERIC(15, 4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    pnl NUMERIC(15, 4) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
