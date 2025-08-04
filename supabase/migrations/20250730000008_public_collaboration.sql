ALTER TABLE public.meeting_notes 
  DROP CONSTRAINT IF EXISTS meeting_notes_unique;

ALTER TABLE public.meeting_notes
  ADD CONSTRAINT meeting_notes_unique UNIQUE (meeting_id, share_token);

DROP POLICY IF EXISTS "Public annotations read" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Public annotations create" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Public annotations update" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Public annotations delete" ON public.meeting_annotations;

DROP POLICY IF EXISTS "Public notes read" ON public.meeting_notes;
DROP POLICY IF EXISTS "Public notes upsert" ON public.meeting_notes;

DROP POLICY IF EXISTS "Public presence read" ON public.meeting_presence;
DROP POLICY IF EXISTS "Public presence upsert" ON public.meeting_presence;
DROP POLICY IF EXISTS "Public presence delete" ON public.meeting_presence;

CREATE POLICY "Public annotations read"
  ON public.meeting_annotations FOR SELECT
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND shared_meetings.meeting_id = meeting_annotations.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public annotations create"
  ON public.meeting_annotations FOR INSERT
  TO public
  WITH CHECK (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND shared_meetings.meeting_id = meeting_annotations.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public annotations update"
  ON public.meeting_annotations FOR UPDATE
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND shared_meetings.meeting_id = meeting_annotations.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public annotations delete"
  ON public.meeting_annotations FOR DELETE
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_annotations.share_token
      AND shared_meetings.meeting_id = meeting_annotations.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public notes read"
  ON public.meeting_notes FOR SELECT
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND shared_meetings.meeting_id = meeting_notes.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public notes upsert"
  ON public.meeting_notes FOR ALL
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND shared_meetings.meeting_id = meeting_notes.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  )
  WITH CHECK (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND shared_meetings.meeting_id = meeting_notes.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public presence read"
  ON public.meeting_presence FOR SELECT
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND shared_meetings.meeting_id = meeting_presence.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public presence upsert"
  ON public.meeting_presence FOR ALL
  TO public
  USING (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND shared_meetings.meeting_id = meeting_presence.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  )
  WITH CHECK (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_presence.share_token
      AND shared_meetings.meeting_id = meeting_presence.meeting_id
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

CREATE INDEX IF NOT EXISTS idx_annotations_session_id ON public.meeting_annotations ((user_info->>'sessionId'));
CREATE INDEX IF NOT EXISTS idx_presence_session_id ON public.meeting_presence ((user_info->>'sessionId'));
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_collaboration_data TO anon, authenticated;