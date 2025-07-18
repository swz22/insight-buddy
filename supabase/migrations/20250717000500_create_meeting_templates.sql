CREATE TABLE meeting_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title_template TEXT NOT NULL,
  description_template TEXT,
  participants TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON meeting_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates" ON meeting_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON meeting_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON meeting_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_meeting_templates_user_id ON meeting_templates(user_id);
CREATE INDEX idx_meeting_templates_is_default ON meeting_templates(user_id, is_default);

CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE meeting_templates 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_template_trigger
  BEFORE INSERT OR UPDATE ON meeting_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();

CREATE OR REPLACE FUNCTION create_default_templates_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meeting_templates (user_id, name, title_template, description_template, is_default)
  VALUES 
    (NEW.id, 'Weekly Standup', 'Weekly Standup - {date}', 'Weekly team sync and progress update', true),
    (NEW.id, '1-on-1', '1-on-1 with {participant} - {date}', 'Regular check-in meeting', false),
    (NEW.id, 'Client Meeting', 'Client Meeting: {project} - {date}', 'Client discussion and updates', false),
    (NEW.id, 'Brainstorming', 'Brainstorming Session: {topic} - {date}', 'Creative ideation and problem solving', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_templates_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_templates_for_user();