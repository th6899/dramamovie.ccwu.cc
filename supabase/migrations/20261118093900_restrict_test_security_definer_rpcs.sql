begin;

-- Trigger-only SECURITY DEFINER functions must not be exposed as RPC endpoints.
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function public.handle_new_ccwu_profile() from public, anon, authenticated, service_role;

-- Admin check is required by authenticated-only admin RLS policies, not by anon.
revoke all on function public.is_ccwu_admin() from public, anon;
grant execute on function public.is_ccwu_admin() to authenticated, service_role;

-- Public read policies should not call an admin SECURITY DEFINER helper.
-- Admin users retain unrestricted access through the separate authenticated admin policies.
drop policy if exists "public read published dramas" on public.dramas;
create policy "public read published dramas"
  on public.dramas for select to anon, authenticated
  using (status = 'published');

drop policy if exists "public read published episodes" on public.episodes;
create policy "public read published episodes"
  on public.episodes for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.dramas d
       where d.id = episodes.drama_id
         and d.status = 'published'
    )
  );

drop policy if exists "public read enabled homepage sections" on public.homepage_sections;
create policy "public read enabled homepage sections"
  on public.homepage_sections for select to anon, authenticated
  using (is_enabled);

drop policy if exists "public read enabled plans" on public.membership_plans;
create policy "public read enabled plans"
  on public.membership_plans for select to anon, authenticated
  using (is_enabled);

drop policy if exists "public read published subtitles" on public.subtitle_tracks;
create policy "public read published subtitles"
  on public.subtitle_tracks for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1
        from public.episodes e
        join public.dramas d on d.id = e.drama_id
       where e.id = subtitle_tracks.episode_id
         and e.status = 'published'
         and d.status = 'published'
    )
  );

commit;
