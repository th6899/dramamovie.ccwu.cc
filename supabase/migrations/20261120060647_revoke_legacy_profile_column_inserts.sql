-- Profile rows are provisioned by trusted auth-user triggers; clients must not insert them.
REVOKE INSERT (id, username, avatar_url) ON TABLE public.profiles FROM authenticated;
DO $$
BEGIN
  IF has_column_privilege('authenticated','public.profiles','id','INSERT')
     OR has_column_privilege('authenticated','public.profiles','username','INSERT')
     OR has_column_privilege('authenticated','public.profiles','avatar_url','INSERT') THEN
    RAISE EXCEPTION 'profile_column_insert_privilege_not_revoked';
  END IF;
  IF has_column_privilege('authenticated','public.profiles','display_name','INSERT') THEN
    RAISE EXCEPTION 'profile_display_name_insert_unexpectedly_granted';
  END IF;
END;
$$;
