CREATE TABLE shared_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  password TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0 NOT NULL
);

ALTER TABLE shared_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares for their meetings" ON shared_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = shared_meetings.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their meetings" ON shared_meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = shared_meetings.meeting_id 
      AND meetings.user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete shares for their meetings" ON shared_meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = shared_meetings.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE INDEX idx_shared_meetings_share_token ON shared_meetings(share_token);
CREATE INDEX idx_shared_meetings_meeting_id ON shared_meetings(meeting_id);
CREATE INDEX idx_shared_meetings_expires_at ON shared_meetings(expires_at);

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  done BOOLEAN DEFAULT FALSE;
BEGIN
  WHILE NOT done LOOP
    token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    IF NOT EXISTS (SELECT 1 FROM shared_meetings WHERE share_token = token) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM shared_meetings 
  WHERE expires_at IS NOT NULL 
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;