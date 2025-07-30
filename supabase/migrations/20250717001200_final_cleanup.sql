ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_presence ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE ON meeting_annotations TO anon;
GRANT INSERT, UPDATE, DELETE ON meeting_notes TO anon;
GRANT INSERT, UPDATE, DELETE ON meeting_presence TO anon;

GRANT EXECUTE ON FUNCTION public.access_shared_meeting TO anon;
GRANT EXECUTE ON FUNCTION public.is_valid_share_token TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_color TO anon;

CREATE INDEX IF NOT EXISTS idx_meetings_user_created ON meetings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_transcript_id ON meetings(transcript_id) WHERE transcript_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_meetings_created_by ON shared_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_annotations_created ON meeting_annotations(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON meeting_notes(updated_at);

CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM meeting_presence 
  WHERE last_seen < now() - interval '2 minutes';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW system_health_check AS
SELECT 
  'Tables' as component,
  COUNT(*) FILTER (WHERE table_name IN ('users', 'meetings', 'meeting_templates', 'shared_meetings', 'meeting_annotations', 'meeting_notes', 'meeting_presence')) as count,
  7 as expected
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 
  'RLS Policies' as component,
  COUNT(*) as count,
  -1 as expected
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Functions' as component,
  COUNT(*) FILTER (WHERE routine_name IN ('generate_share_token', 'cleanup_expired_shares', 'is_valid_share_token', 'access_shared_meeting', 'get_user_color')) as count,
  5 as expected
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
SELECT 
  'Storage Buckets' as component,
  COUNT(*) FILTER (WHERE id = 'meeting-recordings') as count,
  1 as expected
FROM storage.buckets;

SELECT * FROM system_health_check;