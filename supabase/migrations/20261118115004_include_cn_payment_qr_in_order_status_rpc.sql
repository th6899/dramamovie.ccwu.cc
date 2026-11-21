-- Return the stored QR/session information so an authenticated customer can resume a pending CNY payment.
CREATE OR REPLACE FUNCTION public.get_my_cn_payment_order(p_order_no text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select jsonb_build_object(
    'order_id',o.id,'order_no',o.order_no,'amount',o.amount,'currency',o.currency,
    'status',o.status,'payment_expires_at',o.payment_expires_at,
    'provider',t.provider,'transaction_status',t.status,
    'provider_reference',t.provider_reference,
    'provider_qr_code',t.metadata->>'provider_qr_code',
    'provider_session_id',t.metadata->>'provider_session_id'
  ) into v_result
  from public.service_orders o
  join private.payment_transactions t on t.order_id=o.id
  where o.order_no=p_order_no and o.user_id=auth.uid()
    and o.currency='CNY' and t.provider in ('alipay','wechat_pay')
  order by t.created_at desc limit 1;
  if v_result is null then raise exception 'cn_payment_order_not_found'; end if;
  return v_result;
end;
$function$;
