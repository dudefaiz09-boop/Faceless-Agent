-- Allow authenticated users to update their own user document inside public.documents
drop policy if exists "users can update own profile document" on public.documents;
create policy "users can update own profile document"
on public.documents
for update
to authenticated
using (collection = 'users' and id = (select auth.uid())::text)
with check (collection = 'users' and id = (select auth.uid())::text);
