-- Grant privileges on all public schema tables and sequences

-- 1. Grant all privileges to service_role for backend operations
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- 2. Grant operations to authenticated users (RLS will filter row-level access)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all sequences in schema public to authenticated;

-- 3. Grant basic select to anon users (e.g. for landing pages, RLS still applies)
grant select on all tables in schema public to anon;
grant select on all sequences in schema public to anon;
