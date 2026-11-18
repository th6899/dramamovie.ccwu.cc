begin;
CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.is_staff();
$function$;
revoke all on function public.is_staff() from public,anon,authenticated,service_role;
grant execute on function public.is_staff() to authenticated,service_role;
drop policy if exists "ccwu_cinema_posters_public_read" on storage.objects;
create policy "ccwu_cinema_posters_public_read" on storage.objects as permissive for select to anon, authenticated using ((bucket_id = 'ccwu-cinema-posters'::text));
drop policy if exists "ccwu_cinema_staff_read_private_media" on storage.objects;
create policy "ccwu_cinema_staff_read_private_media" on storage.objects as permissive for select to authenticated using (((bucket_id = ANY (ARRAY['ccwu-cinema-videos'::text, 'ccwu-cinema-subtitles'::text])) AND is_staff()));
drop policy if exists "ccwu_cinema_staff_upload_media" on storage.objects;
create policy "ccwu_cinema_staff_upload_media" on storage.objects as permissive for insert to authenticated with check (((bucket_id = ANY (ARRAY['ccwu-cinema-posters'::text, 'ccwu-cinema-videos'::text, 'ccwu-cinema-subtitles'::text])) AND is_staff()));
drop policy if exists "customer or staff reads payment proof" on storage.objects;
create policy "customer or staff reads payment proof" on storage.objects as permissive for select to authenticated using (((bucket_id = 'ccwu-payment-proofs'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR is_staff())));
drop policy if exists "customers upload own payment proof" on storage.objects;
create policy "customers upload own payment proof" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'ccwu-payment-proofs'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
drop policy if exists "public reads payment QR images" on storage.objects;
create policy "public reads payment QR images" on storage.objects as permissive for select to anon, authenticated using ((bucket_id = 'ccwu-payment-qr'::text));
drop policy if exists "staff deletes payment QR images" on storage.objects;
create policy "staff deletes payment QR images" on storage.objects as permissive for delete to authenticated using (((bucket_id = 'ccwu-payment-qr'::text) AND is_staff()));
drop policy if exists "staff updates payment QR images" on storage.objects;
create policy "staff updates payment QR images" on storage.objects as permissive for update to authenticated using (((bucket_id = 'ccwu-payment-qr'::text) AND is_staff())) with check (((bucket_id = 'ccwu-payment-qr'::text) AND is_staff()));
drop policy if exists "staff uploads payment QR images" on storage.objects;
create policy "staff uploads payment QR images" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'ccwu-payment-qr'::text) AND is_staff()));
drop policy if exists vpn_configs_owner_read on public.vpn_access_configs;
drop policy if exists vpn_configs_owner_or_staff_read on public.vpn_access_configs;
drop policy if exists vpn_configs_staff_write on public.vpn_access_configs;
create policy vpn_configs_owner_or_staff_read on public.vpn_access_configs as permissive for select to authenticated using ((user_id = (select auth.uid())) or is_staff());
create policy vpn_configs_staff_write on public.vpn_access_configs as permissive for all to authenticated using (is_staff()) with check (is_staff());
commit;
