insert into public.documents (collection, id, data)
values (
  'schools',
  'default-school',
  jsonb_build_object(
    'id', 'default-school',
    'name', 'Default School',
    'createdAt', now()
  )
)
on conflict (collection, id) do nothing;
