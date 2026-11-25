-- User-specific rows must never be queryable by anonymous callers.
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.membership_subscriptions FROM anon;
REVOKE ALL ON TABLE public.vpn_subscriptions FROM anon;
REVOKE ALL ON TABLE public.episode_watch_progress FROM anon;
REVOKE ALL ON TABLE public.vpn_access_configs FROM anon;

DO $$
BEGIN
  IF has_table_privilege('anon','public.profiles','SELECT')
     OR has_table_privilege('anon','public.membership_subscriptions','SELECT')
     OR has_table_privilege('anon','public.vpn_subscriptions','SELECT')
     OR has_table_privilege('anon','public.episode_watch_progress','SELECT')
     OR has_table_privilege('anon','public.vpn_access_configs','SELECT') THEN
    RAISE EXCEPTION 'anonymous_private_user_data_select_not_revoked';
  END IF;
END;
$$;
