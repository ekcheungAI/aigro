export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_access: {
        Row: {
          app_role: string
          created_at: string
          expert_id: string | null
          member_class: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_role?: string
          created_at?: string
          expert_id?: string | null
          member_class?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_role?: string
          created_at?: string
          expert_id?: string | null
          member_class?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          expert_id: string | null
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          expert_id?: string | null
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          expert_id?: string | null
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          expert_id: string
          id: string
          kind: string
          note: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          expert_id: string
          id?: string
          kind: string
          note?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          expert_id?: string
          id?: string
          kind?: string
          note?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          expert_id: string
          id: string
          slot_minutes: number
          start_time: string
          timezone: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          expert_id: string
          id?: string
          slot_minutes?: number
          start_time: string
          timezone?: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          expert_id?: string
          id?: string
          slot_minutes?: number
          start_time?: string
          timezone?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          ends_at: string
          expert_id: string
          expert_note: string | null
          id: string
          meeting_url: string | null
          member_id: string
          member_note: string | null
          source_conversation_id: string | null
          source_question: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          expert_id: string
          expert_note?: string | null
          id?: string
          meeting_url?: string | null
          member_id: string
          member_note?: string | null
          source_conversation_id?: string | null
          source_question?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          expert_id?: string
          expert_note?: string | null
          id?: string
          meeting_url?: string | null
          member_id?: string
          member_note?: string | null
          source_conversation_id?: string | null
          source_question?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ip_rate_limits: {
        Row: {
          ip_hash: string
          request_count: number
          window_start: string
        }
        Insert: {
          ip_hash: string
          request_count?: number
          window_start: string
        }
        Update: {
          ip_hash?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      chat_rate_limits: {
        Row: {
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          request_count?: number
          user_id: string
          window_start: string
        }
        Update: {
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      chat_request_reservations: {
        Row: {
          conversation_id: string
          created_at: string
          evidence_bound_at: string | null
          evidence_snapshot: Json | null
          error_code: string | null
          expert_id: string
          id: string
          locked_until: string
          message_hash: string
          persona_version_id: string | null
          request_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          evidence_bound_at?: string | null
          evidence_snapshot?: Json | null
          error_code?: string | null
          expert_id: string
          id?: string
          locked_until?: string
          message_hash: string
          persona_version_id?: string | null
          request_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          evidence_bound_at?: string | null
          evidence_snapshot?: Json | null
          error_code?: string | null
          expert_id?: string
          id?: string
          locked_until?: string
          message_hash?: string
          persona_version_id?: string | null
          request_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_request_reservations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_request_reservations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_request_reservations_persona_version_id_fkey"
            columns: ["persona_version_id"]
            isOneToOne: false
            referencedRelation: "expert_persona_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          anon_id: string | null
          created_at: string | null
          expert_id: string | null
          id: string
          owner_id: string | null
          persona: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string | null
          expert_id?: string | null
          id?: string
          owner_id?: string | null
          persona?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string | null
          expert_id?: string | null
          id?: string
          owner_id?: string | null
          persona?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distillation_jobs: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string
          revision_id: string
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string
          revision_id: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string
          revision_id?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distillation_jobs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "knowledge_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          expert_id: string
          expires_at: string
          failure_reason: string | null
          id: string
          invited_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expert_id: string
          expires_at?: string
          failure_reason?: string | null
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expert_id?: string
          expires_at?: string
          failure_reason?: string | null
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_invitations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_knowledge: {
        Row: {
          content: string
          created_at: string | null
          expert_slug: string
          id: string
          kind: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          expert_slug: string
          id?: string
          kind?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          expert_slug?: string
          id?: string
          kind?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      expert_persona_versions: {
        Row: {
          approved_by: string | null
          boundaries: Json
          created_at: string
          created_by: string | null
          evidence_manifest: Json
          expert_id: string
          fidelity_report: Json
          fidelity_score: number | null
          fidelity_status: string
          greeting: string
          id: string
          persona_blueprint: Json
          published_at: string | null
          research_cutoff_at: string | null
          sample_dialogues: Json
          source_revision_ids: string[]
          status: string
          version: number
          voice_rules: Json
        }
        Insert: {
          approved_by?: string | null
          boundaries?: Json
          created_at?: string
          created_by?: string | null
          evidence_manifest?: Json
          expert_id: string
          fidelity_report?: Json
          fidelity_score?: number | null
          fidelity_status?: string
          greeting?: string
          id?: string
          persona_blueprint?: Json
          published_at?: string | null
          research_cutoff_at?: string | null
          sample_dialogues?: Json
          source_revision_ids?: string[]
          status?: string
          version: number
          voice_rules?: Json
        }
        Update: {
          approved_by?: string | null
          boundaries?: Json
          created_at?: string
          created_by?: string | null
          evidence_manifest?: Json
          expert_id?: string
          fidelity_report?: Json
          fidelity_score?: number | null
          fidelity_status?: string
          greeting?: string
          id?: string
          persona_blueprint?: Json
          published_at?: string | null
          research_cutoff_at?: string | null
          sample_dialogues?: Json
          source_revision_ids?: string[]
          status?: string
          version?: number
          voice_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "expert_persona_versions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_profiles: {
        Row: {
          bio: string | null
          featured_ids: string[] | null
          headline: string | null
          slug: string
          socials: Json | null
          stats: Json | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          featured_ids?: string[] | null
          headline?: string | null
          slug: string
          socials?: Json | null
          stats?: Json | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          featured_ids?: string[] | null
          headline?: string | null
          slug?: string
          socials?: Json | null
          stats?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      experts: {
        Row: {
          archived_at: string | null
          bio: string | null
          brand_color: string | null
          created_at: string
          credential: string | null
          display_name: string
          feature_flags: Json
          id: string
          name_en: string | null
          name_zh: string | null
          owner_user_id: string | null
          public_profile_enabled: boolean
          published_persona_version_id: string | null
          quote: string | null
          radar: Json
          slug: string
          specialties: string[]
          status: string
          title: string | null
          traits: string[]
          updated_at: string
          verified: boolean
        }
        Insert: {
          archived_at?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string
          credential?: string | null
          display_name: string
          feature_flags?: Json
          id?: string
          name_en?: string | null
          name_zh?: string | null
          owner_user_id?: string | null
          public_profile_enabled?: boolean
          published_persona_version_id?: string | null
          quote?: string | null
          radar?: Json
          slug: string
          specialties?: string[]
          status?: string
          title?: string | null
          traits?: string[]
          updated_at?: string
          verified?: boolean
        }
        Update: {
          archived_at?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string
          credential?: string | null
          display_name?: string
          feature_flags?: Json
          id?: string
          name_en?: string | null
          name_zh?: string | null
          owner_user_id?: string | null
          public_profile_enabled?: boolean
          published_persona_version_id?: string | null
          quote?: string | null
          radar?: Json
          slug?: string
          specialties?: string[]
          status?: string
          title?: string | null
          traits?: string[]
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "experts_published_persona_same_expert_fkey"
            columns: ["published_persona_version_id", "id"]
            isOneToOne: false
            referencedRelation: "expert_persona_versions"
            referencedColumns: ["id", "expert_id"]
          },
        ]
      }
      items: {
        Row: {
          category: string | null
          expert_slug: string | null
          fetched_at: string | null
          fingerprint: string | null
          id: string
          lang: string | null
          local_commentary: string | null
          original_url: string | null
          placement: string | null
          published_at: string | null
          score: number | null
          source_id: string | null
          status: string | null
          summary: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          category?: string | null
          expert_slug?: string | null
          fetched_at?: string | null
          fingerprint?: string | null
          id?: string
          lang?: string | null
          local_commentary?: string | null
          original_url?: string | null
          placement?: string | null
          published_at?: string | null
          score?: number | null
          source_id?: string | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          category?: string | null
          expert_slug?: string | null
          fetched_at?: string | null
          fingerprint?: string | null
          id?: string
          lang?: string | null
          local_commentary?: string | null
          original_url?: string | null
          placement?: string | null
          published_at?: string | null
          score?: number | null
          source_id?: string | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          auth_user_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          last_error_code: string | null
          last_sent_at: string | null
          member_class: string
          name: string
          personal_message: string | null
          provider_message_id: string | null
          send_count: number
          sent_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          last_error_code?: string | null
          last_sent_at?: string | null
          member_class?: string
          name: string
          personal_message?: string | null
          provider_message_id?: string | null
          send_count?: number
          sent_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          last_error_code?: string | null
          last_sent_at?: string | null
          member_class?: string
          name?: string
          personal_message?: string | null
          provider_message_id?: string | null
          send_count?: number
          sent_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          citation_meta: Json
          content: string
          created_at: string
          embedding: unknown
          expert_id: string
          id: string
          revision_id: string
          source_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          citation_meta?: Json
          content: string
          created_at?: string
          embedding?: unknown
          expert_id: string
          id?: string
          revision_id: string
          source_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          citation_meta?: Json
          content?: string
          created_at?: string
          embedding?: unknown
          expert_id?: string
          id?: string
          revision_id?: string
          source_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "knowledge_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_revision_source_fkey"
            columns: ["revision_id", "source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_revisions"
            referencedColumns: ["id", "source_id"]
          },
          {
            foreignKeyName: "knowledge_chunks_source_expert_fkey"
            columns: ["source_id", "expert_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id", "expert_id"]
          },
        ]
      }
      knowledge_gaps: {
        Row: {
          conversation_id: string | null
          created_at: string
          expert_id: string
          id: string
          message_id: string | null
          question: string
          resolved_at: string | null
          resolved_by_source_id: string | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          expert_id: string
          id?: string
          message_id?: string | null
          question: string
          resolved_at?: string | null
          resolved_by_source_id?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          expert_id?: string
          id?: string
          message_id?: string | null
          question?: string
          resolved_at?: string | null
          resolved_by_source_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_gaps_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_gaps_resolved_by_source_id_fkey"
            columns: ["resolved_by_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_revisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content_hash: string | null
          created_at: string
          created_by: string | null
          distilled_json: Json | null
          error_message: string | null
          extracted_text: string | null
          id: string
          provider_meta: Json
          raw_text: string | null
          revision_no: number
          source_id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          distilled_json?: Json | null
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          provider_meta?: Json
          raw_text?: string | null
          revision_no: number
          source_id: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          distilled_json?: Json | null
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          provider_meta?: Json
          raw_text?: string | null
          revision_no?: number
          source_id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_revisions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          expert_id: string
          id: string
          public_citation_review_note: string | null
          public_citation_reviewed_at: string | null
          public_citation_reviewed_by: string | null
          public_citation_url: string | null
          published_revision_id: string | null
          source_type: string
          source_url: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          expert_id: string
          id?: string
          public_citation_review_note?: string | null
          public_citation_reviewed_at?: string | null
          public_citation_reviewed_by?: string | null
          public_citation_url?: string | null
          published_revision_id?: string | null
          source_type: string
          source_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          expert_id?: string
          id?: string
          public_citation_review_note?: string | null
          public_citation_reviewed_at?: string | null
          public_citation_reviewed_by?: string | null
          public_citation_url?: string | null
          published_revision_id?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_sources_published_revision_same_source_fkey"
            columns: ["published_revision_id", "id"]
            isOneToOne: false
            referencedRelation: "knowledge_revisions"
            referencedColumns: ["id", "source_id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          conversation_id: string
          expert_id: string
          id: string
          included_in_legacy_crm_snapshot: boolean
          lead_id: string
          message_id: string
          occurred_at: string
          owner_id: string
          question: string
          score_delta: number
          signals: string[]
        }
        Insert: {
          conversation_id: string
          expert_id: string
          id?: string
          included_in_legacy_crm_snapshot?: boolean
          lead_id: string
          message_id: string
          occurred_at?: string
          owner_id: string
          question: string
          score_delta?: number
          signals?: string[]
        }
        Update: {
          conversation_id?: string
          expert_id?: string
          id?: string
          included_in_legacy_crm_snapshot?: boolean
          lead_id?: string
          message_id?: string
          occurred_at?: string
          owner_id?: string
          question?: string
          score_delta?: number
          signals?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_lead_expert_fkey"
            columns: ["lead_id", "expert_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "expert_id"]
          },
          {
            foreignKeyName: "lead_interactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          expert_id: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          expert_id: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          expert_id?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_expert_fkey"
            columns: ["lead_id", "expert_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "expert_id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          analysis: string | null
          anon_id: string | null
          contact_consented_at: string | null
          contact_email: string | null
          created_at: string | null
          email: string | null
          expert_id: string | null
          id: string
          last_activity_at: string | null
          last_message_id: string | null
          legacy_crm_captured_at: string | null
          legacy_questions_captured_at: string | null
          legacy_questions_snapshot: Json
          legacy_score_snapshot: number
          legacy_signals_snapshot: string[]
          next_follow_up_at: string | null
          owner_id: string | null
          owner_is_anonymous: boolean
          persona: string
          questions: Json | null
          score: number | null
          signals: string[] | null
          source_conversation_id: string | null
          stage: string | null
          timeline: Json | null
          user_id: string | null
        }
        Insert: {
          analysis?: string | null
          anon_id?: string | null
          contact_consented_at?: string | null
          contact_email?: string | null
          created_at?: string | null
          email?: string | null
          expert_id?: string | null
          id?: string
          last_activity_at?: string | null
          last_message_id?: string | null
          legacy_crm_captured_at?: string | null
          legacy_questions_captured_at?: string | null
          legacy_questions_snapshot?: Json
          legacy_score_snapshot?: number
          legacy_signals_snapshot?: string[]
          next_follow_up_at?: string | null
          owner_id?: string | null
          owner_is_anonymous?: boolean
          persona?: string
          questions?: Json | null
          score?: number | null
          signals?: string[] | null
          source_conversation_id?: string | null
          stage?: string | null
          timeline?: Json | null
          user_id?: string | null
        }
        Update: {
          analysis?: string | null
          anon_id?: string | null
          contact_consented_at?: string | null
          contact_email?: string | null
          created_at?: string | null
          email?: string | null
          expert_id?: string | null
          id?: string
          last_activity_at?: string | null
          last_message_id?: string | null
          legacy_crm_captured_at?: string | null
          legacy_questions_captured_at?: string | null
          legacy_questions_snapshot?: Json
          legacy_score_snapshot?: number
          legacy_signals_snapshot?: string[]
          next_follow_up_at?: string | null
          owner_id?: string | null
          owner_is_anonymous?: boolean
          persona?: string
          questions?: Json | null
          score?: number | null
          signals?: string[] | null
          source_conversation_id?: string | null
          stage?: string | null
          timeline?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          answer_basis: string | null
          citations: Json | null
          confidence: number | null
          content: string
          conversation_id: string | null
          coverage: string | null
          created_at: string | null
          id: string
          persona_version_id: string | null
          provider_usage: Json
          request_id: string | null
          retrieval: Json
          role: string
          server_generated: boolean
          source: string | null
          turn_sequence: number
        }
        Insert: {
          answer_basis?: string | null
          citations?: Json | null
          confidence?: number | null
          content: string
          conversation_id?: string | null
          coverage?: string | null
          created_at?: string | null
          id?: string
          persona_version_id?: string | null
          provider_usage?: Json
          request_id?: string | null
          retrieval?: Json
          role: string
          server_generated?: boolean
          source?: string | null
          turn_sequence: number
        }
        Update: {
          answer_basis?: string | null
          citations?: Json | null
          confidence?: number | null
          content?: string
          conversation_id?: string | null
          coverage?: string | null
          created_at?: string | null
          id?: string
          persona_version_id?: string | null
          provider_usage?: Json
          request_id?: string | null
          retrieval?: Json
          role?: string
          server_generated?: boolean
          source?: string | null
          turn_sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_persona_version_id_fkey"
            columns: ["persona_version_id"]
            isOneToOne: false
            referencedRelation: "expert_persona_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_evaluation_questions: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string | null
          expected: Json
          expert_id: string
          id: string
          question: string
          source_revision_ids: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          created_by?: string | null
          expected?: Json
          expert_id: string
          id?: string
          question: string
          source_revision_ids?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          expected?: Json
          expert_id?: string
          id?: string
          question?: string
          source_revision_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_evaluation_questions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_evaluation_runs: {
        Row: {
          created_at: string
          evaluator_model: string
          generator_model: string
          id: string
          probe_responses: Json
          report: Json
          score: number
          status: string
          synthesis_job_id: string
        }
        Insert: {
          created_at?: string
          evaluator_model: string
          generator_model: string
          id?: string
          probe_responses?: Json
          report?: Json
          score: number
          status: string
          synthesis_job_id: string
        }
        Update: {
          created_at?: string
          evaluator_model?: string
          generator_model?: string
          id?: string
          probe_responses?: Json
          report?: Json
          score?: number
          status?: string
          synthesis_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_evaluation_runs_synthesis_job_id_fkey"
            columns: ["synthesis_job_id"]
            isOneToOne: false
            referencedRelation: "persona_synthesis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_synthesis_jobs: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          error_message: string | null
          evidence_manifest: Json
          expert_id: string
          fidelity_report: Json
          fidelity_score: number | null
          fidelity_status: string
          id: string
          locked_at: string | null
          locked_by: string | null
          model: string | null
          next_retry_at: string
          output_blueprint: Json
          persona_version_id: string | null
          research_cutoff_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_revision_ids: string[]
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          evidence_manifest?: Json
          expert_id: string
          fidelity_report?: Json
          fidelity_score?: number | null
          fidelity_status?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          model?: string | null
          next_retry_at?: string
          output_blueprint?: Json
          persona_version_id?: string | null
          research_cutoff_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_revision_ids: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          evidence_manifest?: Json
          expert_id?: string
          fidelity_report?: Json
          fidelity_score?: number | null
          fidelity_status?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          model?: string | null
          next_retry_at?: string
          output_blueprint?: Json
          persona_version_id?: string | null
          research_cutoff_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_revision_ids?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_synthesis_jobs_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_synthesis_jobs_persona_version_id_fkey"
            columns: ["persona_version_id"]
            isOneToOne: false
            referencedRelation: "expert_persona_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          avatar_seed: string | null
          avatar_updated_at: string | null
          city: string | null
          company: string | null
          created_at: string | null
          email: string
          expert_slug: string | null
          goals: string[] | null
          id: string
          interests: string[] | null
          name: string
          notifications: Json | null
          persona: string | null
          referral: string | null
          role: string
          role_title: string | null
          social: string | null
          team_size: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          avatar_path?: string | null
          avatar_seed?: string | null
          avatar_updated_at?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          expert_slug?: string | null
          goals?: string[] | null
          id: string
          interests?: string[] | null
          name?: string
          notifications?: Json | null
          persona?: string | null
          referral?: string | null
          role?: string
          role_title?: string | null
          social?: string | null
          team_size?: string | null
          tier?: string
          updated_at?: string | null
        }
        Update: {
          avatar_path?: string | null
          avatar_seed?: string | null
          avatar_updated_at?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          expert_slug?: string | null
          goals?: string[] | null
          id?: string
          interests?: string[] | null
          name?: string
          notifications?: Json | null
          persona?: string | null
          referral?: string | null
          role?: string
          role_title?: string | null
          social?: string | null
          team_size?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          account_identifier: string
          canonical_url: string | null
          consent_status: string
          consent_version: string
          consented_at: string
          created_at: string
          created_by: string | null
          cursor: string | null
          expert_id: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          next_sync_at: string
          platform: string
          provider_account_id: string | null
          revoked_at: string | null
          source: string
          sync_enabled: boolean
          updated_at: string
          use_for_distillation: boolean
        }
        Insert: {
          account_identifier: string
          canonical_url?: string | null
          consent_status?: string
          consent_version?: string
          consented_at?: string
          created_at?: string
          created_by?: string | null
          cursor?: string | null
          expert_id: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          next_sync_at?: string
          platform: string
          provider_account_id?: string | null
          revoked_at?: string | null
          source: string
          sync_enabled?: boolean
          updated_at?: string
          use_for_distillation?: boolean
        }
        Update: {
          account_identifier?: string
          canonical_url?: string | null
          consent_status?: string
          consent_version?: string
          consented_at?: string
          created_at?: string
          created_by?: string | null
          cursor?: string | null
          expert_id?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          next_sync_at?: string
          platform?: string
          provider_account_id?: string | null
          revoked_at?: string | null
          source?: string
          sync_enabled?: boolean
          updated_at?: string
          use_for_distillation?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_content_items: {
        Row: {
          canonical_url: string
          connection_id: string
          content_type: string | null
          expert_id: string
          first_seen_at: string
          id: string
          knowledge_source_id: string | null
          last_seen_at: string
          platform: string
          provider_content_id: string
          provider_meta: Json
          public_metrics: Json
          published_at: string | null
          text_content: string | null
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          canonical_url: string
          connection_id: string
          content_type?: string | null
          expert_id: string
          first_seen_at?: string
          id?: string
          knowledge_source_id?: string | null
          last_seen_at?: string
          platform: string
          provider_content_id: string
          provider_meta?: Json
          public_metrics?: Json
          published_at?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          canonical_url?: string
          connection_id?: string
          content_type?: string | null
          expert_id?: string
          first_seen_at?: string
          id?: string
          knowledge_source_id?: string | null
          last_seen_at?: string
          platform?: string
          provider_content_id?: string
          provider_meta?: Json
          public_metrics?: Json
          published_at?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_content_connection_scope_fkey"
            columns: ["connection_id", "expert_id", "platform"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id", "expert_id", "platform"]
          },
          {
            foreignKeyName: "social_content_items_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_content_items_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_content_items_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sync_invocation_leases: {
        Row: {
          lease_name: string
          locked_by: string | null
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          lease_name: string
          locked_by?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          lease_name?: string
          locked_by?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_sync_jobs: {
        Row: {
          attempts: number
          connection_id: string
          created_at: string
          error_message: string | null
          expert_id: string
          fetched_count: number | null
          id: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string
          provider_request_id: string | null
          status: string
          sync_date: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          connection_id: string
          created_at?: string
          error_message?: string | null
          expert_id: string
          fetched_count?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string
          provider_request_id?: string | null
          status?: string
          sync_date: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          connection_id?: string
          created_at?: string
          error_message?: string | null
          expert_id?: string
          fetched_count?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string
          provider_request_id?: string | null
          status?: string
          sync_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_sync_jobs_connection_expert_fkey"
            columns: ["connection_id", "expert_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id", "expert_id"]
          },
          {
            foreignKeyName: "social_sync_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_sync_jobs_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string | null
          domain: string | null
          endpoint: string | null
          fetch_interval_minutes: number | null
          health: string | null
          id: string
          lang: string | null
          last_fetched_at: string | null
          name: string
          status: string | null
          type: string
          vertical: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          endpoint?: string | null
          fetch_interval_minutes?: number | null
          health?: string | null
          id?: string
          lang?: string | null
          last_fetched_at?: string | null
          name: string
          status?: string | null
          type: string
          vertical?: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          endpoint?: string | null
          fetch_interval_minutes?: number | null
          health?: string | null
          id?: string
          lang?: string | null
          last_fetched_at?: string | null
          name?: string
          status?: string | null
          type?: string
          vertical?: string
          weight?: number | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          provider: string
          request_id: string | null
          status: string
          tokens: number | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          provider: string
          request_id?: string | null
          status?: string
          tokens?: number | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          provider?: string
          request_id?: string | null
          status?: string
          tokens?: number | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          kind: string
          note: string | null
          role: string | null
          source: string | null
          vertical: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          kind: string
          note?: string | null
          role?: string | null
          source?: string | null
          vertical?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          kind?: string
          note?: string | null
          role?: string | null
          source?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_member_count: { Args: never; Returns: number }
      accept_expert_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      acquire_social_sync_invocation_lease: {
        Args: { p_lease_seconds?: number; p_worker_id: string }
        Returns: boolean
      }
      activate_expert: { Args: { p_expert_id: string }; Returns: undefined }
      archive_expert_workspace: {
        Args: { p_expert_id: string }
        Returns: undefined
      }
      archive_unused_expert_draft: {
        Args: { p_expert_id: string }
        Returns: undefined
      }
      assign_expert_owner: {
        Args: { p_expert_id: string; p_user_id: string }
        Returns: undefined
      }
      assign_expert_owner_with_tier: {
        Args: { p_expert_id: string; p_tier: string; p_user_id: string }
        Returns: undefined
      }
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined }
      cancel_expert_invitation: {
        Args: { p_invitation_id: string; p_reason?: string }
        Returns: undefined
      }
      check_chat_rate_limit: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: boolean
      }
      check_chat_rate_limits: {
        Args: {
          p_ip_hash: string
          p_ip_limit?: number
          p_user_id: string
          p_user_limit?: number
        }
        Returns: boolean
      }
      claim_distillation_jobs: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string
          revision_id: string
          stage: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "distillation_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_persona_synthesis_jobs: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempts: number
          created_at: string
          created_by: string | null
          error_message: string | null
          evidence_manifest: Json
          expert_id: string
          fidelity_report: Json
          fidelity_score: number | null
          fidelity_status: string
          id: string
          locked_at: string | null
          locked_by: string | null
          model: string | null
          next_retry_at: string
          output_blueprint: Json
          persona_version_id: string | null
          research_cutoff_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_revision_ids: string[]
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "persona_synthesis_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_social_sync_jobs: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempts: number
          connection_id: string
          created_at: string
          error_message: string | null
          expert_id: string
          fetched_count: number | null
          id: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string
          provider_request_id: string | null
          status: string
          sync_date: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "social_sync_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_distillation_job: {
        Args: {
          p_chunks: Json
          p_content_hash: string
          p_distilled_json: Json
          p_extracted_text: string
          p_job_id: string
          p_provider_meta: Json
          p_worker_id: string
        }
        Returns: undefined
      }
      consent_lead_contact: {
        Args: { p_conversation_id: string; p_email: string }
        Returns: undefined
      }
      bind_chat_request_evidence: {
        Args: {
          p_conversation_id: string
          p_expert_id: string
          p_owner_id: string
          p_persona_version_id: string
          p_request_id: string
          p_retrieval: Json
        }
        Returns: Json
      }
      create_booking: {
        Args: {
          p_expert_slug: string
          p_member_note?: string
          p_source_conversation_id?: string
          p_source_question?: string
          p_starts_at: string
        }
        Returns: string
      }
      create_chat_conversation: {
        Args: { p_persona_slug: string; p_title?: string }
        Returns: string
      }
      create_chat_conversation_idempotent: {
        Args: {
          p_conversation_id: string
          p_persona_slug: string
          p_title?: string
        }
        Returns: string
      }
      delete_chat_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      create_expert_invitation: {
        Args: { p_email: string; p_expert_id: string }
        Returns: string
      }
      create_authorized_knowledge_source: {
        Args: {
          p_expert_slug: string
          p_expires_at?: string
          p_raw_text?: string
          p_rights_evidence_ref: string
          p_rights_holder: string
          p_rights_scope: Json
          p_source_type: string
          p_source_url?: string
          p_storage_path?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: Json
      }
      create_knowledge_source: {
        Args: {
          p_expert_slug: string
          p_raw_text?: string
          p_source_type: string
          p_source_url?: string
          p_storage_path?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: Json
      }
      dispatch_social_sync: { Args: never; Returns: number }
      fail_chat_request: {
        Args: { p_error_code?: string; p_request_id: string; p_user_id: string }
        Returns: undefined
      }
      finish_social_sync_job: {
        Args: {
          p_cursor?: string
          p_error_message?: string
          p_fetched_count?: number
          p_job_id: string
          p_provider_request_id?: string
          p_retryable?: boolean
          p_success: boolean
          p_worker_id: string
        }
        Returns: undefined
      }
      finalize_authorized_chat_round: {
        Args: {
          p_answer: string
          p_answer_basis: string
          p_citations: Json
          p_conversation_id: string
          p_coverage: string
          p_expert_id: string
          p_latency_ms?: number
          p_model?: string
          p_owner_id: string
          p_persona: string
          p_persona_version_id: string
          p_provider_request_id?: string
          p_provider_usage?: Json
          p_question: string
          p_request_id: string
          p_retrieval: Json
        }
        Returns: Json
      }
      get_admin_crm_summary: {
        Args: never
        Returns: {
          contacted_count: number
          converted_count: number
          following_up_count: number
          high_intent_count: number
          lead_count: number
          new_count: number
          week_new_count: number
        }[]
      }
      get_backend_readiness: { Args: never; Returns: Json }
      get_expert_crm_summary: {
        Args: { p_expert_id: string }
        Returns: {
          conversation_count: number
          converted_count: number
          following_up_count: number
          high_intent_count: number
          lead_count: number
        }[]
      }
      get_expert_release_readiness: {
        Args: { p_expert_id: string }
        Returns: Json
      }
      get_expert_reference_files: {
        Args: { p_expert_id: string }
        Returns: {
          archived_at: string | null
          chunk_count: number
          content_hash: string | null
          distilled: boolean
          embedded_chunk_count: number
          external_key: string | null
          human_reviewed: boolean
          is_published: boolean
          job_attempts: number | null
          job_error: string | null
          job_stage: string | null
          job_status: string | null
          revision_created_at: string | null
          revision_id: string | null
          revision_no: number | null
          revision_status: string | null
          public_citation_review_note: string | null
          public_citation_reviewed_at: string | null
          public_citation_reviewed_by: string | null
          public_citation_ready: boolean
          public_citation_url: string | null
          rights_evidence_ref: string | null
          rights_expires_at: string | null
          rights_holder: string | null
          rights_revoked_at: string | null
          rights_scope: Json
          rights_status: string
          rights_valid: boolean
          source_blob_url: string | null
          source_commit_sha: string | null
          source_file_path: string | null
          source_id: string
          source_type: string
          source_updated_at: string
          source_url: string | null
          storage_path: string | null
          title: string
        }[]
      }
      get_public_instructor_stats: {
        Args: { p_slug: string }
        Returns: {
          conversations: number
          insights: number
          knowledge: number
        }[]
      }
      get_rights_safe_engagement: {
        Args: { p_expert_id?: string | null }
        Returns: Json
      }
      has_current_passed_persona_evaluation: {
        Args: { p_expert_id: string; p_persona_version_id: string }
        Returns: boolean
      }
      invoke_knowledge_worker: { Args: never; Returns: number }
      invoke_persona_compiler: { Args: never; Returns: number }
      invoke_social_sync_worker: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_expert_chat_ready: { Args: { p_expert_id: string }; Returns: boolean }
      is_public_expert: { Args: { p_expert_id: string }; Returns: boolean }
      is_public_expert_slug: { Args: { p_slug: string }; Returns: boolean }
      is_safe_knowledge_source_url: {
        Args: { p_url: string; p_youtube?: boolean }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      list_available_slots: {
        Args: {
          p_expert_slug: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      list_my_expert_invitations: {
        Args: never
        Returns: {
          expert_id: string
          expert_name: string
          expert_slug: string
          expires_at: string
          id: string
        }[]
      }
      list_public_instructors: {
        Args: never
        Returns: {
          bio: string
          brand_color: string
          chat_ready: boolean
          credential: string
          display_name: string
          greeting: string
          id: string
          name_en: string
          name_zh: string
          public_profile_enabled: boolean
          quote: string
          radar: Json
          slug: string
          specialties: string[]
          title: string
          traits: string[]
          verified: boolean
        }[]
      }
      match_expert_knowledge: {
        Args: {
          p_expert_id: string
          p_match_count?: number
          p_query_embedding: unknown
          p_similarity_threshold?: number
        }
        Returns: {
          chunk_id: string
          citation_meta: Json
          content: string
          revision_id: string
          similarity: number
          source_id: string
          source_title: string
          public_citation_url: string | null
        }[]
      }
      owns_expert: { Args: { target_expert_id: string }; Returns: boolean }
      persist_chat_round: {
        Args: {
          p_answer: string
          p_answer_basis: string
          p_citations?: Json
          p_conversation_id: string
          p_coverage: string
          p_expert_id: string
          p_latency_ms?: number
          p_model?: string
          p_owner_id: string
          p_persona: string
          p_persona_version_id?: string
          p_provider_request_id?: string
          p_provider_usage?: Json
          p_question: string
          p_request_id: string
          p_retrieval?: Json
        }
        Returns: string
      }
      persist_social_sync_result: {
        Args: {
          p_canonical_url: string
          p_connection_id: string
          p_cursor?: string
          p_expert_id: string
          p_items: Json
          p_job_id: string
          p_provider_account_id: string
          p_provider_request_id?: string
          p_worker_id: string
        }
        Returns: number
      }
      publish_compiled_persona: {
        Args: {
          p_greeting: string
          p_job_id: string
          p_sample_dialogues?: Json
        }
        Returns: string
      }
      publish_persona_version: {
        Args: {
          p_boundaries: Json
          p_expert_id: string
          p_greeting: string
          p_sample_dialogues?: Json
          p_voice_rules: Json
        }
        Returns: string
      }
      purge_expired_anonymous_chats: { Args: never; Returns: number }
      queue_due_social_syncs: {
        Args: { p_sync_date?: string }
        Returns: number
      }
      queue_persona_synthesis: {
        Args: { p_expert_id: string }
        Returns: string
      }
      refresh_lead_questions: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      release_social_sync_invocation_lease: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
      public_member_count: { Args: never; Returns: number }
      requeue_stuck_distillation_jobs: { Args: never; Returns: undefined }
      requeue_stuck_persona_synthesis_jobs: { Args: never; Returns: undefined }
      requeue_stuck_social_sync_jobs: { Args: never; Returns: undefined }
      reschedule_booking: {
        Args: { p_booking_id: string; p_starts_at: string }
        Returns: undefined
      }
      reserve_chat_request: {
        Args: {
          p_conversation_id: string
          p_expert_id: string
          p_message_hash: string
          p_request_id: string
          p_user_id: string
        }
        Returns: Json
      }
      resolve_active_expert: { Args: { p_slug: string }; Returns: string }
      resolve_knowledge_gap: {
        Args: { p_gap_id: string; p_status: string }
        Returns: undefined
      }
      revoke_knowledge_source_rights: {
        Args: { p_reason?: string; p_source_id: string }
        Returns: undefined
      }
      restore_expert_workspace: {
        Args: { p_expert_id: string }
        Returns: undefined
      }
      review_knowledge_revision: {
        Args: { p_decision: string; p_notes?: string; p_revision_id: string }
        Returns: undefined
      }
      review_persona_synthesis: {
        Args: {
          p_decision: string
          p_job_id: string
          p_notes?: string
          p_override_fidelity?: boolean
        }
        Returns: undefined
      }
      revoke_social_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      rollback_knowledge_source: {
        Args: { p_revision_id: string; p_source_id: string }
        Returns: undefined
      }
      set_expert_feature_flag: {
        Args: { p_enabled: boolean; p_expert_id: string; p_key: string }
        Returns: undefined
      }
      set_knowledge_source_archived: {
        Args: { p_archived: boolean; p_source_id: string }
        Returns: undefined
      }
      set_knowledge_source_public_citation: {
        Args: {
          p_public_citation_url: string | null
          p_review_note: string
          p_source_id: string
        }
        Returns: string | null
      }
      set_knowledge_source_rights: {
        Args: {
          p_rights_evidence_ref: string
          p_rights_holder: string
          p_rights_scope?: Json
          p_source_id: string
        }
        Returns: undefined
      }
      stage_social_content_for_distillation: {
        Args: { p_item_id: string }
        Returns: string
      }
      update_booking_status: {
        Args: {
          p_booking_id: string
          p_expert_note?: string
          p_meeting_url?: string
          p_status: string
        }
        Returns: undefined
      }
      update_expert_lead: {
        Args: {
          p_lead_id: string
          p_next_follow_up_at?: string
          p_note?: string
          p_stage: string
        }
        Returns: undefined
      }
      update_expert_public_profile: {
        Args: {
          p_bio: string
          p_brand_color: string
          p_display_name: string
          p_expert_id: string
          p_featured_ids?: string[]
          p_quote: string
          p_socials?: Json
          p_specialties: string[]
          p_stats?: Json
          p_title: string
        }
        Returns: undefined
      }
      update_lead_stage: {
        Args: { p_lead_id: string; p_stage: string }
        Returns: undefined
      }
      withdraw_lead_contact_consent: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      withdraw_lead_contact_consent_for_expert: {
        Args: { p_expert_slug: string }
        Returns: boolean
      }
      upsert_admin_expert: {
        Args: {
          p_bio: string
          p_brand_color: string
          p_credential: string
          p_display_name: string
          p_expert_id: string
          p_name_en: string
          p_name_zh: string
          p_quote: string
          p_radar: Json
          p_slug: string
          p_specialties: string[]
          p_title: string
          p_traits: string[]
          p_verified: boolean
        }
        Returns: string
      }
      upsert_social_connection: {
        Args: {
          p_account_identifier: string
          p_expert_id: string
          p_platform: string
          p_use_for_distillation?: boolean
        }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
