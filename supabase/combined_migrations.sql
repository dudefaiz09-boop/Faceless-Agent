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

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.documents to service_role;
grant select on public.documents to authenticated;

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
set search_path = public
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
to service_role
using (true)
with check (true);

drop policy if exists "authenticated reads own and tenant documents" on public.documents;
create policy "authenticated reads own and tenant documents"
on public.documents
for select
to authenticated
using (
  (collection = 'users' and id = (select auth.uid())::text)
  or (
    coalesce(data ->> 'tenantId', data ->> 'schoolId') =
    ((select auth.jwt()) -> 'app_metadata' ->> 'schoolId')
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('educonnect-uploads', 'educonnect-uploads', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

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
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "service role manages documents" on public.documents;
create policy "service role manages documents"
on public.documents
for all
to service_role
using (true)
with check (true);

drop policy if exists "users read own profile" on public.documents;
drop policy if exists "users read tenant documents" on public.documents;
drop policy if exists "authenticated reads own and tenant documents" on public.documents;
create policy "authenticated reads own and tenant documents"
on public.documents
for select
to authenticated
using (
  (collection = 'users' and id = (select auth.uid())::text)
  or (
    coalesce(data ->> 'tenantId', data ->> 'schoolId') =
    ((select auth.jwt()) -> 'app_metadata' ->> 'schoolId')
  )
);

drop policy if exists "public reads educonnect uploads" on storage.objects;
drop policy if exists "service role manages documents" on public.documents;
create policy "service role manages documents"
on public.documents
for all
to service_role
using (true)
with check (true);

drop policy if exists "users read own profile" on public.documents;
drop policy if exists "users read tenant documents" on public.documents;
drop policy if exists "authenticated reads own and tenant documents" on public.documents;

create policy "authenticated reads own and tenant documents"
on public.documents
for select
to authenticated
using (
  (collection = 'users' and id = (select auth.uid())::text)
  or (
    coalesce(data ->> 'tenantId', data ->> 'schoolId') =
    ((select auth.jwt()) -> 'app_metadata' ->> 'schoolId')
  )
);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.documents to service_role;
grant select on public.documents to authenticated;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id text not null default 'default-school',
  email text not null,
  display_name text,
  role text not null default 'student',
  roles text[] not null default array['student'],
  assigned_modules text[] not null default '{}',
  permissions jsonb not null default '{}',
  class_ids text[] not null default '{}',
  subject_ids text[] not null default '{}',
  section_ids text[] not null default '{}',
  linked_student_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  title text not null,
  content text not null,
  category text not null default 'general',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  target_roles text[] not null default array['all'],
  target_classes text[] not null default array['all'],
  pinned boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'scheduled', 'published', 'archived')),
  scheduled_for timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  student_id uuid references auth.users(id) on delete cascade,
  class_id text not null,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, class_id, attendance_date)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  title text not null,
  description text not null,
  class_ids text[] not null default '{}',
  subject_id text,
  due_at timestamptz,
  rubric jsonb not null default '{}',
  attachments jsonb not null default '[]',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  content text,
  file_urls text[] not null default '{}',
  grade text,
  feedback text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'graded', 'returned')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  name text,
  type text not null default 'group' check (type in ('direct', 'group', 'broadcast')),
  member_ids uuid[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text,
  attachments jsonb not null default '[]',
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  title text not null,
  author text,
  category text,
  isbn text,
  total_copies int not null default 1,
  available_copies int not null default 1,
  ebook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.borrowed_books (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.library_books(id) on delete cascade,
  borrower_id uuid not null references auth.users(id) on delete cascade,
  borrowed_at timestamptz not null default now(),
  due_at timestamptz,
  returned_at timestamptz,
  status text not null default 'borrowed' check (status in ('borrowed', 'returned', 'overdue'))
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  student_id uuid references auth.users(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null,
  due_at date,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid references public.fees(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  method text,
  receipt_number text,
  paid_at timestamptz not null default now()
);

create table if not exists public.performance (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  student_id uuid references auth.users(id) on delete cascade,
  subject_id text not null,
  term text,
  score numeric(5,2),
  grade text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id text not null default 'default-school',
  recipient_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_school_role_idx on public.profiles (school_id, role);
create index if not exists announcements_school_created_idx on public.announcements (school_id, created_at desc);
create index if not exists attendance_student_date_idx on public.attendance (student_id, attendance_date desc);
create index if not exists assignments_school_due_idx on public.assignments (school_id, due_at);
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at desc);
create index if not exists fees_student_status_idx on public.fees (student_id, status);
create index if not exists notifications_recipient_read_idx on public.notifications (recipient_id, read, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'announcements', 'attendance', 'assignments', 'submissions', 'chats',
    'messages', 'library_books', 'borrowed_books', 'fees', 'payments', 'performance',
    'notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "profiles self or admin read" on public.profiles;
create policy "profiles self or admin read" on public.profiles
for select using (
  id = auth.uid() or coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
);

drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles
for all using (coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false));

drop policy if exists "authenticated read announcements" on public.announcements;
create policy "authenticated read announcements" on public.announcements
for select to authenticated using (status in ('published', 'scheduled'));

drop policy if exists "admin teacher write announcements" on public.announcements;
create policy "admin teacher write announcements" on public.announcements
for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['teacher', 'principal']
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['teacher', 'principal']
);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select to authenticated using (recipient_id = auth.uid());

drop policy if exists "admin write notifications" on public.notifications;
create policy "admin write notifications" on public.notifications
for all to authenticated using (coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false));

drop policy if exists "school authenticated read core" on public.attendance;
create policy "school authenticated read core" on public.attendance for select to authenticated using (true);
drop policy if exists "school authenticated read assignments" on public.assignments;
create policy "school authenticated read assignments" on public.assignments for select to authenticated using (true);
drop policy if exists "school authenticated read library" on public.library_books;
create policy "school authenticated read library" on public.library_books for select to authenticated using (true);

drop policy if exists "admin write attendance" on public.attendance;
create policy "admin write attendance" on public.attendance for all to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false) or (auth.jwt() -> 'app_metadata' -> 'roles') ? 'teacher')
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false) or (auth.jwt() -> 'app_metadata' -> 'roles') ? 'teacher');

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements
for each row execute function public.set_updated_at();
create trigger attendance_updated_at before update on public.attendance
for each row execute function public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments
for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions
for each row execute function public.set_updated_at();
create trigger library_books_updated_at before update on public.library_books
for each row execute function public.set_updated_at();
create trigger fees_updated_at before update on public.fees
for each row execute function public.set_updated_at();
create trigger performance_updated_at before update on public.performance
for each row execute function public.set_updated_at();
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
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  title text not null,
  description text,
  subject_id text,
  class_ids text[] not null default '{}',
  teacher_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create index if not exists courses_school_status_idx on public.courses (school_id, status);
create index if not exists enrollments_student_status_idx on public.enrollments (student_id, status);
create index if not exists enrollments_course_status_idx on public.enrollments (course_id, status);

alter table public.courses enable row level security;
alter table public.enrollments enable row level security;

drop policy if exists "authenticated read courses" on public.courses;
create policy "authenticated read courses" on public.courses
for select to authenticated using (true);

drop policy if exists "admin teacher write courses" on public.courses;
create policy "admin teacher write courses" on public.courses
for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
);

drop policy if exists "authenticated read own enrollments" on public.enrollments;
create policy "authenticated read own enrollments" on public.enrollments
for select to authenticated using (
  student_id = auth.uid()
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['principal', 'teacher']
);

drop policy if exists "admin teacher write enrollments" on public.enrollments;
create policy "admin teacher write enrollments" on public.enrollments
for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
);

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists enrollments_updated_at on public.enrollments;
create trigger enrollments_updated_at before update on public.enrollments
for each row execute function public.set_updated_at();
-- Storage Policies for educonnect-uploads bucket

-- 1. Allow authenticated users to read/download objects from the uploads bucket
drop policy if exists "authenticated select educonnect files" on storage.objects;
create policy "authenticated select educonnect files"
on storage.objects
for select
to authenticated
using (bucket_id = 'educonnect-uploads');

-- 2. Allow authenticated users to delete objects from the uploads bucket
drop policy if exists "authenticated delete educonnect files" on storage.objects;
create policy "authenticated delete educonnect files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'educonnect-uploads');
