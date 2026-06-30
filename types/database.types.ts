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
      application_comments: {
        Row: {
          application_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          metadata: Json | null
        }
        Insert: {
          application_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
        }
        Update: {
          application_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "application_comments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_contracts: {
        Row: {
          application_id: string
          created_at: string
          external_link: string | null
          id: string
          kind: string
          note: string | null
          sent_at: string | null
          sign_method: string | null
          signed_at: string | null
          signed_doc_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          external_link?: string | null
          id?: string
          kind: string
          note?: string | null
          sent_at?: string | null
          sign_method?: string | null
          signed_at?: string | null
          signed_doc_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          external_link?: string | null
          id?: string
          kind?: string
          note?: string | null
          sent_at?: string | null
          sign_method?: string | null
          signed_at?: string | null
          signed_doc_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          activated_at: string | null
          approved_at: string | null
          archived_at: string | null
          assigned_reviewer_id: string | null
          company_id: string
          created_at: string
          id: string
          product_id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          transfer_recipient_email: string | null
          transfer_sent_at: string | null
          transfer_status: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          approved_at?: string | null
          archived_at?: string | null
          assigned_reviewer_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          transfer_recipient_email?: string | null
          transfer_sent_at?: string | null
          transfer_status?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          approved_at?: string | null
          archived_at?: string | null
          assigned_reviewer_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          transfer_recipient_email?: string | null
          transfer_sent_at?: string | null
          transfer_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_assigned_reviewer_id_fkey"
            columns: ["assigned_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          assigned_agent_id: string | null
          contact_email: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_invited_at: string | null
          lead_product_code: string | null
          legal_name: string
          operator_email: string | null
          operator_name: string | null
          person_type: string | null
          phone: string | null
          status: Database["public"]["Enums"]["company_status"]
          tax_address: Json | null
          tax_id: string | null
          tax_regime: string | null
          terminal_type: string | null
          terms_accepted_at: string | null
          terms_accepted_by: string | null
          terms_version: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_invited_at?: string | null
          lead_product_code?: string | null
          legal_name: string
          operator_email?: string | null
          operator_name?: string | null
          person_type?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          tax_address?: Json | null
          tax_id?: string | null
          tax_regime?: string | null
          terminal_type?: string | null
          terms_accepted_at?: string | null
          terms_accepted_by?: string | null
          terms_version?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_invited_at?: string | null
          lead_product_code?: string | null
          legal_name?: string
          operator_email?: string | null
          operator_name?: string | null
          person_type?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          tax_address?: Json | null
          tax_id?: string | null
          tax_regime?: string | null
          terminal_type?: string | null
          terms_accepted_at?: string | null
          terms_accepted_by?: string | null
          terms_version?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_terms_accepted_by_fkey"
            columns: ["terms_accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          role_in_company: Database["public"]["Enums"]["company_user_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role_in_company: Database["public"]["Enums"]["company_user_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role_in_company?: Database["public"]["Enums"]["company_user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          code: string
          created_at: string
          cross_validation_fields: Json | null
          description: string | null
          field_type: string
          file_format: string
          id: string
          instructions: string | null
          is_form: boolean
          is_required: boolean
          is_signature_required: boolean
          max_age_days: number | null
          max_size_mb: number
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          cross_validation_fields?: Json | null
          description?: string | null
          field_type?: string
          file_format?: string
          id?: string
          instructions?: string | null
          is_form?: boolean
          is_required?: boolean
          is_signature_required?: boolean
          max_age_days?: number | null
          max_size_mb?: number
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          cross_validation_fields?: Json | null
          description?: string | null
          field_type?: string
          file_format?: string
          id?: string
          instructions?: string | null
          is_form?: boolean
          is_required?: boolean
          is_signature_required?: boolean
          max_age_days?: number | null
          max_size_mb?: number
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          application_id: string
          check_note: string | null
          created_at: string
          cross_validation_status: Database["public"]["Enums"]["cross_validation_status"]
          file_name: string | null
          file_size: number | null
          id: string
          is_checked: boolean
          mime_type: string | null
          rejection_reasons: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string | null
          template_id: string | null
          title: string | null
          updated_at: string
          uploaded_at: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          application_id: string
          check_note?: string | null
          created_at?: string
          cross_validation_status?: Database["public"]["Enums"]["cross_validation_status"]
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_checked?: boolean
          mime_type?: string | null
          rejection_reasons?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          application_id?: string
          check_note?: string | null
          created_at?: string
          cross_validation_status?: Database["public"]["Enums"]["cross_validation_status"]
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_checked?: boolean
          mime_type?: string | null
          rejection_reasons?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          application_id: string
          created_at: string
          document_id: string | null
          form_data: Json
          generated_pdf_path: string | null
          id: string
          signed_pdf_path: string | null
          submitted_at: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          document_id?: string | null
          form_data: Json
          generated_pdf_path?: string | null
          id?: string
          signed_pdf_path?: string | null
          submitted_at?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          document_id?: string | null
          form_data?: Json
          generated_pdf_path?: string | null
          id?: string
          signed_pdf_path?: string | null
          submitted_at?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          recipient_id: string
          related_application_id: string | null
          related_document_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          recipient_id: string
          related_application_id?: string | null
          related_document_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          recipient_id?: string
          related_application_id?: string | null
          related_document_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      product_orders: {
        Row: {
          application_id: string | null
          company_id: string
          created_at: string
          id: string
          invoice_path: string | null
          notes: string | null
          product_code: string
          quantity: number
          shipping_address: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          invoice_path?: string | null
          notes?: string | null
          product_code: string
          quantity?: number
          shipping_address: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_path?: string | null
          notes?: string | null
          product_code?: string
          quantity?: number
          shipping_address?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          internal_reviewer_email: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          internal_reviewer_email?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          internal_reviewer_email?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      company_has_product: {
        Args: { product_code: string; target_company_id: string }
        Returns: boolean
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_assigned_agent: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { roles: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
    }
    Enums: {
      application_status:
        | "draft"
        | "documents_pending"
        | "in_compliance_review"
        | "changes_requested"
        | "approved_compliance"
        | "in_provider_review"
        | "provider_changes_requested"
        | "approved_provider"
        | "contracts_pending"
        | "contracts_signed"
        | "activation_pending"
        | "activated"
        | "rejected"
        | "archived"
      company_status: "lead" | "active" | "archived" | "rejected"
      company_user_role:
        | "legal_representative"
        | "operator"
        | "beneficial_owner"
        | "collaborator"
      cross_validation_status:
        | "pending"
        | "matches"
        | "mismatch"
        | "not_applicable"
      document_status:
        | "pending_upload"
        | "pending_review"
        | "approved"
        | "rejected"
        | "changes_requested"
      user_role:
        | "client"
        | "sales_agent"
        | "sales_director"
        | "compliance"
        | "onboarding"
        | "accounting"
        | "super_admin"
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
      application_status: [
        "draft",
        "documents_pending",
        "in_compliance_review",
        "changes_requested",
        "approved_compliance",
        "in_provider_review",
        "provider_changes_requested",
        "approved_provider",
        "contracts_pending",
        "contracts_signed",
        "activation_pending",
        "activated",
        "rejected",
        "archived",
      ],
      company_status: ["lead", "active", "archived", "rejected"],
      company_user_role: [
        "legal_representative",
        "operator",
        "beneficial_owner",
        "collaborator",
      ],
      cross_validation_status: [
        "pending",
        "matches",
        "mismatch",
        "not_applicable",
      ],
      document_status: [
        "pending_upload",
        "pending_review",
        "approved",
        "rejected",
        "changes_requested",
      ],
      user_role: [
        "client",
        "sales_agent",
        "sales_director",
        "compliance",
        "onboarding",
        "accounting",
        "super_admin",
      ],
    },
  },
} as const
