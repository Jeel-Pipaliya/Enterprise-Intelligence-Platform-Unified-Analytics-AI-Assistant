# Enterprise Intelligence Platform

This project is a unified Enterprise Intelligence Platform built as a modular monolith. It includes three integrated modules:
1. **Backtesting Module**: Chronological backtesting engine preventing look-ahead bias.
2. **DataMart Analytics Module**: Business intelligence analytics module powered by Supabase.
3. **Retail AI Assistant**: AI Chat agent with functional RAG, comparison, recommendations, and cart tools.

## Default Demo Credentials

These accounts are created automatically when the backend starts (`backend/main.py`). Use them for local development and demos only — change passwords before any production deployment.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `admin123` |
| Analyst | `analyst@example.com` | `analyst123` |
| Customer | `customer@example.com` | `customer123` |

The login page includes quick-fill buttons for each role and displays the same credentials.

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

## Deploy Online (Render + Supabase)

This repository includes a `render.yaml` blueprint so you can deploy both backend and frontend from Git in one flow.

### 1) Push this repository to GitHub

Render deploys from a Git repository, so make sure your latest code is pushed.

### 2) Create services in Render using Blueprint

1. In Render, click **New +** -> **Blueprint**.
2. Select this repository.
3. Render will detect `render.yaml` and create:
	- `enterprise-intelligence-backend` (Web Service)
	- `enterprise-intelligence-frontend` (Static Site)

### 3) Set backend environment variables

In Render service `enterprise-intelligence-backend`, set:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/postgres
SECRET_KEY=<long-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440

OPENROUTER_API_KEY=<your-openrouter-key>
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it
OPENROUTER_MAX_TOKENS=900
OPENROUTER_SITE_URL=https://<your-frontend-domain>
OPENROUTER_APP_TITLE=Enterprise Intelligence Platform

CORS_ORIGINS=https://<your-frontend-domain>
```

Notes:
- `DATABASE_URL` should point to your Supabase PostgreSQL connection string.
- Keep `SECRET_KEY` private and strong in production.

### 4) Set frontend environment variables

In Render service `enterprise-intelligence-frontend`, set:

```env
VITE_API_URL=https://<your-backend-domain>
```

After deploy, your app will be available at your Render static site URL.

### 5) Quick verification

1. Open `https://<your-backend-domain>/docs` and confirm it loads.
2. Open frontend URL and log in with demo credentials.
3. Test one dashboard call and one assistant message.
