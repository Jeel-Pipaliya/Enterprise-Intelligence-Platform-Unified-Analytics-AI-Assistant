# Deployment guide

This application deploys as two services:

- **Vercel** hosts the React frontend.
- **Render** hosts the FastAPI backend.
- **Supabase** provides the PostgreSQL database.

## 1. Prepare Supabase

1. Create a Supabase project, or use the existing one.
2. Run the SQL migrations in `supabase/migrations` in filename order, then run `supabase/seed.sql` if demo data is wanted.
3. Copy the project database connection string. Use its pooler connection string when deploying from Render, and include `?sslmode=require` if it is not already present.

## 2. Deploy the API on Render

1. In Render, select **New > Web Service** and connect this GitHub repository.
2. Set **Root Directory** to `backend` and select **Docker** as the runtime. Render will use `backend/Dockerfile`.
3. Add these environment variables:

   - `DATABASE_URL`: the Supabase PostgreSQL connection string
   - `SECRET_KEY`: a long, random secret used to sign login tokens
   - `OPENROUTER_API_KEY`: your OpenRouter key (optional; the assistant has fallback responses)
   - `OPENROUTER_MODEL`: `google/gemma-4-26b-a4b-it` (or your preferred model)
   - `OPENROUTER_SITE_URL`: your Vercel URL, after the frontend is deployed
   - `CORS_ORIGINS`: your Vercel URL, after the frontend is deployed

4. Deploy and confirm `https://<api-host>/health` returns `{"status":"ok"}`.

## 3. Deploy the frontend on Vercel

1. In Vercel, import the same GitHub repository.
2. Set **Root Directory** to `frontend`. Vercel detects Vite automatically; its build command is `npm run build` and output directory is `dist`.
3. Add `VITE_API_URL` with the complete Render API URL, without a trailing `/api` path. For example: `https://enterprise-api.onrender.com`.
4. Deploy.

## 4. Finish configuration

1. Copy the generated Vercel URL into the Render service values for `CORS_ORIGINS` and `OPENROUTER_SITE_URL`, then redeploy Render.
2. Test login and the dashboard from the Vercel URL.
3. Change the built-in demo account passwords or remove those accounts before sharing the deployment publicly.

Do not commit `.env` or database/API credentials. Use each host's environment-variable settings instead.
