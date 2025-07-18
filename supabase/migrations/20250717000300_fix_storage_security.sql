UPDATE storage.buckets 
SET public = false 
WHERE id = 'meeting-recordings';

DROP POLICY IF EXISTS "Users can upload their own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;

CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'meeting-recordings' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view own recordings" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'meeting-recordings' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update own recordings" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'meeting-recordings' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own recordings" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'meeting-recordings' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
);