ALTER TABLE public.meeting_notes 
  DROP CONSTRAINT IF EXISTS meeting_notes_unique;

ALTER TABLE public.meeting_notes
  ADD CONSTRAINT meeting_notes_meeting_share_unique 
  UNIQUE (meeting_id, share_token);

CREATE OR REPLACE FUNCTION increment_notes_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.version = COALESCE(OLD.version, 0) + 1;
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_notes_version_trigger ON public.meeting_notes;

CREATE TRIGGER increment_notes_version_trigger
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION increment_notes_version();

CREATE INDEX IF NOT EXISTS idx_notes_meeting_share 
  ON public.meeting_notes(meeting_id, share_token);

DROP POLICY IF EXISTS "Public notes read" ON public.meeting_notes;
DROP POLICY IF EXISTS "Public notes upsert" ON public.meeting_notes;

CREATE POLICY "Public can read notes with valid share token"
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

CREATE POLICY "Public can insert notes with valid share token"
  ON public.meeting_notes FOR INSERT
  TO public
  WITH CHECK (
    share_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE shared_meetings.share_token = meeting_notes.share_token
      AND shared_meetings.meeting_id = meeting_notes.meeting_id
      AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
    )
  );

CREATE POLICY "Public can update notes with valid share token"
  ON public.meeting_notes FOR UPDATE
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

GRANT SELECT, INSERT, UPDATE ON public.meeting_notes TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;