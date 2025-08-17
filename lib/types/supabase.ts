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
  priority: "high" | "medium" | "low";
  completed: boolean;
  context?: string;
}

export interface TranslatedContent {
  title: string;
  description: string | null;
  transcript: string | null;
  summary: MeetingSummary | null;
}

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
      meeting_insights: {
        Row: {
          id: string;
          meeting_id: string;
          speaker_metrics: any;
          sentiment: any;
          dynamics: any;
          key_moments: any;
          engagement_score: number | null;
          generated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          speaker_metrics: any;
          sentiment: any;
          dynamics: any;
          key_moments?: any;
          engagement_score?: number | null;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          speaker_metrics?: any;
          sentiment?: any;
          dynamics?: any;
          key_moments?: any;
          engagement_score?: number | null;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_annotations: {
        Row: {
          id: string;
          meeting_id: string;
          share_token: string | null;
          user_info: any;
          type: "highlight" | "comment" | "note";
          content: string;
          position: any | null;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          share_token?: string | null;
          user_info: any;
          type: "highlight" | "comment" | "note";
          content: string;
          position?: any | null;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          share_token?: string | null;
          user_info?: any;
          type?: "highlight" | "comment" | "note";
          content?: string;
          position?: any | null;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_notes: {
        Row: {
          id: string;
          meeting_id: string;
          share_token: string | null;
          content: string;
          last_edited_by: any | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          share_token?: string | null;
          content?: string;
          last_edited_by?: any | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          share_token?: string | null;
          content?: string;
          last_edited_by?: any | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_presence: {
        Row: {
          id: string;
          meeting_id: string;
          share_token: string | null;
          user_info: any;
          status: string;
          cursor_position: any | null;
          last_seen: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          share_token?: string | null;
          user_info: any;
          status?: string;
          cursor_position?: any | null;
          last_seen?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          share_token?: string | null;
          user_info?: any;
          status?: string;
          cursor_position?: any | null;
          last_seen?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
