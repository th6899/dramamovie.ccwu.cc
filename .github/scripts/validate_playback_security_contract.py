#!/usr/bin/env python3
"""Static security contracts for private episode playback and media storage."""
from pathlib import Path

playback = Path("supabase/functions/get-episode-playback/index.ts").read_text(encoding="utf-8")
admin = Path("admin-v2.0.1.js").read_text(encoding="utf-8")
storage = Path("supabase/migrations/20261118121527_restrict_cinema_storage_staff_to_admin_editor.sql").read_text(encoding="utf-8")
free_limit = Path("supabase/migrations/20261119084848_enforce_free_video_upload_limit.sql").read_text(encoding="utf-8")

checks = {
    "validates bearer JWT with Supabase Auth": 'admin.auth.getUser(token)' in playback,
    "does not treat anon key as authenticated user": 'candidateToken!==anon' in playback,
    "only serves published episodes": 'episode.status!=="published"' in playback,
    "only serves episodes under published dramas": 'drama.status!=="published"' in playback,
    "checks active membership start time": '.lte("starts_at",now)' in playback,
    "checks membership expiry": '.gt("ends_at",now)' in playback,
    "does not reserve capped ads when event signing is unavailable": playback.indexOf('if(eventSecret.length>=32&&candidateConfigIds.length)') < playback.indexOf('admin.rpc("get_eligible_video_ad_config_ids"'),
    "signs private video URLs": '.from("ccwu-cinema-videos").createSignedUrl(' in playback,
    "signs private subtitle URLs": '.from("ccwu-cinema-subtitles").createSignedUrl(' in playback,
    "rejects unsafe object paths": 'const safePath=' in playback and 'part===".."' in playback,
    "only exposes published subtitle tracks": '.eq("status","published")' in playback,
    "staff upload restricted to admin/editor": "r.role IN ('admin','editor')" in storage,
    "private media read restricted to admin/editor": "FOR SELECT TO authenticated" in storage and "ccwu-cinema-videos','ccwu-cinema-subtitles" in storage,
    "video uploader enforces free per-file limit": 'file.size > 50 * 1024 * 1024' in admin,
    "Storage bucket enforces 50 MB server-side limit": "file_size_limit = 52428800" in free_limit and "public = false" in free_limit,
}
failed = [name for name, passed in checks.items() if not passed]
for name, passed in checks.items():
    print(f'{"PASS" if passed else "FAIL"}: {name}')
if failed:
    raise SystemExit("Playback/storage security contract failed: " + "; ".join(failed))
print(f"All {len(checks)} playback and storage security contracts passed.")
