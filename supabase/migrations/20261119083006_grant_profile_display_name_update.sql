-- Allow signed-in users to edit only their own display name.
-- The profiles_update_own RLS policy continues to constrain rows to auth.uid() = id.
-- Do not grant UPDATE on role, username, or any other authorization/profile column.
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;
