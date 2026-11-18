begin;
do $$ declare r record; begin for r in select tablename,policyname from pg_policies where schemaname='public' and tablename = any (array['ai_tool_catalog','crypto_wallet_addresses','dramas','episode_promotions','episodes','manual_payment_settings','manual_payment_submissions','membership_plans','membership_subscriptions','payment_methods','profiles','refund_requests','service_catalog','service_orders','subtitle_tracks','tutorials','user_notifications','video_ad_configs','vpn_device_bindings','vpn_plans','vpn_subscriptions']) loop execute format('drop policy %I on public.%I',r.policyname,r.tablename); end loop; end $$;
create policy "ai_tool_catalog_read_active_or_staff on public."ai_tool_catalog as PERMISSIVE for SELECT to anon, authenticated using (((is_active = true) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "ai_tool_catalog_staff_insert on public."ai_tool_catalog as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "ai_tool_catalog_staff_update on public."ai_tool_catalog as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "crypto_wallet_addresses_admin_delete on public."crypto_wallet_addresses as PERMISSIVE for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "crypto_wallet_addresses_admin_insert on public."crypto_wallet_addresses as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "crypto_wallet_addresses_admin_update on public."crypto_wallet_addresses as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "crypto_wallet_addresses_authenticated_read_active_or_admin on public."crypto_wallet_addresses as PERMISSIVE for SELECT to authenticated using (((is_active = true) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))));
create policy "crypto_wallet_addresses_public_read_active on public."crypto_wallet_addresses as PERMISSIVE for SELECT to anon using ((is_active = true));
create policy "dramas_read_published_anon on public."dramas as PERMISSIVE for SELECT to anon using ((status = 'published'::text));
create policy "dramas_read_published_or_staff on public."dramas as PERMISSIVE for SELECT to authenticated using (((status = 'published'::text) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "dramas_staff_delete on public."dramas as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "dramas_staff_insert on public."dramas as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "dramas_staff_update on public."dramas as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episode_promotions_staff_delete on public."episode_promotions as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episode_promotions_staff_insert on public."episode_promotions as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episode_promotions_staff_read on public."episode_promotions as PERMISSIVE for SELECT to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episode_promotions_staff_update on public."episode_promotions as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episodes_read_published_anon on public."episodes as PERMISSIVE for SELECT to anon using (((status = 'published'::text) AND (is_free = true) AND (EXISTS ( SELECT 1
   FROM dramas d
  WHERE ((d.id = episodes.drama_id) AND (d.status = 'published'::text))))));
create policy "episodes_read_published_or_staff on public."episodes as PERMISSIVE for SELECT to authenticated using ((((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM dramas d
  WHERE ((d.id = episodes.drama_id) AND (d.status = 'published'::text)))) AND ((is_free = true) OR ( SELECT has_active_membership() AS has_active_membership))) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "episodes_staff_delete on public."episodes as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episodes_staff_insert on public."episodes as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "episodes_staff_update on public."episodes as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "manual_payment_settings_admin_delete on public."manual_payment_settings as PERMISSIVE for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "manual_payment_settings_admin_insert on public."manual_payment_settings as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "manual_payment_settings_admin_update on public."manual_payment_settings as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "manual_payment_settings_read_enabled_anon on public."manual_payment_settings as PERMISSIVE for SELECT to anon using (((alipay_enabled = true) OR (wechat_enabled = true)));
create policy "manual_payment_settings_read_enabled_or_admin on public."manual_payment_settings as PERMISSIVE for SELECT to authenticated using (((alipay_enabled = true) OR (wechat_enabled = true) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))));
create policy "customers submit own manual payment details on public."manual_payment_submissions as PERMISSIVE for INSERT to authenticated with check (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'submitted'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (EXISTS ( SELECT 1
   FROM service_orders o
  WHERE ((o.id = manual_payment_submissions.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'pending'::text))))));
create policy "customers_read_own_or_admin_support_manual_submissions on public."manual_payment_submissions as PERMISSIVE for SELECT to authenticated using (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = ANY (ARRAY['admin'::text, 'support'::text])))))));
create policy "membership_plans_read_active_anon on public."membership_plans as PERMISSIVE for SELECT to anon using (is_active);
create policy "membership_plans_read_active_or_staff on public."membership_plans as PERMISSIVE for SELECT to authenticated using (((is_active = true) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "membership_plans_staff_delete on public."membership_plans as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "membership_plans_staff_insert on public."membership_plans as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "membership_plans_staff_update on public."membership_plans as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "membership_subscriptions_admin_delete on public."membership_subscriptions as PERMISSIVE for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "membership_subscriptions_admin_insert on public."membership_subscriptions as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "membership_subscriptions_admin_update on public."membership_subscriptions as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "membership_subscriptions_read_own_or_admin_support on public."membership_subscriptions as PERMISSIVE for SELECT to authenticated using (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = ANY (ARRAY['admin'::text, 'support'::text])))))));
create policy "payment_methods_admin_delete on public."payment_methods as PERMISSIVE for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "payment_methods_admin_insert on public."payment_methods as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "payment_methods_admin_update on public."payment_methods as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "payment_methods_read_enabled_anon on public."payment_methods as PERMISSIVE for SELECT to anon using ((is_enabled = true));
create policy "payment_methods_read_enabled_or_admin on public."payment_methods as PERMISSIVE for SELECT to authenticated using (((is_enabled = true) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))));
create policy "profiles_select_own on public."profiles as PERMISSIVE for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = id));
create policy "profiles_update_own on public."profiles as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));
create policy "refunds_insert_own_or_staff on public."refund_requests as PERMISSIVE for INSERT to authenticated with check ((((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM service_orders o
  WHERE ((o.id = refund_requests.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid)))))) OR ( SELECT private.is_staff() AS is_staff)));
create policy "refunds_read_own_or_staff on public."refund_requests as PERMISSIVE for SELECT to authenticated using (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT private.is_staff() AS is_staff)));
create policy "refunds_staff_delete on public."refund_requests as PERMISSIVE for DELETE to authenticated using (( SELECT private.is_staff() AS is_staff));
create policy "refunds_staff_update on public."refund_requests as PERMISSIVE for UPDATE to authenticated using (( SELECT private.is_staff() AS is_staff)) with check (( SELECT private.is_staff() AS is_staff));
create policy "catalog_read_published_anon on public."service_catalog as PERMISSIVE for SELECT to anon using ((is_published = true));
create policy "catalog_read_published_or_staff on public."service_catalog as PERMISSIVE for SELECT to authenticated using (((is_published = true) OR ( SELECT private.is_staff() AS is_staff)));
create policy "catalog_staff_delete on public."service_catalog as PERMISSIVE for DELETE to authenticated using (( SELECT private.is_staff() AS is_staff));
create policy "catalog_staff_insert on public."service_catalog as PERMISSIVE for INSERT to authenticated with check (( SELECT private.is_staff() AS is_staff));
create policy "catalog_staff_update on public."service_catalog as PERMISSIVE for UPDATE to authenticated using (( SELECT private.is_staff() AS is_staff)) with check (( SELECT private.is_staff() AS is_staff));
create policy "orders_read_own_or_admin_support on public."service_orders as PERMISSIVE for SELECT to authenticated using (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = ANY (ARRAY['admin'::text, 'support'::text])))))));
create policy "orders_staff_delete on public."service_orders as PERMISSIVE for DELETE to authenticated using (( SELECT private.is_staff() AS is_staff));
create policy "orders_staff_insert on public."service_orders as PERMISSIVE for INSERT to authenticated with check (( SELECT private.is_staff() AS is_staff));
create policy "orders_staff_update on public."service_orders as PERMISSIVE for UPDATE to authenticated using (( SELECT private.is_staff() AS is_staff)) with check (( SELECT private.is_staff() AS is_staff));
create policy "subtitles_read_published_anon on public."subtitle_tracks as PERMISSIVE for SELECT to anon using ((EXISTS ( SELECT 1
   FROM (episodes e
     JOIN dramas d ON ((d.id = e.drama_id)))
  WHERE ((e.id = subtitle_tracks.episode_id) AND (e.status = 'published'::text) AND (d.status = 'published'::text) AND (e.is_free = true)))));
create policy "subtitles_read_published_or_staff on public."subtitle_tracks as PERMISSIVE for SELECT to authenticated using (((EXISTS ( SELECT 1
   FROM (episodes e
     JOIN dramas d ON ((d.id = e.drama_id)))
  WHERE ((e.id = subtitle_tracks.episode_id) AND (e.status = 'published'::text) AND (d.status = 'published'::text) AND ((e.is_free = true) OR ( SELECT has_active_membership() AS has_active_membership))))) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "subtitles_staff_delete on public."subtitle_tracks as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "subtitles_staff_insert on public."subtitle_tracks as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "subtitles_staff_update on public."subtitle_tracks as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "tutorials_read_published_anon on public."tutorials as PERMISSIVE for SELECT to anon using ((status = 'published'::text));
create policy "tutorials_read_published_or_staff on public."tutorials as PERMISSIVE for SELECT to authenticated using (((status = 'published'::text) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "tutorials_staff_delete on public."tutorials as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "tutorials_staff_insert on public."tutorials as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "tutorials_staff_update on public."tutorials as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "service_role_manage_notifications on public."user_notifications as PERMISSIVE for ALL to service_role using (true) with check (true);
create policy "users_mark_own_notifications_read on public."user_notifications as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users_read_own_notifications on public."user_notifications as PERMISSIVE for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "video_ad_configs_public_read_anon on public."video_ad_configs as PERMISSIVE for SELECT to anon using (((is_active = true) AND (ad_tag_url IS NOT NULL) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now())) AND ((episode_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (episodes e
     JOIN dramas d ON ((d.id = e.drama_id)))
  WHERE ((e.id = video_ad_configs.episode_id) AND (e.status = 'published'::text) AND (d.status = 'published'::text)))))));
create policy "video_ad_configs_read_auth on public."video_ad_configs as PERMISSIVE for SELECT to authenticated using ((((is_active = true) AND (ad_tag_url IS NOT NULL) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now())) AND ((episode_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (episodes e
     JOIN dramas d ON ((d.id = e.drama_id)))
  WHERE ((e.id = video_ad_configs.episode_id) AND (e.status = 'published'::text) AND (d.status = 'published'::text)))))) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))));
create policy "video_ad_configs_staff_delete on public."video_ad_configs as PERMISSIVE for DELETE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "video_ad_configs_staff_insert on public."video_ad_configs as PERMISSIVE for INSERT to authenticated with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "video_ad_configs_staff_update on public."video_ad_configs as PERMISSIVE for UPDATE to authenticated using ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text]))) with check ((COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'editor'::text])));
create policy "vpn_device_bindings_read_owner_or_staff on public."vpn_device_bindings as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR (COALESCE(( SELECT current_staff_role() AS current_staff_role), ''::text) = ANY (ARRAY['admin'::text, 'support'::text]))));
create policy "vpn_plans_read_active_anon on public."vpn_plans as PERMISSIVE for SELECT to anon using (is_active);
create policy "vpn_plans_read_active_or_staff on public."vpn_plans as PERMISSIVE for SELECT to authenticated using (((is_active = true) OR ( SELECT private.is_staff() AS is_staff)));
create policy "vpn_plans_staff_delete on public."vpn_plans as PERMISSIVE for DELETE to authenticated using (( SELECT private.is_staff() AS is_staff));
create policy "vpn_plans_staff_insert on public."vpn_plans as PERMISSIVE for INSERT to authenticated with check (( SELECT private.is_staff() AS is_staff));
create policy "vpn_plans_staff_update on public."vpn_plans as PERMISSIVE for UPDATE to authenticated using (( SELECT private.is_staff() AS is_staff)) with check (( SELECT private.is_staff() AS is_staff));
create policy "vpn_subscriptions_admin_delete on public."vpn_subscriptions as PERMISSIVE for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "vpn_subscriptions_admin_insert on public."vpn_subscriptions as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "vpn_subscriptions_admin_update on public."vpn_subscriptions as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = 'admin'::text)))));
create policy "vpn_subscriptions_read_own_or_admin_support on public."vpn_subscriptions as PERMISSIVE for SELECT to authenticated using (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM private.user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = ANY (ARRAY['admin'::text, 'support'::text])))))));
commit;