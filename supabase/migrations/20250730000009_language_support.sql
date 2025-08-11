ALTER TABLE public.meetings 
ADD COLUMN language TEXT DEFAULT 'en',
ADD COLUMN translations JSONB;

ALTER TABLE public.users
ADD COLUMN preferred_languages TEXT[] DEFAULT ARRAY['en'],
ADD COLUMN auto_translate BOOLEAN DEFAULT false;

CREATE INDEX idx_meetings_language ON public.meetings(language);
CREATE INDEX idx_users_preferred_languages ON public.users USING GIN(preferred_languages);