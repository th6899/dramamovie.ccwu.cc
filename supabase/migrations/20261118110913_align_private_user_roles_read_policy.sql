begin;
create policy "user_roles_select_own" on private.user_roles as permissive for select to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
commit;
