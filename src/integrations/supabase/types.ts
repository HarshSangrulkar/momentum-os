export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          energy: string | null
          id: string
          log_date: string
          mood: string | null
          note: string | null
          productivity_rating: number | null
          sleep_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy?: string | null
          id?: string
          log_date: string
          mood?: string | null
          note?: string | null
          productivity_rating?: number | null
          sleep_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy?: string | null
          id?: string
          log_date?: string
          mood?: string | null
          note?: string | null
          productivity_rating?: number | null
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      experiment_logs: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          log_date: string
          metrics: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          log_date: string
          metrics?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          log_date?: string
          metrics?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_logs_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          conclusion: string | null
          conclusion_data: Json | null
          created_at: string
          end_date: string
          hypothesis: string | null
          id: string
          start_date: string
          status: string
          title: string
          tracked_metrics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          conclusion?: string | null
          conclusion_data?: Json | null
          created_at?: string
          end_date: string
          hypothesis?: string | null
          id?: string
          start_date: string
          status?: string
          title: string
          tracked_metrics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          conclusion?: string | null
          conclusion_data?: Json | null
          created_at?: string
          end_date?: string
          hypothesis?: string | null
          id?: string
          start_date?: string
          status?: string
          title?: string
          tracked_metrics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          auto_generated: boolean
          created_at: string
          due_date: string | null
          goal_id: string
          id: string
          linked_task_id: string | null
          order_index: number
          parent_id: string | null
          period: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generated?: boolean
          created_at?: string
          due_date?: string | null
          goal_id: string
          id?: string
          linked_task_id?: string | null
          order_index?: number
          parent_id?: string | null
          period: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generated?: boolean
          created_at?: string
          due_date?: string | null
          goal_id?: string
          id?: string
          linked_task_id?: string | null
          order_index?: number
          parent_id?: string | null
          period?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "long_term_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_milestones_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_milestones_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goal_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          body: string | null
          confidence: string | null
          data: Json | null
          dismissed: boolean
          generated_at: string
          id: string
          kind: string
          period_end: string | null
          period_start: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          confidence?: string | null
          data?: Json | null
          dismissed?: boolean
          generated_at?: string
          id?: string
          kind: string
          period_end?: string | null
          period_start?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          confidence?: string | null
          data?: Json | null
          dismissed?: boolean
          generated_at?: string
          id?: string
          kind?: string
          period_end?: string | null
          period_start?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      long_term_goals: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          target_date: string | null
          target_metric: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_date?: string | null
          target_metric?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_date?: string | null
          target_metric?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "long_term_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          quiet_end: string | null
          quiet_start: string | null
          smart_nudges: boolean
          updated_at: string
          user_id: string
          weekly_report: boolean
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          smart_nudges?: boolean
          updated_at?: string
          user_id: string
          weekly_report?: boolean
        }
        Update: {
          created_at?: string
          enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          smart_nudges?: boolean
          updated_at?: string
          user_id?: string
          weekly_report?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          focus_areas: string[] | null
          full_name: string | null
          gender: string | null
          height_cm: number | null
          id: string
          location: string | null
          motivation: string | null
          occupation: string | null
          sleep_time: string | null
          timezone: string | null
          updated_at: string
          wake_time: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          focus_areas?: string[] | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          location?: string | null
          motivation?: string | null
          occupation?: string | null
          sleep_time?: string | null
          timezone?: string | null
          updated_at?: string
          wake_time?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          focus_areas?: string[] | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          location?: string | null
          motivation?: string | null
          occupation?: string | null
          sleep_time?: string | null
          timezone?: string | null
          updated_at?: string
          wake_time?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          data: Json
          id: string
          period: string
          period_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          period: string
          period_start: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          period?: string
          period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      task_logs: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          log_date: string
          notes: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          log_date: string
          notes?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived: boolean
          category_id: string | null
          created_at: string
          days_of_week: number[] | null
          end_time: string | null
          frequency: Database["public"]["Enums"]["task_frequency"]
          id: string
          one_off_date: string | null
          start_time: string | null
          title: string
          user_id: string
          weightage: number
        }
        Insert: {
          archived?: boolean
          category_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          end_time?: string | null
          frequency?: Database["public"]["Enums"]["task_frequency"]
          id?: string
          one_off_date?: string | null
          start_time?: string | null
          title: string
          user_id: string
          weightage?: number
        }
        Update: {
          archived?: boolean
          category_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          end_time?: string | null
          frequency?: Database["public"]["Enums"]["task_frequency"]
          id?: string
          one_off_date?: string | null
          start_time?: string | null
          title?: string
          user_id?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      task_frequency: "daily" | "weekly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_frequency: ["daily", "weekly"],
    },
  },
} as const
