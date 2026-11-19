-- Split broad admin policies by command so authenticated SELECT checks are not duplicated.
DROP POLICY IF EXISTS "admin manage homepage sections" ON public.homepage_sections;
DROP POLICY IF EXISTS "public read enabled homepage sections" ON public.homepage_sections;

CREATE POLICY "homepage sections anon read enabled"
  ON public.homepage_sections
  FOR SELECT TO anon
  USING (is_enabled);

CREATE POLICY "homepage sections authenticated read enabled or admin"
  ON public.homepage_sections
  FOR SELECT TO authenticated
  USING (is_enabled OR is_ccwu_admin());

CREATE POLICY "homepage sections admin insert"
  ON public.homepage_sections
  FOR INSERT TO authenticated
  WITH CHECK (is_ccwu_admin());

CREATE POLICY "homepage sections admin update"
  ON public.homepage_sections
  FOR UPDATE TO authenticated
  USING (is_ccwu_admin())
  WITH CHECK (is_ccwu_admin());

CREATE POLICY "homepage sections admin delete"
  ON public.homepage_sections
  FOR DELETE TO authenticated
  USING (is_ccwu_admin());

-- Staff access is already included in the owner-or-staff SELECT policy.
-- Restrict the former ALL policy to writes only to avoid duplicate SELECT evaluation.
DROP POLICY IF EXISTS "vpn_configs_staff_write" ON public.vpn_access_configs;

CREATE POLICY "vpn configs staff insert"
  ON public.vpn_access_configs
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

CREATE POLICY "vpn configs staff update"
  ON public.vpn_access_configs
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

CREATE POLICY "vpn configs staff delete"
  ON public.vpn_access_configs
  FOR DELETE TO authenticated
  USING (is_staff());
