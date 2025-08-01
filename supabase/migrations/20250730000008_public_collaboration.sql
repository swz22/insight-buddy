DROP POLICY IF EXISTS "Anyone can view annotations for shared meetings" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Public can create annotations for shared meetings" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Anyone can update annotations for shared meetings" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Anyone can delete annotations for shared meetings" ON public.meeting_annotations;

DROP POLICY IF EXISTS "Anyone can view notes for shared meetings" ON public.meeting_notes;
DROP POLICY IF EXISTS "Public can create notes for shared meetings" ON public.meeting_notes;
DROP POLICY IF EXISTS "Public can update notes for shared meetings" ON public.meeting_notes;

DROP POLICY IF EXISTS "Anyone can view presence for shared meetings" ON public.meeting_presence;
DROP POLICY IF EXISTS "Anyone can create presence for shared meetings" ON public.meeting_presence;
DROP POLICY IF EXISTS "Anyone can update presence for shared meetings" ON public.meeting_presence;
DROP POLICY IF EXISTS "Anyone can delete presence for shared meetings" ON public.meeting_presence;

CREATE POLICY "Public can view annotations for valid shares" ON public.meeting_annotations
  FOR SELECT USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can create annotations for valid shares" ON public.meeting_annotations
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can update own annotations" ON public.meeting_annotations
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
    AND user_info->>'sessionId' IS NOT NULL
  );

CREATE POLICY "Public can delete own annotations" ON public.meeting_annotations
  FOR DELETE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
    AND user_info->>'sessionId' IS NOT NULL
  );

CREATE POLICY "Public can view notes for valid shares" ON public.meeting_notes
  FOR SELECT USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can create notes for valid shares" ON public.meeting_notes
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can update notes for valid shares" ON public.meeting_notes
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  ) WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can view presence for valid shares" ON public.meeting_presence
  FOR SELECT USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can create presence for valid shares" ON public.meeting_presence
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can update presence for valid shares" ON public.meeting_presence
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can delete presence for valid shares" ON public.meeting_presence
  FOR DELETE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

ALTER TABLE public.meeting_annotations 
  ALTER COLUMN user_info SET DEFAULT jsonb_build_object(
    'name', 'Anonymous',
    'color', '#666666',
    'sessionId', ''
  );

ALTER TABLE public.meeting_notes 
  ALTER COLUMN last_edited_by SET DEFAULT jsonb_build_object(
    'name', 'Anonymous', 
    'color', '#666666',
    'sessionId', ''
  );

ALTER TABLE public.meeting_presence 
  ALTER COLUMN user_info SET DEFAULT jsonb_build_object(
    'name', 'Anonymous',
    'color', '#666666', 
    'sessionId', ''
  );

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_collaboration_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.meeting_annotations
  WHERE share_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shared_meetings
    WHERE shared_meetings.share_token = meeting_annotations.share_token
    AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
  );

  DELETE FROM public.meeting_notes
  WHERE share_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shared_meetings
    WHERE shared_meetings.share_token = meeting_notes.share_token
    AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
  );

  DELETE FROM public.meeting_presence
  WHERE share_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shared_meetings
    WHERE shared_meetings.share_token = meeting_presence.share_token
    AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_annotations_session_id ON public.meeting_annotations ((user_info->>'sessionId'));
CREATE INDEX idx_presence_session_id ON public.meeting_presence ((user_info->>'sessionId'));

GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_collaboration_data TO anon, authenticated;