#!/bin/bash
set -e

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Fill in your Supabase project values."
fi

if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "Created apps/web/.env.local. Fill in your Supabase anon values."
fi

if [ ! -f apps/functions/.env ]; then
  cp apps/functions/.env.example apps/functions/.env
  echo "Created apps/functions/.env. Fill in your Supabase service role key."
fi

corepack pnpm install
