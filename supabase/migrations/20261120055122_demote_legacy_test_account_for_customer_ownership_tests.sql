-- Keep the explicitly designated tianhon027@gmail.com account as the sole test admin.
-- Convert the legacy confirmed 18129290870@163.com test account to an ordinary customer
-- so real owner-isolation tests can run without creating another mailbox/account.
DO $$
DECLARE
  v_target uuid := '8df1ae5a-5e03-4471-ac91-8e53f5da6a24';
  v_admin uuid := '957938cc-2f38-4105-81b8-a0ab75d06052';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id=v_target AND email='18129290870@163.com' AND confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'expected_confirmed_test_customer_not_found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN private.user_roles r ON r.user_id=u.id
    WHERE u.id=v_admin AND u.email='tianhon027@gmail.com' AND r.role='admin'
  ) THEN
    RAISE EXCEPTION 'primary_test_admin_missing';
  END IF;
  DELETE FROM private.user_roles WHERE user_id=v_target AND role='admin';
  IF EXISTS (SELECT 1 FROM private.user_roles WHERE user_id=v_target) THEN
    RAISE EXCEPTION 'test_customer_still_has_staff_role';
  END IF;
END;
$$;
