-- Remove legacy column-level UPDATE grants on sensitive profile fields.
-- Users may update only display_name; RLS still limits the row to auth.uid().
REVOKE UPDATE (username, avatar_url) ON TABLE public.profiles FROM authenticated;
DO $$
BEGIN
  IF has_column_privilege('authenticated','public.profiles','username','UPDATE')
     OR has_column_privilege('authenticated','public.profiles','avatar_url','UPDATE') THEN
    RAISE EXCEPTION 'profile_column_update_privilege_not_revoked';
  END IF;
  IF NOT has_column_privilege('authenticated','public.profiles','display_name','UPDATE') THEN
    RAISE EXCEPTION 'profile_display_name_update_privilege_missing';
  END IF;
END;
$$;
