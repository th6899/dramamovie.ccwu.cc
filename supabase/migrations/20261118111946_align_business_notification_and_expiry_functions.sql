begin;
CREATE OR REPLACE FUNCTION private.capture_business_event_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid; v_entity_id uuid; v_status text; v_kind text; v_plan_name text; v_order_no text;
  v_event_type text; v_category text; v_title text; v_body text; v_dedupe text; v_template text;
  v_payload jsonb:='{}'::jsonb;
begin
  if TG_TABLE_SCHEMA='public' and TG_TABLE_NAME='service_orders' then
    if TG_OP<>'UPDATE' then return NEW; end if;
    if OLD.status<>'pending' or NEW.status<>'paid' then return NEW; end if;
    v_user_id:=NEW.user_id; v_entity_id:=NEW.id; v_event_type:='payment.succeeded'; v_category:='payment';
    v_title:='订单支付成功'; v_order_no:=NEW.order_no;
    v_body:=format('订单 %s 已支付成功，金额：%s %s。',v_order_no,NEW.amount,NEW.currency);
    v_dedupe:='payment-success:order:'||NEW.id::text; v_template:='payment_receipt';
    v_payload:=jsonb_build_object('order_id',NEW.id,'order_no',NEW.order_no,'amount',NEW.amount,'currency',NEW.currency);
  elsif TG_TABLE_SCHEMA='private' and TG_TABLE_NAME='payment_refunds' then
    if NEW.status not in ('succeeded','failed') then return NEW; end if;
    if TG_OP='UPDATE' then
      if OLD.status=NEW.status then return NEW; end if;
    end if;
    select o.user_id,o.order_no into v_user_id,v_order_no from public.service_orders o where o.id=NEW.order_id;
    if v_user_id is null then return NEW; end if;
    v_entity_id:=NEW.id; v_category:='refund';
    v_event_type:=case when NEW.status='succeeded' then 'refund.succeeded' else 'refund.failed' end;
    v_title:=case when NEW.status='succeeded' then '退款处理完成' else '退款处理未成功' end;
    v_body:=format('订单 %s 的退款状态：%s，金额：%s %s。',v_order_no,case when NEW.status='succeeded' then '已完成' else '失败，请查看退款记录' end,NEW.amount,NEW.currency);
    v_dedupe:='refund-status:'||NEW.id::text||':'||NEW.status; v_template:='refund_status';
    v_payload:=jsonb_build_object('refund_id',NEW.id,'order_id',NEW.order_id,'order_no',v_order_no,'status',NEW.status,'amount',NEW.amount,'currency',NEW.currency);
  elsif TG_TABLE_SCHEMA='public' and TG_TABLE_NAME in ('membership_subscriptions','vpn_subscriptions') then
    if TG_OP='INSERT' then
      if NEW.status<>'active' then return NEW; end if;
      v_status:='active';
    else
      if OLD.status is not distinct from NEW.status then return NEW; end if;
      v_status:=NEW.status;
    end if;
    if v_status not in ('active','suspended','cancelled') then return NEW; end if;
    v_user_id:=NEW.user_id; v_entity_id:=NEW.id;
    v_kind:=case when TG_TABLE_NAME='vpn_subscriptions' then 'vpn' else 'membership' end;
    if v_kind='vpn' then select p.name into v_plan_name from public.vpn_plans p where p.id=NEW.plan_id;
    else select p.name into v_plan_name from public.membership_plans p where p.id=NEW.plan_id; end if;
    v_event_type:=v_kind||'.'||case when v_status='active' and TG_OP='INSERT' then 'activated' when v_status='active' then 'reactivated' when v_status='suspended' then 'suspended' else 'cancelled' end;
    v_category:=v_kind; v_title:=case when v_kind='vpn' then 'VPN 服务状态更新' else '影视会员状态更新' end;
    v_body:=format('您的%s「%s」状态已更新为：%s。',case when v_kind='vpn' then 'VPN 服务' else '影视会员' end,coalesce(v_plan_name,'已订购服务'),case v_status when 'active' then '有效' when 'suspended' then '暂停' else '已取消' end);
    v_dedupe:='entitlement:'||v_kind||':'||NEW.id::text||':'||v_event_type; v_template:='entitlement_status';
    v_payload:=jsonb_build_object('entitlement_id',NEW.id,'kind',v_kind,'plan_name',v_plan_name,'status',v_status,'starts_at',NEW.starts_at,'ends_at',NEW.ends_at);
  else return NEW;
  end if;
  perform private.enqueue_user_business_notice(v_user_id,v_category,v_title,v_body,v_dedupe,v_event_type,v_entity_id,v_template,v_payload);
  return NEW;
end; $function$;

CREATE OR REPLACE FUNCTION private.enqueue_entitlement_expiry_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer := 0; v_row record; v_days integer;
begin
  for v_row in
    select s.user_id, s.id as entitlement_id, s.ends_at, p.name as plan_name, 'membership'::text as kind
    from public.membership_subscriptions s
    join public.membership_plans p on p.id=s.plan_id
    where s.status='active' and s.ends_at is not null
      and (s.ends_at at time zone 'UTC')::date - (now() at time zone 'UTC')::date in (7,3,1)
    union all
    select s.user_id, s.id as entitlement_id, s.ends_at, p.name as plan_name, 'vpn'::text as kind
    from public.vpn_subscriptions s
    join public.vpn_plans p on p.id=s.plan_id
    where s.status='active' and s.ends_at is not null
      and (s.ends_at at time zone 'UTC')::date - (now() at time zone 'UTC')::date in (7,3,1)
  loop
    v_days := (v_row.ends_at at time zone 'UTC')::date - (now() at time zone 'UTC')::date;
    insert into public.user_notifications(user_id,category,title,body,dedupe_key)
    values(
      v_row.user_id,
      case when v_row.kind='vpn' then 'vpn' else 'membership' end,
      case when v_row.kind='vpn' then 'VPN 服务即将到期' else '影视会员即将到期' end,
      format('您的%s「%s」将于 %s 到期，请及时查看续订选项。', case when v_row.kind='vpn' then 'VPN 服务' else '影视会员' end, v_row.plan_name, to_char(v_row.ends_at at time zone 'UTC','YYYY-MM-DD HH24:MI')),
      format('entitlement-expiry:%s:%s:%s',v_row.kind,v_row.entitlement_id,v_days)
    ) on conflict (user_id,dedupe_key) do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enqueue_user_business_notice(p_user_id uuid, p_category text, p_title text, p_body text, p_dedupe_key text, p_event_type text, p_entity_id uuid, p_template_key text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_notice_id uuid;
begin
  if p_user_id is null or p_entity_id is null or p_dedupe_key is null then return false; end if;
  insert into public.user_notifications(user_id,category,title,body,dedupe_key)
  values(p_user_id,p_category,left(p_title,160),left(p_body,4000),p_dedupe_key)
  on conflict(user_id,dedupe_key) do nothing returning id into v_notice_id;
  if v_notice_id is null then return false; end if;
  insert into private.notification_delivery_queue(user_id,event_type,entity_id,dedupe_key,template_key,payload,status)
  values(p_user_id,p_event_type,p_entity_id,p_dedupe_key,p_template_key,coalesce(p_payload,'{}'::jsonb),'disabled')
  on conflict(user_id,dedupe_key,channel) do nothing;
  return true;
end; $function$;

CREATE OR REPLACE FUNCTION private.expire_paid_through_subscriptions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer:=0; v_rows integer;
begin
 update public.membership_subscriptions s set status='expired',updated_at=now() from private.provider_subscriptions p
 where p.item_type='membership' and p.entitlement_id=s.id and p.status in ('active','past_due','canceled','unpaid')
 and p.current_period_end is not null and p.current_period_end<=now() and s.status in ('active','suspended','past_due');
 get diagnostics v_rows=row_count; v_count:=v_count+v_rows;
 update public.vpn_subscriptions s set status='expired' from private.provider_subscriptions p
 where p.item_type='vpn' and p.entitlement_id=s.id and p.status in ('active','past_due','canceled','unpaid')
 and p.current_period_end is not null and p.current_period_end<=now() and s.status in ('active','suspended','past_due');
 get diagnostics v_rows=row_count; v_count:=v_count+v_rows;
 update private.provider_subscriptions set status='expired',updated_at=now()
 where status in ('active','past_due','canceled','unpaid') and current_period_end is not null and current_period_end<=now();
 return v_count;
end; $function$;
revoke all on function private.capture_business_event_notification() from public,anon,authenticated,service_role;
revoke all on function private.enqueue_entitlement_expiry_notifications() from public,anon,authenticated,service_role;
revoke all on function private.enqueue_user_business_notice(uuid,text,text,text,text,text,uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.expire_paid_through_subscriptions() from public,anon,authenticated,service_role;
grant execute on function private.enqueue_entitlement_expiry_notifications() to service_role;
grant execute on function private.expire_paid_through_subscriptions() to service_role;

drop trigger if exists trg_notice_payment_refund_status on private.payment_refunds;
create trigger trg_notice_payment_refund_status after insert or update of status on private.payment_refunds for each row execute function private.capture_business_event_notification();
drop trigger if exists trg_notice_membership_status on public.membership_subscriptions;
create trigger trg_notice_membership_status after insert or update of status on public.membership_subscriptions for each row execute function private.capture_business_event_notification();
drop trigger if exists trg_notice_service_order_paid on public.service_orders;
create trigger trg_notice_service_order_paid after update of status on public.service_orders for each row execute function private.capture_business_event_notification();
drop trigger if exists trg_notice_vpn_status on public.vpn_subscriptions;
create trigger trg_notice_vpn_status after insert or update of status on public.vpn_subscriptions for each row execute function private.capture_business_event_notification();
commit;