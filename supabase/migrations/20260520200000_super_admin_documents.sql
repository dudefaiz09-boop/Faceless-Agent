-- Allow Super Admins to write, update, and delete records on public.documents
drop policy if exists "Super admins can write all documents" on public.documents;
create policy "Super admins can write all documents"
on public.documents
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and is_super_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and is_super_admin = true
  )
);
