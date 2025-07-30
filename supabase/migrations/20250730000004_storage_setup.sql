INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings', 
  false,
  524288000, -- 500MB
  ARRAY[
    'audio/mpeg',
    'audio/mp3', 
    'audio/wav',
    'audio/x-wav',
    'audio/m4a',
    'audio/x-m4a',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
);

-- Storage policies
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