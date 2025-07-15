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
          summary: any | null;
          action_items: any | null;
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
          summary?: any | null;
          action_items?: any | null;
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
          summary?: any | null;
          action_items?: any | null;
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