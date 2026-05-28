-- Tighten role-aware read/write scopes for sensitive ERP data.
-- Backend APIs still enforce authorization first; these policies are the database backstop for
-- any direct Supabase client reads that remain during the migration.

create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.auth_profile_school_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function private.auth_profile_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.roles, array[p.role], array[]::text[])
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function private.auth_profile_class_ids()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.class_ids, array[]::text[])
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function private.auth_profile_linked_student_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.linked_student_ids, array[]::uuid[])
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function private.auth_profile_child_class_ids()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct class_id), array[]::text[])
  from public.profiles parent
  join public.profiles child on child.id = any(parent.linked_student_ids)
  cross join unnest(child.class_ids) as class_id
  where parent.id = auth.uid()
$$;

create or replace function private.auth_has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.is_super_admin = true
          or p.roles && allowed_roles
          or p.role = any(allowed_roles)
        )
    ),
    false
  )
$$;

create or replace function private.auth_same_school(record_school_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.is_super_admin = true
          or p.school_id = record_school_id
          or record_school_id = any(p.managed_tenant_ids)
        )
    ),
    false
  )
$$;

create or replace function private.document_text_array(document jsonb, key text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(value), array[]::text[])
  from jsonb_array_elements_text(coalesce(document -> key, '[]'::jsonb)) as value
$$;

grant execute on all functions in schema private to authenticated;

drop policy if exists "school authenticated read core" on public.attendance;
drop policy if exists "admin write attendance" on public.attendance;
drop policy if exists "role scoped attendance read" on public.attendance;
drop policy if exists "role scoped attendance write" on public.attendance;
create policy "role scoped attendance read"
on public.attendance
for select
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or student_id = auth.uid()
    or student_id = any(private.auth_profile_linked_student_ids())
    or (
      private.auth_has_any_role(array['teacher'])
      and class_id = any(private.auth_profile_class_ids())
    )
  )
);

create policy "role scoped attendance write"
on public.attendance
for all
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or (
      private.auth_has_any_role(array['teacher'])
      and class_id = any(private.auth_profile_class_ids())
    )
  )
)
with check (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or (
      private.auth_has_any_role(array['teacher'])
      and class_id = any(private.auth_profile_class_ids())
    )
  )
);

drop policy if exists "school authenticated read assignments" on public.assignments;
drop policy if exists "role scoped assignments read" on public.assignments;
drop policy if exists "role scoped assignments write" on public.assignments;
create policy "role scoped assignments read"
on public.assignments
for select
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or (
      private.auth_has_any_role(array['teacher', 'student'])
      and class_ids && private.auth_profile_class_ids()
    )
    or (
      private.auth_has_any_role(array['parent'])
      and class_ids && private.auth_profile_child_class_ids()
    )
  )
);

create policy "role scoped assignments write"
on public.assignments
for all
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or (
      private.auth_has_any_role(array['teacher'])
      and class_ids && private.auth_profile_class_ids()
    )
  )
)
with check (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or (
      private.auth_has_any_role(array['teacher'])
      and class_ids && private.auth_profile_class_ids()
    )
  )
);

drop policy if exists "role scoped fees read" on public.fees;
create policy "role scoped fees read"
on public.fees
for select
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal', 'accountant'])
    or student_id = auth.uid()
    or student_id = any(private.auth_profile_linked_student_ids())
  )
);

drop policy if exists "role scoped payments read" on public.payments;
create policy "role scoped payments read"
on public.payments
for select
to authenticated
using (
  student_id = auth.uid()
  or student_id = any(private.auth_profile_linked_student_ids())
  or (
    private.auth_has_any_role(array['admin', 'principal', 'accountant'])
    and exists (
      select 1
      from public.fees fee
      where fee.id = public.payments.fee_id
        and private.auth_same_school(fee.school_id)
    )
  )
);

drop policy if exists "role scoped performance read" on public.performance;
create policy "role scoped performance read"
on public.performance
for select
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or student_id = auth.uid()
    or student_id = any(private.auth_profile_linked_student_ids())
    or (
      private.auth_has_any_role(array['teacher'])
      and exists (
        select 1
        from public.profiles student
        where student.id = public.performance.student_id
          and student.class_ids && private.auth_profile_class_ids()
      )
    )
  )
);

drop policy if exists "role scoped submissions read" on public.submissions;
create policy "role scoped submissions read"
on public.submissions
for select
to authenticated
using (
  student_id = auth.uid()
  or student_id = any(private.auth_profile_linked_student_ids())
  or exists (
    select 1
    from public.assignments assignment
    where assignment.id = public.submissions.assignment_id
      and private.auth_same_school(assignment.school_id)
      and (
        private.auth_has_any_role(array['admin', 'principal'])
        or (
          private.auth_has_any_role(array['teacher'])
          and assignment.class_ids && private.auth_profile_class_ids()
        )
      )
  )
);

drop policy if exists "school authenticated read library" on public.library_books;
create policy "school scoped library read"
on public.library_books
for select
to authenticated
using (private.auth_same_school(school_id));

drop policy if exists "authenticated reads own and tenant documents" on public.documents;
create policy "authenticated reads role scoped documents"
on public.documents
for select
to authenticated
using (
  (collection = 'users' and (
    id = auth.uid()::text
    or private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
  ))
  or (
    collection in ('announcements', 'notifications', 'classes', 'sections', 'subjects', 'timetable', 'library')
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
  )
  or (
    collection = 'conversations'
    and (
      (data -> 'participants') ? auth.uid()::text
      or (data -> 'memberIds') ? auth.uid()::text
    )
  )
  or (
    collection like 'conversations/%/messages'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
  )
  or (
    collection = 'attendance'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or exists (
        select 1
        from jsonb_array_elements(coalesce(data -> 'records', '[]'::jsonb)) as record
        where record ->> 'studentId' = auth.uid()::text
           or record ->> 'studentId' = any(
             array(select unnest(private.auth_profile_linked_student_ids())::text)
           )
      )
      or (
        private.auth_has_any_role(array['teacher'])
        and data ->> 'classId' = any(private.auth_profile_class_ids())
      )
    )
  )
  or (
    collection = 'assignments'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or (
        private.auth_has_any_role(array['teacher', 'student'])
        and (
          private.document_text_array(data, 'targetClasses') && private.auth_profile_class_ids()
          or private.document_text_array(data, 'classIds') && private.auth_profile_class_ids()
        )
      )
      or (
        private.auth_has_any_role(array['parent'])
        and (
          private.document_text_array(data, 'targetClasses') && private.auth_profile_child_class_ids()
          or private.document_text_array(data, 'classIds') && private.auth_profile_child_class_ids()
        )
      )
    )
  )
  or (
    collection = 'fees'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal', 'accountant'])
      or data ->> 'studentId' = auth.uid()::text
      or data ->> 'studentId' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
    )
  )
  or (
    collection = 'performance'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or data ->> 'studentId' = auth.uid()::text
      or data ->> 'studentId' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
      or (
        private.auth_has_any_role(array['teacher'])
        and data ->> 'classId' = any(private.auth_profile_class_ids())
      )
    )
  )
  or (
    collection = 'submissions'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or data ->> 'studentId' = auth.uid()::text
      or data ->> 'studentId' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
    )
  )
);

