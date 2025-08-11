export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          preferred_languages: string[];
          auto_translate: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          preferred_languages?: string[];
          auto_translate?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          preferred_languages?: string[];
          auto_translate?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          title_template: string;
          description_template: string | null;
          participants: string[];
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          title_template: string;
          description_template?: string | null;
          participants?: string[];
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          title_template?: string;
          description_template?: string | null;
          participants?: string[];
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          audio_url: string | null;
          transcript: string | null;
          transcript_id: string | null;
          summary: MeetingSummary | null;
          action_items: ActionItem[] | null;
          participants: string[];
          duration: number | null;
          recorded_at: string | null;
          language: string;
          translations: Record<string, TranslatedContent> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          audio_url?: string | null;
          transcript?: string | null;
          transcript_id?: string | null;
          summary?: MeetingSummary | null;
          action_items?: ActionItem[] | null;
          participants?: string[];
          duration?: number | null;
          recorded_at?: string | null;
          language?: string;
          translations?: Record<string, TranslatedContent> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          audio_url?: string | null;
          transcript?: string | null;
          transcript_id?: string | null;
          summary?: MeetingSummary | null;
          action_items?: ActionItem[] | null;
          participants?: string[];
          duration?: number | null;
          recorded_at?: string | null;
          language?: string;
          translations?: Record<string, TranslatedContent> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shared_meetings: {
        Row: {
          id: string;
          meeting_id: string;
          share_token: string;
          password: string | null;
          expires_at: string | null;
          created_by: string;
          created_at: string;
          last_accessed_at: string | null;
          access_count: number;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          share_token: string;
          password?: string | null;
          expires_at?: string | null;
          created_by: string;
          created_at?: string;
          last_accessed_at?: string | null;
          access_count?: number;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          share_token?: string;
          password?: string | null;
          expires_at?: string | null;
          created_by?: string;
          created_at?: string;
          last_accessed_at?: string | null;
          access_count?: number;
        };
      };
    };
  };
}

export interface MeetingSummary {
  overview: string;
  key_points: string[];
  decisions: string[];
  next_steps: string[];
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

export interface TranslatedContent {
  title: string;
  description?: string;
  transcript: string;
  summary?: MeetingSummary;
  translated_at: string;
  translator: "ai" | "human";
}
