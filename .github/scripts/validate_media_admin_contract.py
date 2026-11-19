#!/usr/bin/env python3
"""Validate the staff media upload and explicit publish workflow."""
from pathlib import Path

html = Path("admin.html").read_text(encoding="utf-8")
admin = Path("admin-v2.0.1.js").read_text(encoding="utf-8")
app = Path("app.js").read_text(encoding="utf-8")
playback = Path("supabase/functions/get-episode-playback/index.ts").read_text(encoding="utf-8")
subtitle_bucket = Path("supabase/migrations/20261119090511_enforce_webvtt_subtitle_storage.sql").read_text(encoding="utf-8")

required_html = (
    'id="dramaPosterFile"', 'id="videoFile"', 'id="episodeRows"',
    'id="subtitleForm"', 'id="subtitleEpisode"', 'id="subtitleFile"', '最大 50MB', 'SRT 自动转换为 WebVTT'
)
required_admin = (
    'new Upload(file', 'file.size > 50 * 1024 * 1024', '"ccwu-cinema-posters"', '"ccwu-cinema-videos"',
    '"ccwu-cinema-subtitles"', 'new Blob([webVttText + "\\n"], { type: "text/vtt" })', 'contentType: "text/vtt"', 'WEBVTT', 'cuePattern.test(rawText)', 'ext === "srt"', 'data-toggle-drama=', 'data-toggle-episode=',
    'published_at:', 'status: "published"', 'reviewed_by: currentUser.id',
)
for token in required_html:
    if token not in html:
        raise SystemExit(f"Admin media UI is missing {token}")
for token in required_admin:
    if token not in admin:
        raise SystemExit(f"Admin media workflow is missing {token}")
if "allowed_mime_types = array['text/vtt']::text[]" not in subtitle_bucket or "public = false" not in subtitle_bucket:
    raise SystemExit("Subtitle Storage bucket must be private and accept only WebVTT objects.")
if '.eq("status","published")' not in playback:
    raise SystemExit("Playback must not expose draft or review subtitle tracks.")
if 'db.storage.from("ccwu-cinema-posters").getPublicUrl(raw)' not in app:
    raise SystemExit("Public portal must resolve stored poster object paths to public Storage URLs.")
if "id=\"dramaPoster\"" in html:
    raise SystemExit("Drama poster input must upload to Storage rather than store an external URL.")
if "service_role" in admin:
    raise SystemExit("Admin frontend must not embed service credentials.")
print("Admin media upload, publish workflow, and published-subtitle access checks passed.")
