export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          changed_by: string | null
          context: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          context?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          context?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          file_id: string
          id: string
          permission_level: string | null
          shared_by_id: string
          shared_with_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_id: string
          id?: string
          permission_level?: string | null
          shared_by_id: string
          shared_with_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_id?: string
          id?: string
          permission_level?: string | null
          shared_by_id?: string
          shared_with_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_shared_by_id_fkey"
            columns: ["shared_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tag_relations: {
        Row: {
          file_id: string
          tag_id: string
        }
        Insert: {
          file_id: string
          tag_id: string
        }
        Update: {
          file_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tag_relations_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "file_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          description: string | null
          download_count: number | null
          file_type: string
          folder_id: string | null
          id: string
          is_public: boolean | null
          is_starred: boolean | null
          mime_type: string | null
          name: string
          original_name: string
          owner_id: string
          project_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_type: string
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          is_starred?: boolean | null
          mime_type?: string | null
          name: string
          original_name: string
          owner_id: string
          project_id: string
          size_bytes: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_type?: string
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          is_starred?: boolean | null
          mime_type?: string | null
          name?: string
          original_name?: string
          owner_id?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          path: string
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          path: string
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          path?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          position: number
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          opportunity_id: string | null
          scheduled_at: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string | null
          scheduled_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string | null
          scheduled_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_columns: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          position: number
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          opportunity_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_comments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_metrics_history: {
        Row: {
          changed_at: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          opportunity_id: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          opportunity_id?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          opportunity_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_metrics_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_metrics_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunities: {
        Row: {
          assignee: string | null
          client_company: string | null
          client_email: string | null
          client_industry: string | null
          client_name: string | null
          client_phone: string | null
          client_website: string | null
          column_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_value: number | null
          description: string | null
          expected_close_date: string | null
          id: string
          lost_date: string | null
          lost_reason: string | null
          position: number
          probability: number | null
          project_id: string | null
          source: string | null
          title: string
          updated_at: string | null
          won_date: string | null
        }
        Insert: {
          assignee?: string | null
          client_company?: string | null
          client_email?: string | null
          client_industry?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_website?: string | null
          column_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_value?: number | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_date?: string | null
          lost_reason?: string | null
          position?: number
          probability?: number | null
          project_id?: string | null
          source?: string | null
          title: string
          updated_at?: string | null
          won_date?: string | null
        }
        Update: {
          assignee?: string | null
          client_company?: string | null
          client_email?: string | null
          client_industry?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_website?: string | null
          column_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_value?: number | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_date?: string | null
          lost_reason?: string | null
          position?: number
          probability?: number | null
          project_id?: string | null
          source?: string | null
          title?: string
          updated_at?: string | null
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "sales_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposals: {
        Row: {
          id: string
          opportunity_id: string
          title: string
          version: number
          status: string
          total_price: number | null
          currency: string | null
          valid_until: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          opportunity_id: string
          title: string
          version?: number
          status?: string
          total_price?: number | null
          currency?: string | null
          valid_until?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string
          title?: string
          version?: number
          status?: string
          total_price?: number | null
          currency?: string | null
          valid_until?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_deliverables: {
        Row: {
          id: string
          proposal_id: string
          title: string
          description: string | null
          quantity: number
          unit_price: number
          total_price: number
          delivery_time: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          proposal_id: string
          title: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          delivery_time?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          proposal_id?: string
          title?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          delivery_time?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_deliverables_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_activity_log: {
        Row: {
          id: string
          proposal_id: string
          action: string
          description: string | null
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          proposal_id: string
          action: string
          description?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          proposal_id?: string
          action?: string
          description?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_activity_log_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mentioned_users: string[] | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentioned_users?: string[] | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentioned_users?: string[] | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          id: string
          tag_id: string | null
          task_id: string | null
        }
        Insert: {
          id?: string
          tag_id?: string | null
          task_id?: string | null
        }
        Update: {
          id?: string
          tag_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_log: {
        Row: {
          column_id: string
          column_name: string
          created_at: string
          duration_seconds: number
          end_time: string
          id: string
          start_time: string
          task_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          column_id: string
          column_name: string
          created_at?: string
          duration_seconds: number
          end_time: string
          id?: string
          start_time: string
          task_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          column_id?: string
          column_name?: string
          created_at?: string
          duration_seconds?: number
          end_time?: string
          id?: string
          start_time?: string
          task_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_time_log_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          author: string | null
          column_id: string | null
          complexity: string | null
          created_at: string | null
          current_status_start_time: string | null
          description: string | null
          function_points: number | null
          id: string
          position: number
          project_id: string | null
          status_image_filenames: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          author?: string | null
          column_id?: string | null
          complexity?: string | null
          created_at?: string | null
          current_status_start_time?: string | null
          description?: string | null
          function_points?: number | null
          id?: string
          position?: number
          project_id?: string | null
          status_image_filenames?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          author?: string | null
          column_id?: string | null
          complexity?: string | null
          created_at?: string | null
          current_status_start_time?: string | null
          description?: string | null
          function_points?: number | null
          id?: string
          position?: number
          project_id?: string | null
          status_image_filenames?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_author_fkey"
            columns: ["author"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_point_awards: {
        Row: {
          awarded_at: string | null
          from_column_id: string | null
          id: string
          points_awarded: number
          project_id: string | null
          task_complexity: string
          task_id: string
          task_title: string
          to_column_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          from_column_id?: string | null
          id?: string
          points_awarded: number
          project_id?: string | null
          task_complexity: string
          task_id: string
          task_title: string
          to_column_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          from_column_id?: string | null
          id?: string
          points_awarded?: number
          project_id?: string | null
          task_complexity?: string
          task_id?: string
          task_title?: string
          to_column_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_point_awards_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_awards_from_column_id_fkey"
            columns: ["from_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_awards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_awards_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_awards_to_column_id_fkey"
            columns: ["to_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string | null
          id: string
          total_points: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          total_points?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          total_points?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_points_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_projects: {
        Row: {
          id: string
          joined_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      proposal_summary: {
        Row: {
          id: string | null
          title: string | null
          version: number | null
          status: string | null
          total_price: number | null
          currency: string | null
          valid_until: string | null
          opportunity_id: string | null
          opportunity_title: string | null
          client_name: string | null
          client_company: string | null
          deliverable_count: number | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          created_by_name: string | null
        }
        Relationships: []
      }
      sales_pipeline_summary: {
        Row: {
          avg_deal_value: number | null
          avg_probability: number | null
          color: string | null
          opportunity_count: number | null
          stage: string | null
          total_value: number | null
        }
        Relationships: []
      }
      sales_team_performance: {
        Row: {
          lost_deals: number | null
          salesperson: string | null
          total_opportunities: number | null
          total_pipeline_value: number | null
          won_deals: number | null
          won_value: number | null
        }
        Relationships: []
      }
      user_point_awards_detailed: {
        Row: {
          awarded_at: string | null
          from_column_name: string | null
          id: string | null
          points_awarded: number | null
          project_color: string | null
          project_name: string | null
          task_complexity: string | null
          task_id: string | null
          task_title: string | null
          to_column_name: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_point_awards_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_awards_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points_with_names: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string | null
          id: string | null
          total_awards: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_points_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      atomic_add_task_tag: {
        Args: { p_task_id: string; p_tag_id: string; p_user_id?: string }
        Returns: Json
      }
      atomic_batch_update_task_tags: {
        Args: { p_task_id: string; p_tag_ids: string[]; p_user_id?: string }
        Returns: Json
      }
      atomic_remove_task_tag: {
        Args: { p_task_id: string; p_tag_id: string; p_user_id?: string }
        Returns: Json
      }
      atomic_toggle_task_tag: {
        Args: { p_task_id: string; p_tag_id: string; p_user_id?: string }
        Returns: Json
      }
      award_points_for_completed_task: {
        Args: {
          p_task_id: string
          p_user_id: string
          p_points: number
          p_task_title: string
          p_task_complexity: string
          p_from_column_id: string
          p_to_column_id: string
          p_project_id: string
        }
        Returns: undefined
      }
      get_entity_history: {
        Args: { p_entity_type: string; p_entity_id: string; p_limit?: number }
        Returns: {
          id: string
          action_type: string
          old_data: Json
          new_data: Json
          changed_by: string
          context: Json
          created_at: string
        }[]
      }
      get_storage_breakdown: {
        Args: { user_id: string }
        Returns: Json
      }
      get_user_storage_usage: {
        Args: { user_id: string }
        Returns: number
      }
      move_sales_opportunity: {
        Args: {
          p_opportunity_id: string
          p_new_column_id: string
          p_new_position: number
        }
        Returns: undefined
      }
      normalize_task_positions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_multiple_task_positions: {
        Args: { updates: Json }
        Returns: undefined
      }
      update_task_assignee_with_time_tracking: {
        Args: {
          p_task_id: string
          p_new_assignee?: string
          p_other_updates?: Json
        }
        Returns: undefined
      }
      update_task_with_time_tracking: {
        Args: { p_task_id: string; p_updates: Json; p_column_changed: boolean }
        Returns: undefined
      }
      update_task_with_time_tracking_and_points: {
        Args: {
          p_task_id: string
          p_updates: Json
          p_column_changed: boolean
          p_is_completing: boolean
        }
        Returns: undefined
      }
      validate_task_positions: {
        Args: Record<PropertyKey, never>
        Returns: {
          column_id: string
          has_duplicates: boolean
          max_gap: number
        }[]
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
