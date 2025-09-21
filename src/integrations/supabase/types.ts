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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      daily_reports: {
        Row: {
          created_at: string
          id: number
          metrics: Json
          period_end: string | null
          period_start: string | null
          run_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          metrics: Json
          period_end?: string | null
          period_start?: string | null
          run_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          metrics?: Json
          period_end?: string | null
          period_start?: string | null
          run_at?: string
        }
        Relationships: []
      }
      daily_trick_tips: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          slot: number
          tip_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          slot: number
          tip_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          slot?: number
          tip_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthday: string | null
          camera_access_enabled: boolean | null
          created_at: string | null
          first_name: string | null
          focus: string | null
          free_uploads_exhausted: boolean | null
          gender: string | null
          id: string
          is_subscribed: boolean | null
          last_name: string | null
          learning_goals: string | null
          microphone_access_enabled: boolean | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          plan_name: string | null
          preferences_updated_at: string | null
          profile_image_url: string | null
          stance: string | null
          started_skating_year: number | null
          tone_pref: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birthday?: string | null
          camera_access_enabled?: boolean | null
          created_at?: string | null
          first_name?: string | null
          focus?: string | null
          free_uploads_exhausted?: boolean | null
          gender?: string | null
          id?: string
          is_subscribed?: boolean | null
          last_name?: string | null
          learning_goals?: string | null
          microphone_access_enabled?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          plan_name?: string | null
          preferences_updated_at?: string | null
          profile_image_url?: string | null
          stance?: string | null
          started_skating_year?: number | null
          tone_pref?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birthday?: string | null
          camera_access_enabled?: boolean | null
          created_at?: string | null
          first_name?: string | null
          focus?: string | null
          free_uploads_exhausted?: boolean | null
          gender?: string | null
          id?: string
          is_subscribed?: boolean | null
          last_name?: string | null
          learning_goals?: string | null
          microphone_access_enabled?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          plan_name?: string | null
          preferences_updated_at?: string | null
          profile_image_url?: string | null
          stance?: string | null
          started_skating_year?: number | null
          tone_pref?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_trick_tips: {
        Row: {
          created_at: string | null
          id: number
          is_pinned: boolean | null
          pinned_at: string | null
          saved_from: string | null
          tip: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_pinned?: boolean | null
          pinned_at?: string | null
          saved_from?: string | null
          tip: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_pinned?: boolean | null
          pinned_at?: string | null
          saved_from?: string | null
          tip?: Json
          user_id?: string
        }
        Relationships: []
      }
      trick_attempts: {
        Row: {
          analysis_data: Json | null
          coach_notes: string | null
          created_at: string
          deleted_at: string | null
          feedback: string | null
          id: string
          model_version: string | null
          processed_at: string | null
          status: string
          storage_path: string | null
          tags: string[] | null
          trick_name: string | null
          user_id: string
          video_path: string
        }
        Insert: {
          analysis_data?: Json | null
          coach_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          feedback?: string | null
          id?: string
          model_version?: string | null
          processed_at?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[] | null
          trick_name?: string | null
          user_id: string
          video_path: string
        }
        Update: {
          analysis_data?: Json | null
          coach_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          feedback?: string | null
          id?: string
          model_version?: string | null
          processed_at?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[] | null
          trick_name?: string | null
          user_id?: string
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "trick_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_tips: {
        Row: {
          generated_at: string
          id: number
          last_shown_at: string | null
          slot: number
          tip: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: never
          last_shown_at?: string | null
          slot: number
          tip: Json
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: never
          last_shown_at?: string | null
          slot?: number
          tip?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_subscribed: boolean
          name: string | null
          onboarding_completed: boolean | null
          plan_name: string | null
          stripe_customer_id: string | null
          subscribed_at: string | null
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean | null
          is_subscribed?: boolean
          name?: string | null
          onboarding_completed?: boolean | null
          plan_name?: string | null
          stripe_customer_id?: string | null
          subscribed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_subscribed?: boolean
          name?: string | null
          onboarding_completed?: boolean | null
          plan_name?: string | null
          stripe_customer_id?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      video_ai_responses: {
        Row: {
          ai_response: string
          created_at: string
          id: number
          metadata: Json | null
          tags: string[]
          user_id: string
          user_prompt: string
          video_id: number
        }
        Insert: {
          ai_response: string
          created_at?: string
          id?: never
          metadata?: Json | null
          tags: string[]
          user_id: string
          user_prompt: string
          video_id: number
        }
        Update: {
          ai_response?: string
          created_at?: string
          id?: never
          metadata?: Json | null
          tags?: string[]
          user_id?: string
          user_prompt?: string
          video_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      user_monthly_uploads: {
        Row: {
          uploads_this_month: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trick_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      call_reset_quotas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_daily_tips: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_daily_tips: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_description: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      delete_expired_trick_attempts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_monthly_trick_attempt_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_top_tricks_last_7_days: {
        Args: { limit_count?: number }
        Returns: {
          attempt_count: number
          trick_name: string
        }[]
      }
      get_upload_status_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          free_uploads_exhausted: boolean
          monthly_count: number
        }[]
      }
      get_user_plan: {
        Args: { user_id: string }
        Returns: {
          is_subscribed: boolean
          plan_name: string
        }[]
      }
      insert_trick_attempt: {
        Args:
          | { p_metadata?: Json; p_user_id: string; p_video_url: string }
          | { p_trick_id: number; p_video_url: string }
          | { trick_name: string; user_id: string; video_path: string }
        Returns: {
          id: number
        }[]
      }
      rotate_and_refill_daily_tips: {
        Args:
          | { p_seen_slots: number[]; p_user_id: string }
          | { p_user_id: string }
        Returns: {
          slot: number
          tip: Json
        }[]
      }
      save_trick_tip: {
        Args: { source?: string; tip_data: Json }
        Returns: undefined
      }
      toggle_tip_pin: {
        Args: { tip_id: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
