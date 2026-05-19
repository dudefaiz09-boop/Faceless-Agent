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
