
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": string,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blocked_users": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocked_users_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocked_users_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comment_likes": {
                  Row: {
                    "comment_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "comment_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comment_likes_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comment_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comment_likes_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comment_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"deleted_at": string | null,"id": string,"like_count": number,"moderation_status": Database["public"]['Enums']["moderation_status"],"parent_id": string | null,"post_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"like_count"?: number,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"parent_id"?: string | null,"post_id": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"like_count"?: number,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"parent_id"?: string | null,"post_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comment_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"follower_id": string,"following_id": string,"status": Database["public"]['Enums']["follow_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"follower_id": string,"following_id": string,"status"?: Database["public"]['Enums']["follow_status"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"follower_id"?: string,"following_id"?: string,"status"?: Database["public"]['Enums']["follow_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_following_id_fkey"
      columns: ["following_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"martial_art_ranks": {
                  Row: {
                    "color_hex": string | null,"created_at": string,"id": string,"martial_art_id": string,"max_degrees": number,"min_age": number | null,"name": string,"ordinal": number,"secondary_color_hex": string | null,"track": Database["public"]['Enums']["rank_track"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color_hex"?: string | null,"created_at"?: string,"id"?: string,"martial_art_id": string,"max_degrees"?: number,"min_age"?: number | null,"name": string,"ordinal": number,"secondary_color_hex"?: string | null,"track"?: Database["public"]['Enums']["rank_track"],"updated_at"?: string
                  }
                  Update: {
                    "color_hex"?: string | null,"created_at"?: string,"id"?: string,"martial_art_id"?: string,"max_degrees"?: number,"min_age"?: number | null,"name"?: string,"ordinal"?: number,"secondary_color_hex"?: string | null,"track"?: Database["public"]['Enums']["rank_track"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "martial_art_ranks_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    }
                  ]
                },"martial_arts": {
                  Row: {
                    "created_at": string,"description": string | null,"has_ranks": boolean,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"has_ranks"?: boolean,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"has_ranks"?: boolean,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"comment_id": string | null,"created_at": string,"id": string,"post_id": string | null,"read_at": string | null,"recipient_id": string,"type": Database["public"]['Enums']["notification_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"comment_id"?: string | null,"created_at"?: string,"id"?: string,"post_id"?: string | null,"read_at"?: string | null,"recipient_id": string,"type": Database["public"]['Enums']["notification_type"]
                  }
                  Update: {
                    "actor_id"?: string | null,"comment_id"?: string | null,"created_at"?: string,"id"?: string,"post_id"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"type"?: Database["public"]['Enums']["notification_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comment_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_media": {
                  Row: {
                    "alt_text": string | null,"created_at": string,"duration_ms": number | null,"height": number | null,"id": string,"position": number,"post_id": string,"size_bytes": number | null,"status": Database["public"]['Enums']["media_status"],"storage_path": string,"thumbnail_path": string | null,"type": Database["public"]['Enums']["media_type"],"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string | null,"created_at"?: string,"duration_ms"?: number | null,"height"?: number | null,"id"?: string,"position": number,"post_id": string,"size_bytes"?: number | null,"status"?: Database["public"]['Enums']["media_status"],"storage_path": string,"thumbnail_path"?: string | null,"type"?: Database["public"]['Enums']["media_type"],"width"?: number | null
                  }
                  Update: {
                    "alt_text"?: string | null,"created_at"?: string,"duration_ms"?: number | null,"height"?: number | null,"id"?: string,"position"?: number,"post_id"?: string,"size_bytes"?: number | null,"status"?: Database["public"]['Enums']["media_status"],"storage_path"?: string,"thumbnail_path"?: string | null,"type"?: Database["public"]['Enums']["media_type"],"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_mentions": {
                  Row: {
                    "created_at": string,"post_id": string,"responded_at": string | null,"status": Database["public"]['Enums']["mention_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["mention_status"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["mention_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_mentions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_mentions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_mentions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"caption": string,"comment_count": number,"created_at": string,"deleted_at": string | null,"external_video_url": string | null,"id": string,"kind": Database["public"]['Enums']["post_kind"],"like_count": number,"location_label": string | null,"martial_art_id": string | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"save_count": number,"search_vector": unknown,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"caption"?: string,"comment_count"?: number,"created_at"?: string,"deleted_at"?: string | null,"external_video_url"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number,"location_label"?: string | null,"martial_art_id"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"save_count"?: number,"search_vector"?: never,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "author_id"?: string,"caption"?: string,"comment_count"?: number,"created_at"?: string,"deleted_at"?: string | null,"external_video_url"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number,"location_label"?: string | null,"martial_art_id"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"save_count"?: number,"search_vector"?: never,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"bio": string | null,"city": string | null,"cover_path": string | null,"created_at": string,"display_name": string,"follower_count": number,"following_count": number,"id": string,"is_private": boolean,"post_count": number,"search_vector": unknown,"state": string | null,"status": Database["public"]['Enums']["account_status"],"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"cover_path"?: string | null,"created_at"?: string,"display_name": string,"follower_count"?: number,"following_count"?: number,"id": string,"is_private"?: boolean,"post_count"?: number,"search_vector"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"cover_path"?: string | null,"created_at"?: string,"display_name"?: string,"follower_count"?: number,"following_count"?: number,"id"?: string,"is_private"?: boolean,"post_count"?: number,"search_vector"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"details": string | null,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_posts": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_posts_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_posts_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_posts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["platform_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["platform_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["platform_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "birth_date": string,"created_at": string,"locale": string,"notify_comments": boolean,"notify_events": boolean,"notify_follows": boolean,"notify_likes": boolean,"notify_mentions": boolean,"privacy_accepted_at": string,"show_academies": Database["public"]['Enums']["visibility"],"show_achievements": Database["public"]['Enums']["visibility"],"show_checkins": Database["public"]['Enums']["visibility"],"show_ranks": Database["public"]['Enums']["visibility"],"terms_accepted_at": string,"theme": Database["public"]['Enums']["theme_preference"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_date": string,"created_at"?: string,"locale"?: string,"notify_comments"?: boolean,"notify_events"?: boolean,"notify_follows"?: boolean,"notify_likes"?: boolean,"notify_mentions"?: boolean,"privacy_accepted_at": string,"show_academies"?: Database["public"]['Enums']["visibility"],"show_achievements"?: Database["public"]['Enums']["visibility"],"show_checkins"?: Database["public"]['Enums']["visibility"],"show_ranks"?: Database["public"]['Enums']["visibility"],"terms_accepted_at": string,"theme"?: Database["public"]['Enums']["theme_preference"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "birth_date"?: string,"created_at"?: string,"locale"?: string,"notify_comments"?: boolean,"notify_events"?: boolean,"notify_follows"?: boolean,"notify_likes"?: boolean,"notify_mentions"?: boolean,"privacy_accepted_at"?: string,"show_academies"?: Database["public"]['Enums']["visibility"],"show_achievements"?: Database["public"]['Enums']["visibility"],"show_checkins"?: Database["public"]['Enums']["visibility"],"show_ranks"?: Database["public"]['Enums']["visibility"],"terms_accepted_at"?: string,"theme"?: Database["public"]['Enums']["theme_preference"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "comment_cards": {
                  Row: {
                    "author_avatar_path": string | null,"author_display_name": string,"author_id": string,"author_username": string | null,"body": string,"created_at": string,"id": string,"like_count": number,"moderation_status": Database["public"]['Enums']["moderation_status"],"parent_id": string | null,"post_id": string,"viewer_has_liked": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comment_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_cards": {
                  Row: {
                    "actor_avatar_path": string | null,"actor_display_name": string | null,"actor_id": string | null,"actor_username": string | null,"comment_id": string | null,"created_at": string,"id": string,"post_excerpt": string | null,"post_id": string | null,"read_at": string | null,"type": Database["public"]['Enums']["notification_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comment_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_cards": {
                  Row: {
                    "author_avatar_path": string | null,"author_display_name": string,"author_id": string,"author_username": string | null,"caption": string,"comment_count": number,"created_at": string,"id": string,"kind": Database["public"]['Enums']["post_kind"],"like_count": number,"location_label": string | null,"martial_art_id": string | null,"martial_art_name": string | null,"media": Json | null,"mentions": Json | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"save_count": number,"viewer_has_liked": boolean | null,"viewer_has_saved": boolean | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "can_interact_with_post":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"can_view_post":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"can_view_post_row":
{ Args: { "p_author": string,"p_deleted_at": string,"p_moderation": Database["public"]['Enums']["moderation_status"],"p_visibility": Database["public"]['Enums']["visibility"] }; Returns: boolean
                           },
"can_view_profile_content":
{ Args: { "owner": string }; Returns: boolean
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window": string }; Returns: boolean
                           },
"create_post":
{ Args: { "p_caption": string,"p_id": string,"p_location_label"?: string,"p_martial_art_id"?: string,"p_media"?: Json,"p_visibility"?: Database["public"]['Enums']["visibility"] }; Returns: string
                           },
"delete_comment":
{ Args: { "p_comment_id": string }; Returns: undefined
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"delete_post":
{ Args: { "p_post_id": string }; Returns: undefined
                           },
"enforce_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window": string }; Returns: undefined
                           },
"get_explore":
{ Args: { "p_limit"?: number,"p_page"?: number }; Returns: {
              "author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"caption": string,
"comment_count": number,
"created_at": string,
"id": string,
"kind": Database["public"]['Enums']["post_kind"],
"like_count": number,
"location_label": string | null,
"martial_art_id": string | null,
"martial_art_name": string | null,
"media": Json | null,
"mentions": Json | null,
"moderation_status": Database["public"]['Enums']["moderation_status"],
"save_count": number,
"viewer_has_liked": boolean | null,
"viewer_has_saved": boolean | null,
"visibility": Database["public"]['Enums']["visibility"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "post_cards"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_home_feed":
{ Args: { "p_before_created_at"?: string,"p_before_id"?: string,"p_limit"?: number }; Returns: {
              "author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"caption": string,
"comment_count": number,
"created_at": string,
"id": string,
"kind": Database["public"]['Enums']["post_kind"],
"like_count": number,
"location_label": string | null,
"martial_art_id": string | null,
"martial_art_name": string | null,
"media": Json | null,
"mentions": Json | null,
"moderation_status": Database["public"]['Enums']["moderation_status"],
"save_count": number,
"viewer_has_liked": boolean | null,
"viewer_has_saved": boolean | null,
"visibility": Database["public"]['Enums']["visibility"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "post_cards"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_profile_posts":
{ Args: { "p_author_id": string,"p_before_created_at"?: string,"p_before_id"?: string,"p_limit"?: number }; Returns: {
              "author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"caption": string,
"comment_count": number,
"created_at": string,
"id": string,
"kind": Database["public"]['Enums']["post_kind"],
"like_count": number,
"location_label": string | null,
"martial_art_id": string | null,
"martial_art_name": string | null,
"media": Json | null,
"mentions": Json | null,
"moderation_status": Database["public"]['Enums']["moderation_status"],
"save_count": number,
"viewer_has_liked": boolean | null,
"viewer_has_saved": boolean | null,
"visibility": Database["public"]['Enums']["visibility"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "post_cards"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_saved_posts":
{ Args: { "p_before_saved_at"?: string,"p_limit"?: number }; Returns: {
              "post": Database["public"]['Views']["post_cards"]['Row'],"saved_at": string
            }[]
                           },
"has_blocked_me":
{ Args: { "other": string }; Returns: boolean
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["platform_role"] }; Returns: boolean
                           },
"immutable_unaccent":
{ Args: { "": string }; Returns: string
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_following":
{ Args: { "target": string }; Returns: boolean
                           },
"is_username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"notify":
{ Args: { "p_actor": string,"p_comment"?: string,"p_post"?: string,"p_recipient": string,"p_type": Database["public"]['Enums']["notification_type"] }; Returns: undefined
                           },
"purge_rate_limits":
{ Args: { "p_older_than"?: string }; Returns: number
                           },
"search_normalize":
{ Args: { "": string }; Returns: string
                           },
"search_profiles":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "avatar_path": string,"city": string,"display_name": string,"id": string,"is_private": boolean,"state": string,"username": string
            }[]
                           }
          }
          Enums: {
            "account_status": "active"|"suspended"|"deleted","follow_status": "pending"|"accepted","media_status": "uploading"|"processing"|"ready"|"failed","media_type": "image"|"video","mention_status": "pending"|"approved"|"rejected","moderation_status": "visible"|"under_review"|"removed","notification_type": "follow"|"follow_request"|"like"|"comment"|"reply"|"mention"|"class_update"|"event_update"|"promotion_confirmed"|"membership_request"|"moderation","platform_role": "moderator"|"admin"|"superadmin","post_kind": "standard"|"checkin"|"achievement"|"event_share","rank_track": "adult"|"kids","report_reason": "spam"|"harassment"|"violence"|"nudity"|"minor_safety"|"impersonation"|"misinformation"|"other","report_status": "open"|"in_review"|"resolved"|"dismissed","report_target": "post"|"comment"|"profile"|"academy"|"event","theme_preference": "light"|"dark"|"system","visibility": "public"|"followers"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "suspended", "deleted"],"follow_status": ["pending", "accepted"],"media_status": ["uploading", "processing", "ready", "failed"],"media_type": ["image", "video"],"mention_status": ["pending", "approved", "rejected"],"moderation_status": ["visible", "under_review", "removed"],"notification_type": ["follow", "follow_request", "like", "comment", "reply", "mention", "class_update", "event_update", "promotion_confirmed", "membership_request", "moderation"],"platform_role": ["moderator", "admin", "superadmin"],"post_kind": ["standard", "checkin", "achievement", "event_share"],"rank_track": ["adult", "kids"],"report_reason": ["spam", "harassment", "violence", "nudity", "minor_safety", "impersonation", "misinformation", "other"],"report_status": ["open", "in_review", "resolved", "dismissed"],"report_target": ["post", "comment", "profile", "academy", "event"],"theme_preference": ["light", "dark", "system"],"visibility": ["public", "followers", "private"]
          }
        }
} as const
