begin;
CREATE TRIGGER cinema_drama_publish_guard BEFORE INSERT OR UPDATE ON dramas FOR EACH ROW EXECUTE FUNCTION private.guard_cinema_drama_publish();
CREATE TRIGGER cinema_episode_publish_guard BEFORE INSERT OR UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION private.guard_cinema_episode_publish();
CREATE TRIGGER cinema_subtitle_asset_guard BEFORE INSERT OR UPDATE ON subtitle_tracks FOR EACH ROW EXECUTE FUNCTION private.guard_cinema_subtitle_asset();
commit;
