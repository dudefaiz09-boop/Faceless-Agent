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
