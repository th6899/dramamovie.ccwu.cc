CREATE OR REPLACE FUNCTION public.create_manual_payment_order(p_item_type text, p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_amount numeric;
  v_currency text;
  v_title text;
  v_duration integer;
  v_devices integer;
  v_order_id uuid;
  v_order_no text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.manual_payment_settings AS m
    WHERE m.id IS TRUE
      AND (
        (m.alipay_enabled IS TRUE AND NULLIF(btrim(m.alipay_qr_path), '') IS NOT NULL)
        OR
        (m.wechat_enabled IS TRUE AND NULLIF(btrim(m.wechat_qr_path), '') IS NOT NULL)
      )
  ) THEN
    RAISE EXCEPTION 'manual_payment_unavailable';
  END IF;

  IF p_item_type = 'membership' THEN
    SELECT price_amount, upper(currency), name, duration_days, NULL::integer
      INTO v_amount, v_currency, v_title, v_duration, v_devices
      FROM public.membership_plans
     WHERE id = p_item_id AND is_active = TRUE
     FOR SHARE;
  ELSIF p_item_type = 'vpn' THEN
    SELECT price_amount, upper(currency), name, duration_days, device_limit
      INTO v_amount, v_currency, v_title, v_duration, v_devices
      FROM public.vpn_plans
     WHERE id = p_item_id AND is_active = TRUE
     FOR SHARE;
  ELSE
    RAISE EXCEPTION 'unsupported_item_type';
  END IF;

  IF v_title IS NULL OR v_amount IS NULL OR v_amount <= 0
     OR v_duration IS NULL OR v_duration <= 0 THEN
    RAISE EXCEPTION 'plan_not_payable';
  END IF;

  IF v_currency IS DISTINCT FROM 'CNY' THEN
    RAISE EXCEPTION 'manual_qr_payment_only_supports_cny';
  END IF;

  v_order_no := 'CCWU-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 14));

  INSERT INTO public.service_orders(user_id, order_no, item_type, item_id, amount, currency, status)
  VALUES (v_user, v_order_no, p_item_type, p_item_id, v_amount, v_currency, 'pending')
  RETURNING id INTO v_order_id;

  INSERT INTO private.payment_transactions(order_id, provider, amount, currency, status, metadata)
  VALUES (
    v_order_id, 'manual', v_amount, v_currency, 'created',
    pg_catalog.jsonb_build_object('plan_name', v_title, 'duration_days', v_duration, 'device_limit', v_devices)
  );

  RETURN pg_catalog.jsonb_build_object(
    'order_id', v_order_id, 'order_no', v_order_no, 'title', v_title,
    'amount', v_amount, 'currency', v_currency, 'item_type', p_item_type, 'item_id', p_item_id
  );
END;
$function$;

DROP POLICY IF EXISTS "customers submit own manual payment details" ON public.manual_payment_submissions;
CREATE POLICY "customers submit own manual payment details"
ON public.manual_payment_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND status = 'submitted'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND NULLIF(btrim(payer_reference), '') IS NOT NULL
  AND (
    proof_path IS NULL
    OR (storage.foldername(proof_path))[1] = (SELECT auth.uid())::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.service_orders AS o
    WHERE o.id = manual_payment_submissions.order_id
      AND o.user_id = (SELECT auth.uid())
      AND o.status = 'pending'
      AND o.currency = 'CNY'
  )
  AND EXISTS (
    SELECT 1
    FROM public.manual_payment_settings AS m
    WHERE m.id IS TRUE
      AND (
        (method = 'alipay' AND m.alipay_enabled IS TRUE AND NULLIF(btrim(m.alipay_qr_path), '') IS NOT NULL)
        OR
        (method = 'wechat' AND m.wechat_enabled IS TRUE AND NULLIF(btrim(m.wechat_qr_path), '') IS NOT NULL)
      )
  )
);
