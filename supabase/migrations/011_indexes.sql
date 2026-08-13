-- Migration: Create indexes
CREATE INDEX IF NOT EXISTS idx_market_data_ticker_timestamp ON public.market_data (ticker, timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_backtest_id ON public.trades (backtest_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON public.transactions (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages (session_id);
