#!/bin/bash
set -e

mkdir -p tmp output

celery -A app.workers.celery_app worker --loglevel=info --concurrency=1 &
celery -A app.workers.celery_app beat --loglevel=info &

uvicorn app.main:app --host 0.0.0.0 --port 7860
