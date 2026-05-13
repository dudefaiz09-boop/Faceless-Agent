create extension if not exists "pgcrypto";

create table if not exists public.documents (
  collection text not null,
  id text not null default gen_random_uuid()::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists documents_collection_idx on public.documents (collection);
create index if not exists documents_data_gin_idx on public.documents using gin (data jsonb_path_ops);
create index if not exists documents_tenant_idx on public.documents ((data ->> 'tenantId'));
create index if not exists documents_school_idx on public.documents ((data ->> 'schoolId'));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
before update on public.documents
for each row execute function public.touch_updated_at();

alter table public.documents enable row level security;

drop policy if exists "service role manages documents" on public.documents;
create policy "service role manages documents"
on public.documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "users read own profile" on public.documents;
create policy "users read own profile"
on public.documents
for select
to authenticated
using (collection = 'users' and id = auth.uid()::text);

drop policy if exists "users read tenant documents" on public.documents;
create policy "users read tenant documents"
on public.documents
for select
to authenticated
using (
  coalesce(data ->> 'tenantId', data ->> 'schoolId') =
  coalesce(
    auth.jwt() -> 'app_metadata' ->> 'schoolId',
    auth.jwt() -> 'user_metadata' ->> 'schoolId'
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('educonnect-uploads', 'educonnect-uploads', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "public reads educonnect uploads" on storage.objects;
create policy "public reads educonnect uploads"
on storage.objects
for select
using (bucket_id = 'educonnect-uploads');

drop policy if exists "authenticated uploads educonnect files" on storage.objects;
create policy "authenticated uploads educonnect files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'educonnect-uploads');

drop policy if exists "authenticated updates own educonnect files" on storage.objects;
create policy "authenticated updates own educonnect files"
on storage.objects
for update
to authenticated
using (bucket_id = 'educonnect-uploads')
with check (bucket_id = 'educonnect-uploads');
