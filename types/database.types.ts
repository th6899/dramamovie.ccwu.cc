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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      adsense_settings: {
        Row: {
          ad_slot: string | null
          id: boolean
          is_enabled: boolean
          publisher_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ad_slot?: string | null
          id?: boolean
          is_enabled?: boolean
          publisher_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ad_slot?: string | null
          id?: boolean
          is_enabled?: boolean
          publisher_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_tool_catalog: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          official_url: string
          pricing_model: string
          slug: string
          sort_order: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          name: string
          official_url: string
          pricing_model?: string
          slug: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          official_url?: string
          pricing_model?: string
          slug?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      crypto_wallet_addresses: {
        Row: {
          asset: string
          created_at: string
          id: string
          instructions: string
          is_active: boolean
          label: string
          network: string
          updated_at: string
          wallet_address: string | null
          wallet_provider: string
        }
        Insert: {
          asset?: string
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          label?: string
          network: string
          updated_at?: string
          wallet_address?: string | null
          wallet_provider: string
        }
        Update: {
          asset?: string
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          label?: string
          network?: string
          updated_at?: string
          wallet_address?: string | null
          wallet_provider?: string
        }
        Relationships: []
      }
      dramas: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_premium: boolean
          poster_path: string | null
          poster_url: string | null
          published_at: string | null
          release_year: number | null
          slug: string
          status: string
          synopsis: string | null
          title: string
          title_en: string | null
          title_zh: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_premium?: boolean
          poster_path?: string | null
          poster_url?: string | null
          published_at?: string | null
          release_year?: number | null
          slug: string
          status?: string
          synopsis?: string | null
          title: string
          title_en?: string | null
          title_zh: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_premium?: boolean
          poster_path?: string | null
          poster_url?: string | null
          published_at?: string | null
          release_year?: number | null
          slug?: string
          status?: string
          synopsis?: string | null
          title?: string
          title_en?: string | null
          title_zh?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_service_orders: {
        Row: {
          admin_note: string | null
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_note: string | null
          id: string
          order_no: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          product_id: string | null
          product_name: string
          service_status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_note?: string | null
          id?: string
          order_no?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          product_id?: string | null
          product_name: string
          service_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_note?: string | null
          id?: string
          order_no?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          product_id?: string | null
          product_name?: string
          service_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_service_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "email_service_products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_service_products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      episode_promotions: {
        Row: {
          affiliate_network: string | null
          button_label: string
          campaign_code: string | null
          created_at: string
          description: string | null
          disclosure_text: string
          ends_at: string | null
          episode_id: string
          id: string
          image_url: string | null
          is_active: boolean
          placement: string
          sort_order: number
          starts_at: string | null
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_network?: string | null
          button_label?: string
          campaign_code?: string | null
          created_at?: string
          description?: string | null
          disclosure_text?: string
          ends_at?: string | null
          episode_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_network?: string | null
          button_label?: string
          campaign_code?: string | null
          created_at?: string
          description?: string | null
          disclosure_text?: string
          ends_at?: string | null
          episode_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_promotions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_watch_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          episode_id: string
          id: string
          last_watched_at: string
          position_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          episode_id: string
          id?: string
          last_watched_at?: string
          position_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string
          id?: string
          last_watched_at?: string
          position_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_watch_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          created_at: string
          description: string | null
          drama_id: string
          duration_seconds: number | null
          episode_number: number
          id: string
          is_free: boolean
          season_number: number
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_asset_id: string | null
          video_path: string | null
          video_provider: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          drama_id: string
          duration_seconds?: number | null
          episode_number: number
          id?: string
          is_free?: boolean
          season_number?: number
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_asset_id?: string | null
          video_path?: string | null
          video_provider?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          drama_id?: string
          duration_seconds?: number | null
          episode_number?: number
          id?: string
          is_free?: boolean
          season_number?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_asset_id?: string | null
          video_path?: string | null
          video_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_drama_id_fkey"
            columns: ["drama_id"]
            isOneToOne: false
            referencedRelation: "dramas"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          config: Json
          id: string
          is_enabled: boolean
          section_key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          is_enabled?: boolean
          section_key: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          is_enabled?: boolean
          section_key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_payment_settings: {
        Row: {
          alipay_enabled: boolean
          alipay_qr_path: string | null
          id: boolean
          instructions: string
          updated_at: string
          updated_by: string | null
          wechat_enabled: boolean
          wechat_qr_path: string | null
        }
        Insert: {
          alipay_enabled?: boolean
          alipay_qr_path?: string | null
          id?: boolean
          instructions?: string
          updated_at?: string
          updated_by?: string | null
          wechat_enabled?: boolean
          wechat_qr_path?: string | null
        }
        Update: {
          alipay_enabled?: boolean
          alipay_qr_path?: string | null
          id?: boolean
          instructions?: string
          updated_at?: string
          updated_by?: string | null
          wechat_enabled?: boolean
          wechat_qr_path?: string | null
        }
        Relationships: []
      }
      manual_payment_submissions: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          method: string
          order_id: string
          payer_reference: string
          proof_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          method: string
          order_id: string
          payer_reference: string
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          payer_reference?: string
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payment_submissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          amount_minor: number
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          id: string
          interval: string
          is_active: boolean
          is_enabled: boolean
          name: string
          price_amount: number
          provider_price_id: string | null
          stripe_price_id: string | null
        }
        Insert: {
          amount_minor?: number
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_days: number
          id?: string
          interval?: string
          is_active?: boolean
          is_enabled?: boolean
          name: string
          price_amount?: number
          provider_price_id?: string | null
          stripe_price_id?: string | null
        }
        Update: {
          amount_minor?: number
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          id?: string
          interval?: string
          is_active?: boolean
          is_enabled?: boolean
          name?: string
          price_amount?: number
          provider_price_id?: string | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      membership_subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          plan_id: string
          source_order_id: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          plan_id: string
          source_order_id?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          plan_id?: string
          source_order_id?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subscriptions_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          asset: string | null
          checkout_type: string
          code: string
          created_at: string
          display_name: string
          environment: string
          id: string
          is_enabled: boolean
          network: string | null
          provider: string
          public_config: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          asset?: string | null
          checkout_type: string
          code: string
          created_at?: string
          display_name: string
          environment?: string
          id?: string
          is_enabled?: boolean
          network?: string | null
          provider: string
          public_config?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          asset?: string | null
          checkout_type?: string
          code?: string
          created_at?: string
          display_name?: string
          environment?: string
          id?: string
          is_enabled?: boolean
          network?: string | null
          provider?: string
          public_config?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          currency: string | null
          id: string
          order_id: string
          payment_refund_id: string | null
          reason: string
          requested_amount: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          order_id: string
          payment_refund_id?: string | null
          reason: string
          requested_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          order_id?: string
          payment_refund_id?: string | null
          reason?: string
          requested_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          video_path: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_path?: string | null
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          item_id: string | null
          item_type: string
          order_no: string
          payment_closed_at: string | null
          payment_expires_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          item_id?: string | null
          item_type: string
          order_no: string
          payment_closed_at?: string | null
          payment_expires_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          item_id?: string | null
          item_type?: string
          order_no?: string
          payment_closed_at?: string | null
          payment_expires_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subtitle_tracks: {
        Row: {
          created_at: string
          episode_id: string
          file_url: string
          id: string
          label: string
          language_code: string
          reviewed_by: string | null
          status: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          file_url: string
          id?: string
          label: string
          language_code: string
          reviewed_by?: string | null
          status?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          file_url?: string
          id?: string
          label?: string
          language_code?: string
          reviewed_by?: string | null
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtitle_tracks_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          body_md: string | null
          category: string
          created_at: string
          file_path: string | null
          id: string
          resource_path: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          video_path: string | null
        }
        Insert: {
          body_md?: string | null
          category?: string
          created_at?: string
          file_path?: string | null
          id?: string
          resource_path?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          body_md?: string | null
          category?: string
          created_at?: string
          file_path?: string | null
          id?: string
          resource_path?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          video_path?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          dedupe_key: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          dedupe_key: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      video_ad_configs: {
        Row: {
          ad_provider: string
          ad_tag_url: string | null
          ad_type: string
          created_at: string
          ends_at: string | null
          episode_id: string | null
          frequency_cap_hours: number | null
          id: string
          is_active: boolean
          members_exempt: boolean
          midroll_offset_seconds: number | null
          skip_after_seconds: number | null
          slot_key: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          ad_provider?: string
          ad_tag_url?: string | null
          ad_type: string
          created_at?: string
          ends_at?: string | null
          episode_id?: string | null
          frequency_cap_hours?: number | null
          id?: string
          is_active?: boolean
          members_exempt?: boolean
          midroll_offset_seconds?: number | null
          skip_after_seconds?: number | null
          slot_key: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          ad_provider?: string
          ad_tag_url?: string | null
          ad_type?: string
          created_at?: string
          ends_at?: string | null
          episode_id?: string | null
          frequency_cap_hours?: number | null
          id?: string
          is_active?: boolean
          members_exempt?: boolean
          midroll_offset_seconds?: number | null
          skip_after_seconds?: number | null
          slot_key?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ad_configs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      vpn_access_configs: {
        Row: {
          config_ciphertext: string
          config_iv: string
          config_type: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
          vpn_subscription_id: string
        }
        Insert: {
          config_ciphertext: string
          config_iv: string
          config_type: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
          vpn_subscription_id: string
        }
        Update: {
          config_ciphertext?: string
          config_iv?: string
          config_type?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          vpn_subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vpn_access_configs_vpn_subscription_id_fkey"
            columns: ["vpn_subscription_id"]
            isOneToOne: true
            referencedRelation: "vpn_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      vpn_device_bindings: {
        Row: {
          created_at: string
          device_name: string
          fingerprint_hash: string
          first_seen_at: string
          id: string
          last_seen_at: string
          platform: string
          revoked_at: string | null
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name: string
          fingerprint_hash: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          revoked_at?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string
          fingerprint_hash?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          revoked_at?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vpn_device_bindings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "vpn_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      vpn_plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          device_limit: number
          duration_days: number
          id: string
          is_active: boolean
          name: string
          price_amount: number
          stripe_price_id: string | null
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          device_limit?: number
          duration_days: number
          id?: string
          is_active?: boolean
          name: string
          price_amount?: number
          stripe_price_id?: string | null
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          device_limit?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price_amount?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      vpn_subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          plan_id: string
          provider_reference: string | null
          source_order_id: string | null
          starts_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          plan_id: string
          provider_reference?: string | null
          source_order_id?: string | null
          starts_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          plan_id?: string
          provider_reference?: string | null
          source_order_id?: string | null
          starts_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vpn_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "vpn_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vpn_subscriptions_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_manual_payment: {
        Args: { p_admin_note?: string; p_submission_id: string }
        Returns: Json
      }
      attach_cn_payment_session: {
        Args: {
          p_order_id: string
          p_provider: string
          p_provider_session_id: string
          p_qr_code: string
        }
        Returns: boolean
      }
      create_cn_payment_order: {
        Args: {
          p_item_id: string
          p_item_type: string
          p_provider: string
          p_request_key: string
        }
        Returns: Json
      }
      create_manual_payment_order: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: Json
      }
      create_stripe_subscription_order_idempotent: {
        Args: {
          p_currency: string
          p_item_id: string
          p_item_type: string
          p_request_key: string
        }
        Returns: Json
      }
      current_staff_role: { Args: never; Returns: string }
      get_eligible_video_ad_config_ids: {
        Args: {
          p_config_ids: string[]
          p_episode_id: string
          p_viewer_id: string
          p_viewer_session_id: string
        }
        Returns: string[]
      }
      get_my_cn_payment_order: { Args: { p_order_no: string }; Returns: Json }
      has_active_membership: { Args: never; Returns: boolean }
      is_ccwu_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      map_stripe_subscription_after_checkout: {
        Args: {
          p_customer_id: string
          p_order_id: string
          p_period_end: string
          p_session_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      mark_stripe_checkout_created: {
        Args: { p_order_id: string; p_session_id: string }
        Returns: boolean
      }
      mark_stripe_checkout_failed: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      process_cn_payment_success: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_id: string
          p_event_type: string
          p_order_no: string
          p_payload_hash: string
          p_provider: string
          p_provider_trade_no: string
        }
        Returns: Json
      }
      process_stripe_checkout_event:
        | {
            Args: {
              p_amount: number
              p_currency: string
              p_event_id: string
              p_event_type: string
              p_order_id: string
              p_payment_status: string
              p_session_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_currency: string
              p_event_id: string
              p_event_type: string
              p_order_id: string
              p_payment_intent_id: string
              p_payment_status: string
              p_session_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_currency: string
              p_event_id: string
              p_event_type: string
              p_is_subscription: boolean
              p_order_id: string
              p_payment_intent_id: string
              p_payment_status: string
              p_session_id: string
            }
            Returns: Json
          }
      process_stripe_refund_dispute_event: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_id: string
          p_event_type: string
          p_evidence_due_at?: string
          p_object_id: string
          p_payment_intent_id: string
          p_provider_status: string
          p_reason?: string
        }
        Returns: Json
      }
      process_stripe_subscription_event: {
        Args: {
          p_cancel_at_period_end?: boolean
          p_canceled_at?: string
          p_event_created_at: number
          p_event_id: string
          p_event_type: string
          p_invoice_id?: string
          p_payment_intent_id?: string
          p_period_end?: string
          p_status?: string
          p_subscription_id: string
        }
        Returns: Json
      }
      process_stripe_subscription_invoice_adjustment_event: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_id: string
          p_event_type: string
          p_evidence_due_at?: string
          p_object_id: string
          p_payment_intent_id: string
          p_provider_status: string
          p_reason?: string
        }
        Returns: Json
      }
      process_stripe_subscription_invoice_event: {
        Args: {
          p_amount_due: number
          p_amount_paid: number
          p_billing_reason: string
          p_currency: string
          p_customer_id: string
          p_event_created_at: number
          p_event_id: string
          p_event_type: string
          p_invoice_id: string
          p_metadata?: Json
          p_payment_intent_id: string
          p_period_end: string
          p_period_start: string
          p_subscription_id: string
        }
        Returns: Json
      }
      record_cn_payment_reconciliation: {
        Args: {
          p_amount: number
          p_currency: string
          p_order_no: string
          p_provider: string
          p_provider_state: string
          p_provider_trade_no: string
          p_response_hash: string
        }
        Returns: Json
      }
      record_episode_promotion_click: {
        Args: {
          p_click_nonce: string
          p_episode_id: string
          p_promotion_id: string
          p_referrer_domain?: string
        }
        Returns: string
      }
      record_video_ad_events: {
        Args: {
          p_allowed_config_ids: string[]
          p_episode_id: string
          p_event_token_id: string
          p_events: Json
        }
        Returns: number
      }
      record_video_ad_events_v2: {
        Args: {
          p_allowed_config_ids: string[]
          p_episode_id: string
          p_event_token_id: string
          p_events: Json
          p_viewer_id: string
          p_viewer_session_id: string
        }
        Returns: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
