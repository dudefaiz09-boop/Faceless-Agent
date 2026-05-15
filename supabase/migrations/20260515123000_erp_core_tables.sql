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
