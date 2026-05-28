alter table public.documents
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_key text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists original_filename text;

create index if not exists documents_storage_provider_idx on public.documents (storage_provider);
create index if not exists documents_storage_bucket_idx on public.documents (storage_bucket);
