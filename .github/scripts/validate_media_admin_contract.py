from pathlib import Path
html=Path("admin.html").read_text(encoding="utf-8")
admin=Path("admin-v2.0.1.js").read_text(encoding="utf-8")
app=Path("app.js").read_text(encoding="utf-8")
playback=Path("supabase/functions/get-episode-playback/index.ts").read_text(encoding="utf-8")
required_html=('id="dramaTitle"','id="episodeNo"','id="episodeDescription"','id="videoFile"','id="episodeRows"','id="subtitleDrama"','id="subtitleEpisode"','id="subtitleLanguage"','id="subtitleLabel"','id="subtitleFile"')
required_admin=('new Upload(file','file.size > 50 * 1024 * 1024','"ccwu-cinema-videos"','"ccwu-cinema-subtitles"','new Blob([webVttText + "\\n"], { type: "text/vtt" })','contentType: "text/vtt"','WEBVTT','cuePattern.test(rawText)','ext === "srt"','data-toggle-drama=','data-toggle-episode=','description:desc||null')
for token in required_html:
 if token not in html: raise SystemExit("Missing simplified media UI field: "+token)
for token in required_admin:
 if token not in admin: raise SystemExit("Missing media upload workflow: "+token)
if 'id="promoForm"' in html or 'episode_promotions' in admin: raise SystemExit("Affiliate editor must be removed from admin UI.")
if 'ccwu-catalog-assets' not in admin: raise SystemExit("Catalog asset upload bucket is not wired.")
if '.eq("status","published")' not in playback: raise SystemExit("Playback must not expose draft subtitle tracks.")
if 'db.storage.from("ccwu-cinema-posters").getPublicUrl(raw)' not in app: raise SystemExit("Poster Storage URL handling missing.")
if "service_role" in admin: raise SystemExit("Service credentials found in browser code.")
print("Simplified media editor, subtitle upload, catalog assets and publish guards passed.")
