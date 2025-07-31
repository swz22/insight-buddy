DROP POLICY IF EXISTS "Anyone can create notes for shared meetings" ON public.meeting_notes;
DROP POLICY IF EXISTS "Anyone can update notes for shared meetings" ON public.meeting_notes;

CREATE POLICY "Public can create notes for shared meetings" ON public.meeting_notes
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
    )
  );

CREATE POLICY "Public can update notes for shared meetings" ON public.meeting_notes
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
    )
  ) WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
    )
  );

DROP POLICY IF EXISTS "Anyone can create annotations for shared meetings" ON public.meeting_annotations;

CREATE POLICY "Public can create annotations for shared meetings" ON public.meeting_annotations
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
    )
  );

GRANT ALL ON public.meeting_notes TO anon;
GRANT ALL ON public.meeting_annotations TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

CREATE OR REPLACE FUNCTION public.is_valid_share_token(token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shared_meetings 
    WHERE share_token = token
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_valid_share_token TO anon;