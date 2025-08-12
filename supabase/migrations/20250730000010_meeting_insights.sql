CREATE TABLE public.meeting_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  speaker_metrics JSONB NOT NULL,
  sentiment JSONB NOT NULL,
  dynamics JSONB NOT NULL,
  key_moments JSONB DEFAULT '[]'::jsonb,
  engagement_score FLOAT CHECK (engagement_score >= 0 AND engagement_score <= 100),
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_meeting_insights_meeting_id ON public.meeting_insights(meeting_id);
CREATE INDEX idx_meeting_insights_engagement_score ON public.meeting_insights(engagement_score);

ALTER TABLE public.meeting_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for their meetings" ON public.meeting_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_insights.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage insights" ON public.meeting_insights
  FOR ALL USING (true);

ALTER TABLE public.meetings 
ADD COLUMN insights_generated BOOLEAN DEFAULT false;