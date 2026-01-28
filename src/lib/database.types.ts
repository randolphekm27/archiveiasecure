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
          created_at: string
        }
        Insert: {
          id: string
          organization_id: string
          username: string
          full_name: string
          role?: 'admin' | 'editor' | 'reader'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          username?: string
          full_name?: string
          role?: 'admin' | 'editor' | 'reader'
          avatar_url?: string | null
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
          file_url: string
          file_type: string
          document_date: string
          category_id: string | null
          keywords: string[]
          uploaded_by: string
          is_important: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          file_url: string
          file_type: string
          document_date?: string
          category_id?: string | null
          keywords?: string[]
          uploaded_by: string
          is_important?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          file_url?: string
          file_type?: string
          document_date?: string
          category_id?: string | null
          keywords?: string[]
          uploaded_by?: string
          is_important?: boolean
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
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          action: string
          document_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          action?: string
          document_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
    }
  }
}
