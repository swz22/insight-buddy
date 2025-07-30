CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.meeting_templates 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_template_trigger
  BEFORE INSERT OR UPDATE ON public.meeting_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_template();

CREATE OR REPLACE FUNCTION public.create_default_templates_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.meeting_templates (user_id, name, title_template, description_template, is_default, fields, template_type)
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

CREATE TRIGGER create_default_templates_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_templates_for_user();

CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  done BOOLEAN DEFAULT FALSE;
BEGIN
  WHILE NOT done LOOP
    token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    IF NOT EXISTS (SELECT 1 FROM public.shared_meetings WHERE share_token = token) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM public.shared_meetings 
  WHERE expires_at IS NOT NULL 
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM public.meeting_presence 
  WHERE last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_color(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  colors TEXT[] := ARRAY['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16'];
  hash_value INT;
BEGIN
  hash_value := abs(hashtext(user_email));
  RETURN colors[(hash_value % array_length(colors, 1)) + 1];
END;
$$ LANGUAGE plpgsql;