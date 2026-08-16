-- The pre-20260723 schema historically granted anon non-DML table-management
-- privileges on four original application tables. The baseline preserves that
-- history exactly; this forward security migration removes those legacy grants
-- from the final database without changing data, RLS, or authenticated access.

revoke all privileges on table
  public.profiles,
  public.user_sports,
  public.user_availability,
  public.connections
from anon;

-- PUBLIC should not provide an inheritance path around the explicit anon
-- revocation. This affects only these existing application tables and does not
-- alter Supabase platform-wide default privileges.
revoke all privileges on table
  public.profiles,
  public.user_sports,
  public.user_availability,
  public.connections
from public;
