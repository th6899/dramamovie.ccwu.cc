-- Remove unused anonymous and customer write privileges from ancillary customer data.
REVOKE ALL ON TABLE public.manual_payment_submissions FROM anon;
REVOKE ALL ON TABLE public.refund_requests FROM anon;
REVOKE ALL ON TABLE public.email_service_orders FROM anon;
REVOKE ALL ON TABLE public.vpn_device_bindings FROM anon;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.manual_payment_submissions FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.manual_payment_submissions TO authenticated;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.refund_requests FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refund_requests TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.email_service_orders FROM authenticated;
GRANT SELECT ON TABLE public.email_service_orders TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.vpn_device_bindings FROM authenticated;
GRANT SELECT ON TABLE public.vpn_device_bindings TO authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon','public.manual_payment_submissions','SELECT')
     OR has_table_privilege('anon','public.refund_requests','SELECT')
     OR has_table_privilege('anon','public.email_service_orders','SELECT')
     OR has_table_privilege('anon','public.vpn_device_bindings','SELECT') THEN
    RAISE EXCEPTION 'anonymous_customer_data_access_not_revoked';
  END IF;
  IF NOT has_table_privilege('authenticated','public.manual_payment_submissions','SELECT')
     OR NOT has_table_privilege('authenticated','public.manual_payment_submissions','INSERT')
     OR has_table_privilege('authenticated','public.manual_payment_submissions','UPDATE')
     OR has_table_privilege('authenticated','public.manual_payment_submissions','DELETE') THEN
    RAISE EXCEPTION 'manual_submission_privileges_invalid';
  END IF;
  IF NOT has_table_privilege('authenticated','public.refund_requests','SELECT')
     OR NOT has_table_privilege('authenticated','public.refund_requests','INSERT')
     OR NOT has_table_privilege('authenticated','public.refund_requests','UPDATE')
     OR NOT has_table_privilege('authenticated','public.refund_requests','DELETE') THEN
    RAISE EXCEPTION 'refund_privileges_invalid';
  END IF;
  IF NOT has_table_privilege('authenticated','public.email_service_orders','SELECT')
     OR has_table_privilege('authenticated','public.email_service_orders','INSERT')
     OR has_table_privilege('authenticated','public.email_service_orders','UPDATE')
     OR has_table_privilege('authenticated','public.email_service_orders','DELETE') THEN
    RAISE EXCEPTION 'email_order_privileges_invalid';
  END IF;
  IF NOT has_table_privilege('authenticated','public.vpn_device_bindings','SELECT')
     OR has_table_privilege('authenticated','public.vpn_device_bindings','INSERT')
     OR has_table_privilege('authenticated','public.vpn_device_bindings','UPDATE')
     OR has_table_privilege('authenticated','public.vpn_device_bindings','DELETE') THEN
    RAISE EXCEPTION 'vpn_device_binding_privileges_invalid';
  END IF;
END;
$$;
