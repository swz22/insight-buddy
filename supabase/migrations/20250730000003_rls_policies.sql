-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Meetings table policies
CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings" ON public.meetings
  FOR DELETE USING (auth.uid() = user_id);

-- Meeting templates policies
CREATE POLICY "Users can view own templates" ON public.meeting_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates" ON public.meeting_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.meeting_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.meeting_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Shared meetings policies
CREATE POLICY "Users can view shares for their meetings" ON public.shared_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = shared_meetings.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their meetings" ON public.shared_meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = shared_meetings.meeting_id 
      AND meetings.user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete shares for their meetings" ON public.shared_meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = shared_meetings.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

-- Meeting annotations policies
CREATE POLICY "Anyone can view annotations for shared meetings" ON public.meeting_annotations
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can create annotations for shared meetings" ON public.meeting_annotations
  FOR INSERT WITH CHECK (share_token IS NOT NULL);

CREATE POLICY "Anyone can update annotations for shared meetings" ON public.meeting_annotations
  FOR UPDATE USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can delete annotations for shared meetings" ON public.meeting_annotations
  FOR DELETE USING (share_token IS NOT NULL);

-- Meeting notes policies
CREATE POLICY "Anyone can view notes for shared meetings" ON public.meeting_notes
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can create notes for shared meetings" ON public.meeting_notes
  FOR INSERT WITH CHECK (share_token IS NOT NULL);

CREATE POLICY "Anyone can update notes for shared meetings" ON public.meeting_notes
  FOR UPDATE USING (share_token IS NOT NULL);

-- Meeting presence policies
CREATE POLICY "Anyone can manage presence for shared meetings" ON public.meeting_presence
  FOR ALL USING (share_token IS NOT NULL);