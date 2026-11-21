begin;
-- Financial order rows are created and transitioned only by trusted SECURITY DEFINER RPCs
-- and service-role Edge Functions. No browser role needs direct DML access.
drop policy if exists orders_staff_delete on public.service_orders;
drop policy if exists orders_staff_insert on public.service_orders;
drop policy if exists orders_staff_update on public.service_orders;
revoke all on table public.service_orders from public, anon, authenticated;
grant select on table public.service_orders to authenticated;

-- Support agents may read customer/order context, but must not change catalog pricing.
drop policy if exists vpn_plans_staff_delete on public.vpn_plans;
drop policy if exists vpn_plans_staff_insert on public.vpn_plans;
drop policy if exists vpn_plans_staff_update on public.vpn_plans;
create policy vpn_plans_staff_delete on public.vpn_plans
  for delete to authenticated
  using (coalesce((select public.current_staff_role()), '') in ('admin','editor'));
create policy vpn_plans_staff_insert on public.vpn_plans
  for insert to authenticated
  with check (coalesce((select public.current_staff_role()), '') in ('admin','editor'));
create policy vpn_plans_staff_update on public.vpn_plans
  for update to authenticated
  using (coalesce((select public.current_staff_role()), '') in ('admin','editor'))
  with check (coalesce((select public.current_staff_role()), '') in ('admin','editor'));
commit;
