BEGIN;
DROP POLICY IF EXISTS ccwu_cinema_staff_read_private_media ON storage.objects;
CREATE POLICY ccwu_cinema_staff_read_private_media ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('ccwu-cinema-videos','ccwu-cinema-subtitles') AND EXISTS (
 SELECT 1 FROM private.user_roles r WHERE r.user_id=(SELECT auth.uid()) AND r.role IN ('admin','editor')
));
DROP POLICY IF EXISTS ccwu_cinema_staff_upload_media ON storage.objects;
CREATE POLICY ccwu_cinema_staff_upload_media ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('ccwu-cinema-posters','ccwu-cinema-videos','ccwu-cinema-subtitles') AND EXISTS (
 SELECT 1 FROM private.user_roles r WHERE r.user_id=(SELECT auth.uid()) AND r.role IN ('admin','editor')
));
COMMIT;
