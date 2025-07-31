DROP POLICY IF EXISTS "Anyone can view annotations for shared meetings" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Anyone can create annotations for shared meetings" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Anyone can update annotations for shared meetings" ON public.meeting_annotations;
DROP POLICY IF EXISTS "Anyone can delete annotations for shared meetings" ON public.meeting_annotations;

CREATE POLICY "Anyone can view annotations for shared meetings" ON public.meeting_annotations
  FOR SELECT USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
    )
  );

CREATE POLICY "Anyone can create annotations for shared meetings" ON public.meeting_annotations
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
    )
  );

CREATE POLICY "Anyone can update annotations for shared meetings" ON public.meeting_annotations
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
    )
  );

CREATE POLICY "Anyone can delete annotations for shared meetings" ON public.meeting_annotations
  FOR DELETE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_annotations.share_token
    )
  );

-- Update RLS policies for meeting_notes
DROP POLICY IF EXISTS "Anyone can view notes for shared meetings" ON public.meeting_notes;
DROP POLICY IF EXISTS "Anyone can create notes for shared meetings" ON public.meeting_notes;
DROP POLICY IF EXISTS "Anyone can update notes for shared meetings" ON public.meeting_notes;

CREATE POLICY "Anyone can view notes for shared meetings" ON public.meeting_notes
  FOR SELECT USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
    )
  );

CREATE POLICY "Anyone can create notes for shared meetings" ON public.meeting_notes
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
    )
  );

CREATE POLICY "Anyone can update notes for shared meetings" ON public.meeting_notes
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_notes.share_token
    )
  );

-- Update RLS policies for meeting_presence
DROP POLICY IF EXISTS "Anyone can manage presence for shared meetings" ON public.meeting_presence;

CREATE POLICY "Anyone can view presence for shared meetings" ON public.meeting_presence
  FOR SELECT USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
    )
  );

CREATE POLICY "Anyone can create presence for shared meetings" ON public.meeting_presence
  FOR INSERT WITH CHECK (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
    )
  );

CREATE POLICY "Anyone can update presence for shared meetings" ON public.meeting_presence
  FOR UPDATE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
    )
  );

CREATE POLICY "Anyone can delete presence for shared meetings" ON public.meeting_presence
  FOR DELETE USING (
    share_token IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.shared_meetings 
      WHERE shared_meetings.share_token = meeting_presence.share_token
    )
  );

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_annotations TO anon;
GRANT SELECT, INSERT, UPDATE ON public.meeting_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_presence TO anon;
GRANT SELECT ON public.shared_meetings TO anon;
GRANT SELECT ON public.meetings TO anon;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

CREATE INDEX IF NOT EXISTS idx_annotations_share_token ON public.meeting_annotations(share_token);
CREATE INDEX IF NOT EXISTS idx_notes_share_token ON public.meeting_notes(share_token);
CREATE INDEX IF NOT EXISTS idx_presence_share_token ON public.meeting_presence(share_token);