INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings', 
  true,
  524288000,
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

CREATE POLICY "Users can upload their own recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'meeting-recordings');

CREATE POLICY "Users can delete their own recordings" ON storage.objects
  FOR DELETE USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);