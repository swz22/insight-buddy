export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
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
          summary: MeetingSummary | null;
          action_items: ActionItem[] | null;
          participants: string[];
          duration: number | null;
          recorded_at: string | null;
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
          summary?: MeetingSummary | null;
          action_items?: ActionItem[] | null;
          participants?: string[];
          duration?: number | null;
          recorded_at?: string | null;
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
          summary?: MeetingSummary | null;
          action_items?: ActionItem[] | null;
          participants?: string[];
          duration?: number | null;
          recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
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
