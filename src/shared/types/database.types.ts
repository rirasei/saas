export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          storage_used_bytes: number;
          storage_limit_bytes: number;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          storage_used_bytes?: number;
          storage_limit_bytes?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          storage_used_bytes?: number;
          storage_limit_bytes?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
          joined_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
          joined_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          icon_name: string;
          color: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          icon_name?: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          icon_name?: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color_hex: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color_hex?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          color_hex?: string;
          created_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          workspace_id: string;
          folder_id: string | null;
          author_id: string;
          last_edited_by_id: string | null;
          title: string;
          icon_emoji: string | null;
          cover_image_url: string | null;
          sprint: string | null;
          priority: 'P0' | 'P1' | 'P2' | 'NONE';
          is_pinned: boolean;
          status: 'ACTIVE' | 'ARCHIVED' | 'TRASHED';
          sync_version: string;
          word_count: number;
          reading_time_minutes: number;
          ai_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          folder_id?: string | null;
          author_id: string;
          last_edited_by_id?: string | null;
          title?: string;
          icon_emoji?: string | null;
          cover_image_url?: string | null;
          sprint?: string | null;
          priority?: 'P0' | 'P1' | 'P2' | 'NONE';
          is_pinned?: boolean;
          status?: 'ACTIVE' | 'ARCHIVED' | 'TRASHED';
          sync_version?: string;
          word_count?: number;
          reading_time_minutes?: number;
          ai_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          folder_id?: string | null;
          author_id?: string;
          last_edited_by_id?: string | null;
          title?: string;
          icon_emoji?: string | null;
          cover_image_url?: string | null;
          sprint?: string | null;
          priority?: 'P0' | 'P1' | 'P2' | 'NONE';
          is_pinned?: boolean;
          status?: 'ACTIVE' | 'ARCHIVED' | 'TRASHED';
          sync_version?: string;
          word_count?: number;
          reading_time_minutes?: number;
          ai_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      note_tags: {
        Row: {
          note_id: string;
          tag_id: string;
        };
        Insert: {
          note_id: string;
          tag_id: string;
        };
        Update: {
          note_id?: string;
          tag_id?: string;
        };
      };
      note_blocks: {
        Row: {
          id: string;
          note_id: string;
          parent_block_id: string | null;
          type:
            | 'HEADING_1'
            | 'HEADING_2'
            | 'HEADING_3'
            | 'PARAGRAPH'
            | 'CHECKLIST'
            | 'CODE'
            | 'CALLOUT_AI'
            | 'TABLE'
            | 'DIVIDER'
            | 'QUOTE';
          content: Json;
          is_completed: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          parent_block_id?: string | null;
          type:
            | 'HEADING_1'
            | 'HEADING_2'
            | 'HEADING_3'
            | 'PARAGRAPH'
            | 'CHECKLIST'
            | 'CODE'
            | 'CALLOUT_AI'
            | 'TABLE'
            | 'DIVIDER'
            | 'QUOTE';
          content?: Json;
          is_completed?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          parent_block_id?: string | null;
          type?:
            | 'HEADING_1'
            | 'HEADING_2'
            | 'HEADING_3'
            | 'PARAGRAPH'
            | 'CHECKLIST'
            | 'CODE'
            | 'CALLOUT_AI'
            | 'TABLE'
            | 'DIVIDER'
            | 'QUOTE';
          content?: Json;
          is_completed?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          workspace_id: string;
          note_id: string | null;
          user_id: string;
          action: 'CREATED' | 'EDITED' | 'COMMENTED' | 'SYNCED' | 'VIEWED';
          version: string | null;
          comment_count: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          note_id?: string | null;
          user_id: string;
          action: 'CREATED' | 'EDITED' | 'COMMENTED' | 'SYNCED' | 'VIEWED';
          version?: string | null;
          comment_count?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          note_id?: string | null;
          user_id?: string;
          action?: 'CREATED' | 'EDITED' | 'COMMENTED' | 'SYNCED' | 'VIEWED';
          version?: string | null;
          comment_count?: number;
          metadata?: Json;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          plan: 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';
          billing_cycle: 'MONTHLY' | 'YEARLY';
          status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
          ai_credit_limit: number;
          ai_credit_used: number;
          trial_ends_at: string | null;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          plan?: 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';
          billing_cycle?: 'MONTHLY' | 'YEARLY';
          status?: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
          ai_credit_limit?: number;
          ai_credit_used?: number;
          trial_ends_at?: string | null;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          plan?: 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';
          billing_cycle?: 'MONTHLY' | 'YEARLY';
          status?: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
          ai_credit_limit?: number;
          ai_credit_used?: number;
          trial_ends_at?: string | null;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_transactions: {
        Row: {
          id: string;
          order_number: string;
          subscription_id: string | null;
          workspace_id: string;
          user_id: string;
          amount: number;
          vat: number;
          discount_amount: number;
          total_amount: number;
          currency: string;
          method: 'CARD' | 'EASY_PAY' | 'BANK_TRANSFER';
          card_provider: string | null;
          card_number_masked: string | null;
          installment_months: number;
          receipt_url: string | null;
          paid_at: string;
          status: 'SUCCESS' | 'FAILED' | 'REFUNDED';
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          subscription_id?: string | null;
          workspace_id: string;
          user_id: string;
          amount: number;
          vat: number;
          discount_amount?: number;
          total_amount: number;
          currency?: string;
          method?: 'CARD' | 'EASY_PAY' | 'BANK_TRANSFER';
          card_provider?: string | null;
          card_number_masked?: string | null;
          installment_months?: number;
          receipt_url?: string | null;
          paid_at?: string;
          status?: 'SUCCESS' | 'FAILED' | 'REFUNDED';
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          subscription_id?: string | null;
          workspace_id?: string;
          user_id?: string;
          amount?: number;
          vat?: number;
          discount_amount?: number;
          total_amount?: number;
          currency?: string;
          method?: 'CARD' | 'EASY_PAY' | 'BANK_TRANSFER';
          card_provider?: string | null;
          card_number_masked?: string | null;
          installment_months?: number;
          receipt_url?: string | null;
          paid_at?: string;
          status?: 'SUCCESS' | 'FAILED' | 'REFUNDED';
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_workspace_member: {
        Args: {
          lookup_workspace_id: string;
        };
        Returns: boolean;
      };
      is_workspace_admin: {
        Args: {
          lookup_workspace_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
