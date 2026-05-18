-- Multi-Tenancy Support for EduConnect

-- 1. Create tenants table
create table if not exists public.tenants (
  id text primary key,
  name text not null,
  slug text unique not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create user_tenants join table
create table if not exists public.user_tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  tenant_id text not null references public.tenants(id) on delete cascade,
  role text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(email, tenant_id)
);

-- 3. Update profiles table
alter table public.profiles
add column if not exists is_super_admin boolean not null default false,
add column if not exists managed_tenant_ids text[] not null default '{}';

-- 4. Enable RLS
alter table public.tenants enable row level security;
alter table public.user_tenants enable row level security;

-- 5. RLS Policies for tenants
drop policy if exists "Super admins can manage all tenants" on public.tenants;
create policy "Super admins can manage all tenants"
on public.tenants
for all
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or exists (
    select 1 from public.profiles
    where id = auth.uid() and is_super_admin = true
  )
);

drop policy if exists "Users can view their own tenants" on public.tenants;
create policy "Users can view their own tenants"
on public.tenants
for select
using (
  exists (
    select 1 from public.user_tenants
    where user_id = auth.uid() and tenant_id = tenants.id
  )
  or id = (select school_id from public.profiles where id = auth.uid())
);

-- 6. RLS Policies for user_tenants
drop policy if exists "Super admins can manage all user_tenants" on public.user_tenants;
create policy "Super admins can manage all user_tenants"
on public.user_tenants
for all
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or exists (
    select 1 from public.profiles
    where id = auth.uid() and is_super_admin = true
  )
);

drop policy if exists "Users can view their own tenant memberships" on public.user_tenants;
create policy "Users can view their own tenant memberships"
on public.user_tenants
for select
using (user_id = auth.uid() or email = auth.jwt() ->> 'email');

-- 7. Update existing documents table policy to support multi-tenancy better
drop policy if exists "authenticated reads own and tenant documents" on public.documents;
create policy "authenticated reads own and tenant documents"
on public.documents
for select
to authenticated
using (
  (collection = 'users' and id = (select auth.uid())::text)
  or (
    coalesce(data ->> 'tenantId', data ->> 'schoolId') = any (
      select tenant_id from public.user_tenants where user_id = auth.uid()
      union
      select school_id from public.profiles where id = auth.uid()
    )
  )
  or (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_super_admin = true
    )
  )
);

-- 8. Add updated_at triggers
create trigger tenants_updated_at before update on public.tenants
for each row execute function public.set_updated_at();

create trigger user_tenants_updated_at before update on public.user_tenants
for each row execute function public.set_updated_at();
