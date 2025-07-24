ALTER TABLE meeting_templates 
ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'visual';

UPDATE meeting_templates 
SET 
  fields = CASE
    WHEN title_template LIKE '%{date}%' THEN 
      jsonb_build_array(
        jsonb_build_object(
          'id', '1',
          'type', 'text',
          'value', regexp_replace(title_template, '\s*-?\s*\{[^}]+\}', '', 'g'),
          'label', 'Text'
        ),
        jsonb_build_object(
          'id', '2', 
          'type', 'date',
          'value', to_char(CURRENT_DATE, 'YYYY-MM-DD'),
          'label', 'Date'
        )
      )
    WHEN title_template LIKE '%{participant}%' THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', '1',
          'type', 'text', 
          'value', regexp_replace(title_template, '\s*-?\s*\{[^}]+\}', '', 'g'),
          'label', 'Text'
        ),
        jsonb_build_object(
          'id', '2',
          'type', 'person',
          'value', '',
          'label', 'Person',
          'placeholder', 'Enter person name...'
        )
      )
    ELSE
      jsonb_build_array(
        jsonb_build_object(
          'id', '1',
          'type', 'text',
          'value', title_template,
          'label', 'Text'
        )
      )
  END,
  template_type = 'visual'
WHERE template_type IS NULL;

CREATE OR REPLACE FUNCTION create_default_templates_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meeting_templates (user_id, name, title_template, description_template, is_default, fields, template_type)
  VALUES 
    (
      NEW.id, 
      'Weekly Standup', 
      'Weekly Standup - {date}', 
      'Weekly team sync and progress update', 
      true,
      '[{"id": "1", "type": "text", "value": "Weekly Standup", "label": "Text"}, {"id": "2", "type": "date", "value": "", "label": "Date"}]'::jsonb,
      'visual'
    ),
    (
      NEW.id, 
      '1-on-1', 
      '1-on-1 with {participant} - {date}', 
      'Regular check-in meeting', 
      false,
      '[{"id": "1", "type": "text", "value": "1-on-1 with", "label": "Text"}, {"id": "2", "type": "person", "value": "", "label": "Person", "placeholder": "Enter name..."}, {"id": "3", "type": "date", "value": "", "label": "Date"}]'::jsonb,
      'visual'
    ),
    (
      NEW.id, 
      'Client Meeting', 
      'Client Meeting: {project} - {date}', 
      'Client discussion and updates', 
      false,
      '[{"id": "1", "type": "text", "value": "Client Meeting:", "label": "Text"}, {"id": "2", "type": "project", "value": "", "label": "Project", "placeholder": "Project name..."}, {"id": "3", "type": "date", "value": "", "label": "Date"}]'::jsonb,
      'visual'
    ),
    (
      NEW.id, 
      'Project Review', 
      'Project Review: {project} - {date}', 
      'Project status and review', 
      false,
      '[{"id": "1", "type": "text", "value": "Project Review:", "label": "Text"}, {"id": "2", "type": "project", "value": "", "label": "Project", "placeholder": "Project name..."}, {"id": "3", "type": "date", "value": "", "label": "Date"}]'::jsonb,
      'visual'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;