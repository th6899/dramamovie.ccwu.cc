-- Harden the legacy auth profile trigger against search_path object shadowing.
-- All referenced relations are schema-qualified, so no ambient search path is needed.
ALTER FUNCTION public.handle_new_ccwu_profile()
  SET search_path = '';
