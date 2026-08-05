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
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_role?: string
          created_at?: string
          expert_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_role?: string
          created_at?: string
          expert_id?: string | null
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
          expert_id: string
          greeting: string
          id: string
          published_at: string | null
          sample_dialogues: Json
          status: string
          version: number
          voice_rules: Json
        }
        Insert: {
          approved_by?: string | null
          boundaries?: Json
          created_at?: string
          created_by?: string | null
          expert_id: string
          greeting?: string
          id?: string
          published_at?: string | null
          sample_dialogues?: Json
          status?: string
          version: number
          voice_rules?: Json
        }
        Update: {
          approved_by?: string | null
          boundaries?: Json
          created_at?: string
          created_by?: string | null
          expert_id?: string
          greeting?: string
          id?: string
          published_at?: string | null
          sample_dialogues?: Json
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
          created_at: string
          display_name: string
          feature_flags: Json
          id: string
          owner_user_id: string | null
          published_persona_version_id: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          feature_flags?: Json
          id?: string
          owner_user_id?: string | null
          published_persona_version_id?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          feature_flags?: Json
          id?: string
          owner_user_id?: string | null
          published_persona_version_id?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experts_published_persona_version_id_fkey"
            columns: ["published_persona_version_id"]
            isOneToOne: false
            referencedRelation: "expert_persona_versions"
            referencedColumns: ["id"]
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
            foreignKeyName: "knowledge_sources_published_revision_id_fkey"
            columns: ["published_revision_id"]
            isOneToOne: false
            referencedRelation: "knowledge_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          analysis: string | null
          anon_id: string | null
          created_at: string | null
          email: string | null
          id: string
          last_activity_at: string | null
          owner_id: string | null
          persona: string
          questions: Json | null
          score: number | null
          signals: string[] | null
          stage: string | null
          timeline: Json | null
          user_id: string | null
        }
        Insert: {
          analysis?: string | null
          anon_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string | null
          owner_id?: string | null
          persona?: string
          questions?: Json | null
          score?: number | null
          signals?: string[] | null
          stage?: string | null
          timeline?: Json | null
          user_id?: string | null
        }
        Update: {
          analysis?: string | null
          anon_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string | null
          owner_id?: string | null
          persona?: string
          questions?: Json | null
          score?: number | null
          signals?: string[] | null
          stage?: string | null
          timeline?: Json | null
          user_id?: string | null
        }
        Relationships: [
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
          source: string | null
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
          source?: string | null
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
          source?: string | null
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
      profiles: {
        Row: {
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
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined }
      check_chat_rate_limit: {
        Args: { p_limit?: number; p_user_id: string }
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
      invoke_knowledge_worker: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
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
          source_url: string
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
      requeue_stuck_distillation_jobs: { Args: never; Returns: undefined }
      reschedule_booking: {
        Args: { p_booking_id: string; p_starts_at: string }
        Returns: undefined
      }
      review_knowledge_revision: {
        Args: { p_decision: string; p_notes?: string; p_revision_id: string }
        Returns: undefined
      }
      rollback_knowledge_source: {
        Args: { p_revision_id: string; p_source_id: string }
        Returns: undefined
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
