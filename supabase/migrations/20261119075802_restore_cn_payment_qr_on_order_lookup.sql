-- Return the stored Alipay/WeChat QR payload to the authenticated owner when retrying an existing CNY payment order.
-- The QR is stored only in private.payment_transactions.metadata and is never exposed cross-user.
CREATE OR REPLACE FUNCTION public.get_my_cn_payment_order(p_order_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT jsonb_build_object(
    'order_id', o.id,
    'order_no', o.order_no,
    'amount', o.amount,
    'currency', o.currency,
    'status', o.status,
    'payment_expires_at', o.payment_expires_at,
    'provider', t.provider,
    'transaction_status', t.status,
    'provider_reference', t.provider_reference,
    'provider_qr_code', t.metadata->>'provider_qr_code',
    'provider_session_id', t.metadata->>'provider_session_id'
  )
  INTO v_result
  FROM public.service_orders o
  JOIN private.payment_transactions t ON t.order_id = o.id
  WHERE o.order_no = p_order_no
    AND o.user_id = auth.uid()
    AND o.currency = 'CNY'
    AND t.provider IN ('alipay', 'wechat_pay')
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'cn_payment_order_not_found';
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_cn_payment_order(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_cn_payment_order(text) TO authenticated, service_role;
