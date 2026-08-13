export type Json = boolean | number | string | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          github_url: string | null;
          linkedin_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          github_url?: string | null;
          linkedin_url?: string | null;
          created_at?: string;
        };
        Update: {
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          github_url?: string | null;
          linkedin_url?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          tech_stack: string[];
          repo_url: string | null;
          demo_url: string | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description: string;
          tech_stack?: string[];
          repo_url?: string | null;
          demo_url?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          tech_stack?: string[];
          repo_url?: string | null;
          demo_url?: string | null;
          cover_image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_images: {
        Row: {
          id: string;
          project_id: string;
          image_url: string;
          position: number;
        };
        Insert: {
          id?: string;
          project_id: string;
          image_url: string;
          position: number;
        };
        Update: {
          image_url?: string;
          position?: number;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [];
      };
      learning_profiles: {
        Row: {
          user_id: string;
          goal: string | null;
          experience: string | null;
          language: string;
          xp: number;
          streak: number;
          hearts: number;
          completed_lessons: number[];
          started_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          goal?: string | null;
          experience?: string | null;
          language?: string;
          xp?: number;
          streak?: number;
          hearts?: number;
          completed_lessons?: number[];
          started_at?: string;
          updated_at?: string;
        };
        Update: {
          goal?: string | null;
          experience?: string | null;
          language?: string;
          xp?: number;
          streak?: number;
          hearts?: number;
          completed_lessons?: number[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
