-- Create meeting_comments table
CREATE TABLE IF NOT EXISTS public.meeting_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.meeting_comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  selection_start INTEGER NOT NULL,
  selection_end INTEGER NOT NULL,
  selection_text TEXT NOT NULL,
  context_before TEXT,
  context_after TEXT,
  paragraph_id TEXT,
  speaker_name TEXT,
  user_name TEXT NOT NULL,
  user_color TEXT NOT NULL,
  user_avatar TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_meeting_comments_meeting_id ON public.meeting_comments(meeting_id);
CREATE INDEX idx_meeting_comments_user_id ON public.meeting_comments(user_id);
CREATE INDEX idx_meeting_comments_parent_id ON public.meeting_comments(parent_id);
CREATE INDEX idx_meeting_comments_created_at ON public.meeting_comments(created_at);

-- Enable RLS
ALTER TABLE public.meeting_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comments on their meetings"
  ON public.meeting_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_comments.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on their meetings"
  ON public.meeting_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_comments.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.meeting_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.meeting_comments FOR DELETE
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_meeting_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_meeting_comments_updated_at
  BEFORE UPDATE ON public.meeting_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meeting_comments_updated_at();