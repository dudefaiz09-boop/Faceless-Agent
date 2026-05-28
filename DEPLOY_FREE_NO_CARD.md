# Free No-Card Deployment Guide

This guide prepares Faceless-Agent for a low-cost deployment path using free tiers where possible:

- Backend/API/Celery: Hugging Face Spaces with Docker
- Dashboard: Vercel Hobby
- Database and optional object storage: Supabase Free
- Redis broker/result backend: Upstash Redis Free
- LLM: OpenAI-compatible providers such as Groq, OpenRouter, or OpenAI
- TTS: edge-tts
- Video rendering: FFmpeg inside the backend Docker image

Free-tier rules and card requirements can change. Confirm the current limits in each provider before relying on this setup for production.

## 1. Supabase Database and Storage

1. Create a Supabase project on the Free plan.
2. Open the project connection settings and copy a pooled Postgres connection string.
3. Use the async SQLAlchemy driver format in the backend environment:

   ```bash
   DATABASE_URL=postgresql+asyncpg://postgres.<SUPABASE_PROJECT_REF>:<SUPABASE_DB_PASSWORD>@aws-0-<SUPABASE_REGION>.pooler.supabase.com:6543/postgres
   ```

4. Optional: create a Supabase Storage bucket for generated assets.
5. Optional: enable Supabase S3-compatible access and set:

   ```bash
   STORAGE_BUCKET=faceless-agent
   STORAGE_ACCESS_KEY=<SUPABASE_STORAGE_ACCESS_KEY>
   STORAGE_SECRET_KEY=<SUPABASE_STORAGE_SECRET_KEY>
   STORAGE_ENDPOINT=https://<SUPABASE_PROJECT_REF>.supabase.co/storage/v1/s3
   ```

Do not commit Supabase database passwords, access keys, anon keys, or service-role keys.

## 2. Upstash Redis

1. Create an Upstash Redis database on the Free plan.
2. Copy the Redis TLS URL.
3. Use the same URL for the app Redis settings and Celery:

   ```bash
   REDIS_URL=rediss://default:<UPSTASH_REDIS_PASSWORD>@your-upstash-host.upstash.io:6379
   CELERY_BROKER_URL=rediss://default:<UPSTASH_REDIS_PASSWORD>@your-upstash-host.upstash.io:6379
   CELERY_RESULT_BACKEND=rediss://default:<UPSTASH_REDIS_PASSWORD>@your-upstash-host.upstash.io:6379
   ```

Free Redis command limits are best suited for light testing, manual review, and low-volume generation.

## 3. OpenAI-Compatible LLM Provider

The backend uses OpenAI-compatible chat completions when `OPENAI_API_KEY` is set. If it is blank, the existing fallback remains Ollama.

Common examples:

```bash
# OpenAI
OPENAI_API_KEY=<OPENAI_API_KEY>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Groq
OPENAI_API_KEY=<GROQ_API_KEY>
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.1-8b-instant

# OpenRouter
OPENAI_API_KEY=<OPENROUTER_API_KEY>
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
```

Keep provider keys blank in committed files and configure them only in provider dashboards.

## 4. Hugging Face Spaces Backend

1. Create a new Hugging Face Space.
2. Choose Docker as the Space SDK.
3. Point the Space at this repository. The root `README.md` includes `sdk: docker` and `app_port: 7860`, and the root `Dockerfile` builds the backend from the `backend/` directory.
4. If you upload only the backend directory instead, use `backend/Dockerfile` as the Docker build definition and set the Space port to `7860`.
5. Set the Space port to `7860` if the UI asks for an app port.
6. Add backend secrets in the Space settings:

   ```bash
   DATABASE_URL=postgresql+asyncpg://postgres.<SUPABASE_PROJECT_REF>:<SUPABASE_DB_PASSWORD>@aws-0-<SUPABASE_REGION>.pooler.supabase.com:6543/postgres
   REDIS_URL=rediss://default:<UPSTASH_REDIS_PASSWORD>@your-upstash-host.upstash.io:6379
   CELERY_BROKER_URL=rediss://default:<UPSTASH_REDIS_PASSWORD>@your-upstash-host.upstash.io:6379
   CELERY_RESULT_BACKEND=rediss://default:<UPSTASH_REDIS_PASSWORD>@your-upstash-host.upstash.io:6379
   OPENAI_API_KEY=<PROVIDER_API_KEY>
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4o-mini
   CORS_ORIGINS=https://your-dashboard.vercel.app
   JWT_SECRET_KEY=<GENERATE_A_RANDOM_SECRET>
   TTS_PROVIDER=edge
   VIDEO_OUTPUT_FPS=24
   VIDEO_OUTPUT_BITRATE=3M
   ```

The backend entrypoint starts one Celery worker, Celery beat, and Uvicorn on `0.0.0.0:7860`. FFmpeg is installed in the Docker image.

## 5. Vercel Dashboard

1. Import the repository into Vercel on the Hobby plan.
2. Set the project root directory to `dashboard`.
3. Configure the dashboard environment:

   ```bash
   NEXT_PUBLIC_API_URL=https://your-huggingface-space.hf.space
   ```

4. Deploy the dashboard.
5. Update the backend `CORS_ORIGINS` secret in Hugging Face Spaces to the Vercel dashboard URL.

## 6. Free-Tier Operating Limits

- Keep `HUMAN_REVIEW_REQUIRED=true` while testing.
- Keep `MAX_POSTS_PER_DAY_YOUTUBE=1` and `MAX_POSTS_PER_DAY_INSTAGRAM=1`.
- Keep video rendering conservative with `VIDEO_OUTPUT_FPS=24` and `VIDEO_OUTPUT_BITRATE=3M`.
- Avoid running multiple Celery workers on free CPU/RAM tiers.
- Treat generated video files as temporary unless Supabase Storage is configured.
- Watch provider dashboards for usage, sleeping, pausing, or archival behavior.

## 7. Local Validation

Run syntax checks:

```bash
python -m py_compile backend/app/config.py backend/app/providers/llm.py
bash -n backend/entrypoint.sh
```

Optional Docker smoke test from the repository root:

```bash
docker build -t faceless-agent-backend .
docker run --rm -p 7860:7860 --env-file .env.example faceless-agent-backend
```

For a real smoke test, replace placeholder secrets with provider dashboard values outside git, then open:

```bash
curl http://localhost:7860/health
```
