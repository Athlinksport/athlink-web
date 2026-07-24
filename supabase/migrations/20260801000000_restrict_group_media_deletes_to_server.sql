-- Group media must only be deleted by trusted server-side code.
-- The service-role client bypasses RLS, so coordinated server cleanup remains
-- available after its corresponding database mutation succeeds.
begin;

drop policy if exists "users delete own group media"
on storage.objects;

commit;
