-- Prevent self-service profile writes from changing the authorization role.
-- New accounts are provisioned by the SECURITY DEFINER auth.users trigger,
-- which omits role and therefore receives the safe 'viewer' column default.
-- Authenticated users may only create/update their own non-privileged profile fields.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT INSERT (id, username, avatar_url) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url) ON TABLE public.profiles TO authenticated;
