-- Customer notifications are readable by owner and only read_at may be updated.
REVOKE ALL ON TABLE public.user_notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.user_notifications FROM authenticated;
GRANT SELECT ON TABLE public.user_notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.user_notifications TO authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon','public.user_notifications','SELECT')
     OR has_table_privilege('anon','public.user_notifications','INSERT')
     OR has_table_privilege('anon','public.user_notifications','UPDATE')
     OR has_table_privilege('anon','public.user_notifications','DELETE') THEN
    RAISE EXCEPTION 'anonymous_notification_access_not_revoked';
  END IF;
  IF NOT has_table_privilege('authenticated','public.user_notifications','SELECT')
     OR has_table_privilege('authenticated','public.user_notifications','UPDATE')
     OR has_table_privilege('authenticated','public.user_notifications','INSERT')
     OR has_table_privilege('authenticated','public.user_notifications','DELETE') THEN
    RAISE EXCEPTION 'authenticated_notification_table_privileges_invalid';
  END IF;
  IF NOT has_column_privilege('authenticated','public.user_notifications','read_at','UPDATE') THEN
    RAISE EXCEPTION 'notification_read_at_update_missing';
  END IF;
  IF has_column_privilege('authenticated','public.user_notifications','title','UPDATE')
     OR has_column_privilege('authenticated','public.user_notifications','body','UPDATE')
     OR has_column_privilege('authenticated','public.user_notifications','category','UPDATE')
     OR has_column_privilege('authenticated','public.user_notifications','user_id','UPDATE')
     OR has_column_privilege('authenticated','public.user_notifications','dedupe_key','UPDATE') THEN
    RAISE EXCEPTION 'notification_content_update_not_revoked';
  END IF;
END;
$$;
