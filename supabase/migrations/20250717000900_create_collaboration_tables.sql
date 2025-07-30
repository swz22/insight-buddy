CREATE TABLE meeting_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT REFERENCES shared_meetings(share_token) ON DELETE CASCADE,
  user_info JSONB NOT NULL, -- {name, email, avatar_url, color}
  type TEXT NOT NULL CHECK (type IN ('highlight', 'comment', 'note')),
  content TEXT NOT NULL,
  position JSONB, -- {start_line, end_line} for highlights, {line_number} for comments
  parent_id UUID REFERENCES meeting_annotations(id) ON DELETE CASCADE, -- For comment replies
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE meeting_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT REFERENCES shared_meetings(share_token) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  last_edited_by JSONB, -- {name, email, avatar_url}
  version INT DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE meeting_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT REFERENCES shared_meetings(share_token) ON DELETE CASCADE,
  user_info JSONB NOT NULL, -- {name, email, avatar_url, color}
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'typing')),
  cursor_position JSONB, -- {line_number, character}
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE meeting_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view annotations for shared meetings" ON meeting_annotations
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can create annotations for shared meetings" ON meeting_annotations
  FOR INSERT WITH CHECK (share_token IS NOT NULL);

CREATE POLICY "Users can update their own annotations" ON meeting_annotations
  FOR UPDATE USING (share_token IS NOT NULL);

CREATE POLICY "Users can delete their own annotations" ON meeting_annotations
  FOR DELETE USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can view notes for shared meetings" ON meeting_notes
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can update notes for shared meetings" ON meeting_notes
  FOR UPDATE USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can create notes for shared meetings" ON meeting_notes
  FOR INSERT WITH CHECK (share_token IS NOT NULL);

CREATE POLICY "Anyone can view presence for shared meetings" ON meeting_presence
  FOR ALL USING (share_token IS NOT NULL);

CREATE INDEX idx_annotations_meeting_share ON meeting_annotations(meeting_id, share_token);
CREATE INDEX idx_annotations_type ON meeting_annotations(type);
CREATE INDEX idx_notes_meeting_share ON meeting_notes(meeting_id, share_token);
CREATE INDEX idx_presence_meeting_share ON meeting_presence(meeting_id, share_token);
CREATE INDEX idx_presence_last_seen ON meeting_presence(last_seen);

CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM meeting_presence 
  WHERE last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_color(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  colors TEXT[] := ARRAY['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16'];
  hash_value INT;
BEGIN
  hash_value := abs(hashtext(user_email));
  RETURN colors[(hash_value % array_length(colors, 1)) + 1];
END;
$$ LANGUAGE plpgsql;