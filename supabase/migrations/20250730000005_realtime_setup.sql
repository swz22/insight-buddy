ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_insights;

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE ON public.meeting_annotations TO anon;
GRANT INSERT, UPDATE, DELETE ON public.meeting_notes TO anon;
GRANT INSERT, UPDATE, DELETE ON public.meeting_presence TO anon;

GRANT EXECUTE ON FUNCTION public.generate_share_token TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_color TO anon;