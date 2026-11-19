#!/usr/bin/env python3
"""Validate the staff media upload and explicit publish workflow."""
from pathlib import Path

html = Path("admin.html").read_text(encoding="utf-8")
admin = Path("admin-v2.0.1.js").read_text(encoding="utf-8")
playback = Path("supabase/functions/get-episode-playback/index.ts").read_text(encoding="utf-8")

required_html = (
    'id="dramaPosterFile"', 'id="videoFile"', 'id="episodeRows"',
    'id="subtitleForm"', 'id="subtitleEpisode"', 'id="subtitleFile"',
)
required_admin = (
    'new Upload(file', '"ccwu-cinema-posters"', '"ccwu-cinema-videos"',
    '"ccwu-cinema-subtitles"', 'data-toggle-drama=', 'data-toggle-episode=',
    'published_at:', 'status: "published"', 'reviewed_by: currentUser.id',
)
for token in required_html:
    if token not in html:
        raise SystemExit(f"Admin media UI is missing {token}")
for token in required_admin:
    if token not in admin:
        raise SystemExit(f"Admin media workflow is missing {token}")
if '.eq("status","published")' not in playback:
    raise SystemExit("Playback must not expose draft or review subtitle tracks.")
if "service_role" in admin:
    raise SystemExit("Admin frontend must not embed service credentials.")
print("Admin media upload, publish workflow, and published-subtitle access checks passed.")
