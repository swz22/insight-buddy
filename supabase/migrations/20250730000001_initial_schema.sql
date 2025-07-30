-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  transcript TEXT,
  transcript_id TEXT,
  summary JSONB,
  action_items JSONB,
  participants TEXT[] DEFAULT '{}',
  duration INT4,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create meeting_templates table
CREATE TABLE public.meeting_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title_template TEXT NOT NULL,
  description_template TEXT,
  participants TEXT[] DEFAULT '{}',
  fields JSONB DEFAULT '[]'::jsonb,
  template_type TEXT DEFAULT 'visual',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create shared_meetings table
CREATE TABLE public.shared_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  password TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0 NOT NULL
);

-- Create meeting_annotations table
CREATE TABLE public.meeting_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT REFERENCES public.shared_meetings(share_token) ON DELETE CASCADE,
  user_info JSONB NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('highlight', 'comment', 'note')),
  content TEXT NOT NULL,
  position JSONB,
  parent_id UUID REFERENCES public.meeting_annotations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create meeting_notes table
CREATE TABLE public.meeting_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT REFERENCES public.shared_meetings(share_token) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  last_edited_by JSONB,
  version INT DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create meeting_presence table
CREATE TABLE public.meeting_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT REFERENCES public.shared_meetings(share_token) ON DELETE CASCADE,
  user_info JSONB NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'typing')),
  cursor_position JSONB,
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_meetings_user_created ON public.meetings(user_id, created_at DESC);
CREATE INDEX idx_meetings_transcript_id ON public.meetings(transcript_id) WHERE transcript_id IS NOT NULL;
CREATE INDEX idx_templates_user_id ON public.meeting_templates(user_id);
CREATE INDEX idx_templates_is_default ON public.meeting_templates(user_id, is_default);
CREATE INDEX idx_shared_meetings_share_token ON public.shared_meetings(share_token);
CREATE INDEX idx_shared_meetings_meeting_id ON public.shared_meetings(meeting_id);
CREATE INDEX idx_shared_meetings_expires_at ON public.shared_meetings(expires_at);
CREATE INDEX idx_annotations_meeting_share ON public.meeting_annotations(meeting_id, share_token);
CREATE INDEX idx_annotations_type ON public.meeting_annotations(type);
CREATE INDEX idx_notes_meeting_share ON public.meeting_notes(meeting_id, share_token);
CREATE INDEX idx_presence_meeting_share ON public.meeting_presence(meeting_id, share_token);
CREATE INDEX idx_presence_last_seen ON public.meeting_presence(last_seen);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_presence ENABLE ROW LEVEL SECURITY;