export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          code: string
          name: string
          logo_url: string | null
          admin_email: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          logo_url?: string | null
          admin_email: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          logo_url?: string | null
          admin_email?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string
          username: string
          full_name: string
          role: 'admin' | 'editor' | 'reader'
          avatar_url: string | null
          email: string | null
          job_title: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
        }
        Insert: {
          id: string
          organization_id: string
          username: string
          full_name: string
          role?: 'admin' | 'editor' | 'reader'
          avatar_url?: string | null
          email?: string | null
          job_title?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          username?: string
          full_name?: string
          role?: 'admin' | 'editor' | 'reader'
          avatar_url?: string | null
          email?: string | null
          job_title?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          color?: string
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string
          file_url: string
          file_type: string
          document_date: string
          category_id: string | null
          keywords: string[]
          ai_keywords: string[]
          ai_category_suggestion: string
          uploaded_by: string
          is_important: boolean
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string
          file_url: string
          file_type: string
          document_date?: string
          category_id?: string | null
          keywords?: string[]
          ai_keywords?: string[]
          ai_category_suggestion?: string
          uploaded_by: string
          is_important?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string
          file_url?: string
          file_type?: string
          document_date?: string
          category_id?: string | null
          keywords?: string[]
          ai_keywords?: string[]
          ai_category_suggestion?: string
          uploaded_by?: string
          is_important?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          action: string
          document_id: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          action: string
          document_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          action?: string
          document_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      user_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'admin' | 'editor' | 'reader'
          token: string
          full_name: string | null
          invited_by: string
          accepted_at: string | null
          expires_at: string
          personal_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: 'admin' | 'editor' | 'reader'
          token: string
          full_name?: string | null
          invited_by: string
          accepted_at?: string | null
          expires_at: string
          personal_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'admin' | 'editor' | 'reader'
          token?: string
          full_name?: string | null
          invited_by?: string
          accepted_at?: string | null
          expires_at?: string
          personal_message?: string | null
          created_at?: string
        }
      }
      deletion_requests: {
        Row: {
          id: string
          organization_id: string
          document_id: string
          requested_by: string
          reason: string
          status: 'pending' | 'approved' | 'rejected' | 'info_requested'
          votes_required: number
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          document_id: string
          requested_by: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'info_requested'
          votes_required?: number
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          document_id?: string
          requested_by?: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'info_requested'
          votes_required?: number
          created_at?: string
          resolved_at?: string | null
        }
      }
      deletion_votes: {
        Row: {
          id: string
          deletion_request_id: string
          voter_id: string
          vote: 'approve' | 'reject' | 'info_needed'
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deletion_request_id: string
          voter_id: string
          vote: 'approve' | 'reject' | 'info_needed'
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deletion_request_id?: string
          voter_id?: string
          vote?: 'approve' | 'reject' | 'info_needed'
          comment?: string | null
          created_at?: string
        }
      }
      secure_trash: {
        Row: {
          id: string
          organization_id: string
          document_id: string
          document_data: Json
          deletion_request_id: string | null
          deleted_by: string
          expires_at: string
          restored_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          document_id: string
          document_data: Json
          deletion_request_id?: string | null
          deleted_by: string
          expires_at?: string
          restored_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          document_id?: string
          document_data?: Json
          deletion_request_id?: string | null
          deleted_by?: string
          expires_at?: string
          restored_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'success' | 'deletion'
          is_read: boolean
          link_to: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          title: string
          message?: string
          type?: 'info' | 'warning' | 'success' | 'deletion'
          is_read?: boolean
          link_to?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'warning' | 'success' | 'deletion'
          is_read?: boolean
          link_to?: string
          created_at?: string
        }
      }
    }
  }
}
