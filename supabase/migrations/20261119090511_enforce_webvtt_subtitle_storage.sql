begin;
-- Native HTML video tracks consume WebVTT. SRT uploads are normalized to VTT in
-- the staff UI before storage; arbitrary TXT and raw SRT objects are not served.
update storage.buckets
set public = false,
    allowed_mime_types = array['text/vtt']::text[]
where id = 'ccwu-cinema-subtitles';
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'ccwu-cinema-subtitles'
      and public = false
      and allowed_mime_types = array['text/vtt']::text[]
  ) then
    raise exception 'CCWU_SUBTITLE_BUCKET_VTT_ONLY_NOT_APPLIED';
  end if;
end;
$$;
commit;
