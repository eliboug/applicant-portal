export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      application_documents: {
        Row: {
          application_id: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          uploaded_at: string
        }
        Insert: {
          application_id: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_at: string
          changed_by: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          application_id: string
          changed_at?: string
          changed_by: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          application_id?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          academic_background: Json | null
          applying_for_financial_aid: boolean | null
          class_year: string | null
          country: string | null
          created_at: string
          current_status: string
          date_of_birth: string | null
          decision: string | null
          essays: Json | null
          financial_circumstances_overview: string | null
          financial_documentation_consent: string | null
          first_name: string | null
          gpa: string | null
          high_school: string | null
          id: string
          last_name: string | null
          payment_certification: string | null
          payment_verified: boolean
          payment_verified_at: string | null
          payment_verified_by: string | null
          personal_info: Json | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_background?: Json | null
          applying_for_financial_aid?: boolean | null
          class_year?: string | null
          country?: string | null
          created_at?: string
          current_status?: string
          date_of_birth?: string | null
          decision?: string | null
          essays?: Json | null
          financial_circumstances_overview?: string | null
          financial_documentation_consent?: string | null
          first_name?: string | null
          gpa?: string | null
          high_school?: string | null
          id?: string
          last_name?: string | null
          payment_certification?: string | null
          payment_verified?: boolean
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          personal_info?: Json | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_background?: Json | null
          applying_for_financial_aid?: boolean | null
          class_year?: string | null
          country?: string | null
          created_at?: string
          current_status?: string
          date_of_birth?: string | null
          decision?: string | null
          essays?: Json | null
          financial_circumstances_overview?: string | null
          financial_documentation_consent?: string | null
          first_name?: string | null
          gpa?: string | null
          high_school?: string | null
          id?: string
          last_name?: string | null
          payment_certification?: string | null
          payment_verified?: boolean
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          personal_info?: Json | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      reviewer_assignments: {
        Row: {
          application_id: string
          assigned_at: string
          id: string
          reviewer_id: string
        }
        Insert: {
          application_id: string
          assigned_at?: string
          id?: string
          reviewer_id: string
        }
        Update: {
          application_id?: string
          assigned_at?: string
          id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_assignments_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type aliases for convenience
export type UserRole = 'applicant' | 'reviewer' | 'admin';

export type ApplicationStatus = 
  | 'draft'
  | 'submitted' 
  | 'payment_received' 
  | 'in_review' 
  | 'decision_released';

export type Decision = 'accepted' | 'rejected';

export type DocumentType = 'application' | 'transcript';

export type ClassYear = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Application = Database['public']['Tables']['applications']['Row'];
export type ApplicationDocument = Database['public']['Tables']['application_documents']['Row'];
export type ApplicationStatusHistory = Database['public']['Tables']['application_status_history']['Row'];
export type ReviewerAssignment = Database['public']['Tables']['reviewer_assignments']['Row'];
