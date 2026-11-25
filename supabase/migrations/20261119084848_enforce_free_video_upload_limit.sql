-- Enforce the Supabase Free per-file upload ceiling at the Storage bucket layer,
-- not only in the browser uploader. Keep video objects private.
begin;
update storage.buckets
set file_size_limit = 52428800
where id = 'ccwu-cinema-videos'
  and public = false;
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'ccwu-cinema-videos'
      and public = false
      and file_size_limit = 52428800
  ) then
    raise exception 'CCWU_VIDEO_BUCKET_LIMIT_NOT_APPLIED';
  end if;
end;
$$;
commit;
