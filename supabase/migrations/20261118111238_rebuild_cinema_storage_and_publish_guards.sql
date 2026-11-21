begin;
CREATE OR REPLACE FUNCTION private.cinema_storage_object_exists(p_bucket_id text, p_object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from storage.objects as o
    where o.bucket_id = p_bucket_id
      and o.name = p_object_name
  );
$function$;

CREATE OR REPLACE FUNCTION private.guard_cinema_drama_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status = 'published' then
    if new.title is null or char_length(btrim(new.title)) = 0 or char_length(new.title) > 180 then
      raise exception using errcode = '23514', message = 'CINEMA_DRAMA_TITLE_INVALID';
    end if;

    if new.slug is null or new.slug !~ '^[a-z0-9][a-z0-9_-]{0,119}$' then
      raise exception using errcode = '23514', message = 'CINEMA_DRAMA_SLUG_INVALID';
    end if;

    if new.poster_path is null
       or char_length(new.poster_path) > 500
       or new.poster_path !~ '^[A-Za-z0-9][A-Za-z0-9_./-]*$'
       or new.poster_path ~ '(^|/)\.\.(/|$)'
       or position(chr(92) in new.poster_path) > 0
       or new.poster_path ~ '[[:cntrl:]]'
       or not private.cinema_storage_object_exists('ccwu-cinema-posters', new.poster_path) then
      raise exception using errcode = '23514', message = 'CINEMA_POSTER_NOT_UPLOADED';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_cinema_episode_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  parent_status text;
begin
  if new.status = 'published' then
    if new.title is null or char_length(btrim(new.title)) = 0 or char_length(new.title) > 180 then
      raise exception using errcode = '23514', message = 'CINEMA_EPISODE_TITLE_INVALID';
    end if;

    if new.season_number is null or new.season_number < 1
       or new.episode_number is null or new.episode_number < 1 then
      raise exception using errcode = '23514', message = 'CINEMA_EPISODE_NUMBER_INVALID';
    end if;

    if new.duration_seconds is null or new.duration_seconds < 1 then
      raise exception using errcode = '23514', message = 'CINEMA_EPISODE_DURATION_REQUIRED';
    end if;

    if new.video_path is null
       or char_length(new.video_path) > 500
       or new.video_path !~ '^[A-Za-z0-9][A-Za-z0-9_./-]*$'
       or new.video_path ~ '(^|/)\.\.(/|$)'
       or position(chr(92) in new.video_path) > 0
       or new.video_path ~ '[[:cntrl:]]'
       or not private.cinema_storage_object_exists('ccwu-cinema-videos', new.video_path) then
      raise exception using errcode = '23514', message = 'CINEMA_VIDEO_NOT_UPLOADED';
    end if;

    select d.status into parent_status
    from public.dramas as d
    where d.id = new.drama_id;

    if parent_status is distinct from 'published' then
      raise exception using errcode = '23514', message = 'CINEMA_PARENT_DRAMA_NOT_PUBLISHED';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_cinema_subtitle_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.language_code is null
     or new.language_code !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
     or new.label is null
     or char_length(btrim(new.label)) = 0
     or char_length(new.label) > 80 then
    raise exception using errcode = '23514', message = 'CINEMA_SUBTITLE_METADATA_INVALID';
  end if;

  if new.storage_path is null
     or char_length(new.storage_path) > 500
     or new.storage_path !~ '^[A-Za-z0-9][A-Za-z0-9_./-]*$'
     or new.storage_path ~ '(^|/)\.\.(/|$)'
     or position(chr(92) in new.storage_path) > 0
     or new.storage_path ~ '[[:cntrl:]]'
     or not private.cinema_storage_object_exists('ccwu-cinema-subtitles', new.storage_path) then
    raise exception using errcode = '23514', message = 'CINEMA_SUBTITLE_NOT_UPLOADED';
  end if;

  return new;
end;
$function$;
revoke all on function private.cinema_storage_object_exists(text,text) from public,anon,authenticated,service_role;
revoke all on function private.guard_cinema_drama_publish() from public,anon,authenticated,service_role;
revoke all on function private.guard_cinema_episode_publish() from public,anon,authenticated,service_role;
revoke all on function private.guard_cinema_subtitle_asset() from public,anon,authenticated,service_role;
commit;
