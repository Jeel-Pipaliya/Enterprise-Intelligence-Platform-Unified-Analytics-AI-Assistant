-- Migration: Create market_data table
CREATE TABLE IF NOT EXISTS public.market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open NUMERIC(10, 4) NOT NULL,
    high NUMERIC(10, 4) NOT NULL,
    low NUMERIC(10, 4) NOT NULL,
    close NUMERIC(10, 4) NOT NULL,
    volume BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (ticker, timestamp)
);
