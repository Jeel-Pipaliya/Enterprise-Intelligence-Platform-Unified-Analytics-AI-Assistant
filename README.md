# Enterprise Intelligence Platform

This project is a unified Enterprise Intelligence Platform built as a modular monolith. It includes three integrated modules:
1. **Backtesting Module**: Chronological backtesting engine preventing look-ahead bias.
2. **DataMart Analytics Module**: Business intelligence analytics module powered by Supabase.
3. **Retail AI Assistant**: AI Chat agent with functional RAG, comparison, recommendations, and cart tools.

## Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Python, FastAPI, Pydantic, SQLAlchemy
- **Database / Auth / Storage**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenRouter chat completions with function calling, PostgreSQL-grounded tools, and local fallback responses

## OpenRouter Assistant Setup

Set these values in `.env`:

```env
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=~openai/gpt-latest
OPENROUTER_MAX_TOKENS=900
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_TITLE=Enterprise Intelligence Platform
```

The React chat UI posts to `POST /api/assistant/chat`. FastAPI sends the conversation to OpenRouter, executes approved local tools against Supabase/PostgreSQL when the model requests data, then sends the tool results back to OpenRouter for the final answer.
