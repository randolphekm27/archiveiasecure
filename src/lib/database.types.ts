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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          document_id: string | null
          id: string
          ip_address: string | null
          organization_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          organization_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          organization_id: string
          reason: string
          requested_by: string
          resolved_at: string | null
          status: string
          votes_required: number
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          organization_id: string
          reason?: string
          requested_by: string
          resolved_at?: string | null
          status?: string
          votes_required?: number
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          organization_id?: string
          reason?: string
          requested_by?: string
          resolved_at?: string | null
          status?: string
          votes_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_votes: {
        Row: {
          comment: string | null
          created_at: string | null
          deletion_request_id: string
          id: string
          vote: string
          voter_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          deletion_request_id: string
          id?: string
          vote: string
          voter_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          deletion_request_id?: string
          id?: string
          vote?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_votes_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "deletion_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_category_suggestion: string | null
          ai_keywords: string[] | null
          category_id: string | null
          created_at: string | null
          description: string | null
          document_date: string | null
          file_type: string
          file_url: string
          id: string
          is_important: boolean | null
          keywords: string[] | null
          organization_id: string
          title: string
          updated_at: string | null
          uploaded_by: string
          views_count: number | null
        }
        Insert: {
          ai_category_suggestion?: string | null
          ai_keywords?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          file_type: string
          file_url: string
          id?: string
          is_important?: boolean | null
          keywords?: string[] | null
          organization_id: string
          title: string
          updated_at?: string | null
          uploaded_by: string
          views_count?: number | null
        }
        Update: {
          ai_category_suggestion?: string | null
          ai_keywords?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          file_type?: string
          file_url?: string
          id?: string
          is_important?: boolean | null
          keywords?: string[] | null
          organization_id?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link_to: string | null
          message: string
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_to?: string | null
          message: string
          organization_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_to?: string | null
          message?: string
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          admin_email: string
          code: string
          created_at: string | null
          deletion_votes_required: number | null
          description: string | null
          favicon_url: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          admin_email: string
          code: string
          created_at?: string | null
          deletion_votes_required?: number | null
          description?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          admin_email?: string
          code?: string
          created_at?: string | null
          deletion_votes_required?: number | null
          description?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          website?: string | null
        }
        Relationships: []
      }
      secure_trash: {
        Row: {
          created_at: string | null
          deleted_by: string
          deletion_request_id: string | null
          document_data: Json
          document_id: string
          expires_at: string
          id: string
          organization_id: string
          restored_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_by: string
          deletion_request_id?: string | null
          document_data: Json
          document_id: string
          expires_at?: string
          id?: string
          organization_id: string
          restored_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_by?: string
          deletion_request_id?: string | null
          document_data?: Json
          document_id?: string
          expires_at?: string
          id?: string
          organization_id?: string
          restored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secure_trash_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_trash_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "deletion_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_trash_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          category_ids: string[] | null
          created_at: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          organization_id: string
          personal_message: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          category_ids?: string[] | null
          created_at?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          invited_by: string
          organization_id: string
          personal_message?: string | null
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          category_ids?: string[] | null
          created_at?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          organization_id?: string
          personal_message?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          category_ids: string[] | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_founder: boolean | null
          job_title: string | null
          last_login: string | null
          organization_id: string
          phone_extension: string | null
          role: string
          signature: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          category_ids?: string[] | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          is_founder?: boolean | null
          job_title?: string | null
          last_login?: string | null
          organization_id: string
          phone_extension?: string | null
          role?: string
          signature?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          category_ids?: string[] | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_founder?: boolean | null
          job_title?: string | null
          last_login?: string | null
          organization_id?: string
          phone_extension?: string | null
          role?: string
          signature?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_email_for_reset: {
        Args: { organization_code: string; real_email: string }
        Returns: string | null
      }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      restore_document: { Args: { trash_id: string }; Returns: string }
      verify_user_and_org: {
        Args: { organization_code: string; user_email: string }
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
