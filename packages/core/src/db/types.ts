
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
            "academies": {
                  Row: {
                    "contact_email": string | null,"contact_phone": string | null,"cover_path": string | null,"created_at": string,"created_by": string | null,"description": string | null,"external_links": NonNullable<Json>,"follower_count": number,"id": string,"instagram": string | null,"is_verified": boolean,"logo_path": string | null,"name": string,"search_vector": unknown,"slug": string,"status": Database["public"]['Enums']["academy_status"],"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email"?: string | null,"contact_phone"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"external_links"?: NonNullable<Json>,"follower_count"?: number,"id"?: string,"instagram"?: string | null,"is_verified"?: boolean,"logo_path"?: string | null,"name": string,"search_vector"?: never,"slug": string,"status"?: Database["public"]['Enums']["academy_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "contact_email"?: string | null,"contact_phone"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"external_links"?: NonNullable<Json>,"follower_count"?: number,"id"?: string,"instagram"?: string | null,"is_verified"?: boolean,"logo_path"?: string | null,"name"?: string,"search_vector"?: never,"slug"?: string,"status"?: Database["public"]['Enums']["academy_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "academies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"academy_followers": {
                  Row: {
                    "academy_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "academy_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academy_followers_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_followers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"academy_martial_arts": {
                  Row: {
                    "academy_id": string,"martial_art_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"martial_art_id": string
                  }
                  Update: {
                    "academy_id"?: string,"martial_art_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academy_martial_arts_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_martial_arts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    }
                  ]
                },"academy_memberships": {
                  Row: {
                    "academy_id": string,"approved_at": string | null,"approved_by": string | null,"created_at": string,"requested_by": Database["public"]['Enums']["membership_requester"],"role": Database["public"]['Enums']["membership_role"],"status": Database["public"]['Enums']["membership_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"requested_by": Database["public"]['Enums']["membership_requester"],"role": Database["public"]['Enums']["membership_role"],"status"?: Database["public"]['Enums']["membership_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "academy_id"?: string,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"requested_by"?: Database["public"]['Enums']["membership_requester"],"role"?: Database["public"]['Enums']["membership_role"],"status"?: Database["public"]['Enums']["membership_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academy_memberships_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_memberships_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"academy_photos": {
                  Row: {
                    "academy_id": string,"caption": string | null,"created_at": string,"created_by": string | null,"height": number | null,"id": string,"path": string,"position": number,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"path": string,"position"?: number,"width"?: number | null
                  }
                  Update: {
                    "academy_id"?: string,"caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"path"?: string,"position"?: number,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "academy_photos_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_photos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"academy_unit_access": {
                  Row: {
                    "academy_id": string,"accepted": boolean,"access_hours": string | null,"id": string,"kind": Database["public"]['Enums']["unit_access_kind"],"martial_art_ids": (string)[],"notes": string | null,"plans": (string)[],"price_cents": number | null,"price_status": Database["public"]['Enums']["price_status"] | null,"restrictions": string | null,"unit_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"accepted"?: boolean,"access_hours"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["unit_access_kind"],"martial_art_ids"?: (string)[],"notes"?: string | null,"plans"?: (string)[],"price_cents"?: number | null,"price_status"?: Database["public"]['Enums']["price_status"] | null,"restrictions"?: string | null,"unit_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "academy_id"?: string,"accepted"?: boolean,"access_hours"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["unit_access_kind"],"martial_art_ids"?: (string)[],"notes"?: string | null,"plans"?: (string)[],"price_cents"?: number | null,"price_status"?: Database["public"]['Enums']["price_status"] | null,"restrictions"?: string | null,"unit_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "academy_unit_access_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_unit_access_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "academy_units"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "academy_unit_access_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"academy_units": {
                  Row: {
                    "academy_id": string,"city": string,"complement": string | null,"coords_confirmed_at": string | null,"coords_source": Database["public"]['Enums']["coords_source"] | null,"created_at": string,"id": string,"is_active": boolean,"latitude": number | null,"location": unknown,"longitude": number | null,"name": string,"neighborhood": string | null,"number": string | null,"postal_code": string | null,"reference_point": string | null,"state": string,"street": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"city": string,"complement"?: string | null,"coords_confirmed_at"?: string | null,"coords_source"?: Database["public"]['Enums']["coords_source"] | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"latitude"?: number | null,"location"?: never,"longitude"?: number | null,"name": string,"neighborhood"?: string | null,"number"?: string | null,"postal_code"?: string | null,"reference_point"?: string | null,"state": string,"street"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "academy_id"?: string,"city"?: string,"complement"?: string | null,"coords_confirmed_at"?: string | null,"coords_source"?: Database["public"]['Enums']["coords_source"] | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"latitude"?: number | null,"location"?: never,"longitude"?: number | null,"name"?: string,"neighborhood"?: string | null,"number"?: string | null,"postal_code"?: string | null,"reference_point"?: string | null,"state"?: string,"street"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academy_units_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_audit_log": {
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
                },"athlete_achievements": {
                  Row: {
                    "achieved_on": string,"created_at": string,"division": string | null,"event_id": string | null,"event_name": string | null,"evidence_url": string | null,"id": string,"martial_art_id": string | null,"medal": Database["public"]['Enums']["medal"] | null,"placement": number | null,"title": string,"type": Database["public"]['Enums']["achievement_type"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_on": string,"created_at"?: string,"division"?: string | null,"event_id"?: string | null,"event_name"?: string | null,"evidence_url"?: string | null,"id"?: string,"martial_art_id"?: string | null,"medal"?: Database["public"]['Enums']["medal"] | null,"placement"?: number | null,"title": string,"type"?: Database["public"]['Enums']["achievement_type"],"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "achieved_on"?: string,"created_at"?: string,"division"?: string | null,"event_id"?: string | null,"event_name"?: string | null,"evidence_url"?: string | null,"id"?: string,"martial_art_id"?: string | null,"medal"?: Database["public"]['Enums']["medal"] | null,"placement"?: number | null,"title"?: string,"type"?: Database["public"]['Enums']["achievement_type"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "athlete_achievements_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "event_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "athlete_achievements_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "athlete_achievements_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "athlete_achievements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"business_followers": {
                  Row: {
                    "business_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_followers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_followers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"business_items": {
                  Row: {
                    "business_id": string,"created_at": string,"description": string | null,"id": string,"image_path": string | null,"is_active": boolean,"kind": Database["public"]['Enums']["catalog_item_kind"],"name": string,"position": number,"price_cents": number | null,"price_status": Database["public"]['Enums']["price_status"],"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["catalog_item_kind"],"name": string,"position"?: number,"price_cents"?: number | null,"price_status"?: Database["public"]['Enums']["price_status"],"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["catalog_item_kind"],"name"?: string,"position"?: number,"price_cents"?: number | null,"price_status"?: Database["public"]['Enums']["price_status"],"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_items_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_members": {
                  Row: {
                    "business_id": string,"created_at": string,"invited_by": string | null,"role": Database["public"]['Enums']["business_role"],"status": Database["public"]['Enums']["business_member_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"invited_by"?: string | null,"role": Database["public"]['Enums']["business_role"],"status"?: Database["public"]['Enums']["business_member_status"],"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["business_role"],"status"?: Database["public"]['Enums']["business_member_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_members_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_members_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"business_promotions": {
                  Row: {
                    "business_id": string,"coupon_code": string | null,"created_at": string,"description": string | null,"ends_on": string | null,"id": string,"starts_on": string,"title": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"coupon_code"?: string | null,"created_at"?: string,"description"?: string | null,"ends_on"?: string | null,"id"?: string,"starts_on"?: string,"title": string,"url"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"coupon_code"?: string | null,"created_at"?: string,"description"?: string | null,"ends_on"?: string | null,"id"?: string,"starts_on"?: string,"title"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_promotions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "category": Database["public"]['Enums']["business_category"],"city": string | null,"contact_email": string | null,"contact_phone": string | null,"cover_path": string | null,"created_at": string,"created_by": string | null,"description": string | null,"follower_count": number,"id": string,"instagram": string | null,"is_verified": boolean,"logo_path": string | null,"martial_art_ids": (string)[],"name": string,"search_vector": unknown,"slug": string,"state": string | null,"status": Database["public"]['Enums']["business_status"],"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["business_category"],"city"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"follower_count"?: number,"id"?: string,"instagram"?: string | null,"is_verified"?: boolean,"logo_path"?: string | null,"martial_art_ids"?: (string)[],"name": string,"search_vector"?: never,"slug": string,"state"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["business_category"],"city"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"follower_count"?: number,"id"?: string,"instagram"?: string | null,"is_verified"?: boolean,"logo_path"?: string | null,"martial_art_ids"?: (string)[],"name"?: string,"search_vector"?: never,"slug"?: string,"state"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "businesses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"class_schedules": {
                  Row: {
                    "academy_id": string,"accepts_trial": boolean,"created_at": string,"ends_at": string,"id": string,"level": Database["public"]['Enums']["class_level"],"martial_art_id": string,"name": string,"notes": string | null,"starts_at": string,"status": Database["public"]['Enums']["class_status"],"teacher_id": string | null,"unit_id": string,"updated_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id": string,"accepts_trial"?: boolean,"created_at"?: string,"ends_at": string,"id"?: string,"level"?: Database["public"]['Enums']["class_level"],"martial_art_id": string,"name": string,"notes"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["class_status"],"teacher_id"?: string | null,"unit_id": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "academy_id"?: string,"accepts_trial"?: boolean,"created_at"?: string,"ends_at"?: string,"id"?: string,"level"?: Database["public"]['Enums']["class_level"],"martial_art_id"?: string,"name"?: string,"notes"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["class_status"],"teacher_id"?: string | null,"unit_id"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_schedules_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_schedules_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_schedules_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_schedules_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "academy_units"
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
                },"commercial_appeals": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"id": string,"message": string,"response": string | null,"review_id": string,"status": Database["public"]['Enums']["appeal_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"message": string,"response"?: string | null,"review_id": string,"status"?: Database["public"]['Enums']["appeal_status"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"message"?: string,"response"?: string | null,"review_id"?: string,"status"?: Database["public"]['Enums']["appeal_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commercial_appeals_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commercial_appeals_review_id_fkey"
      columns: ["review_id"]
isOneToOne: true
      referencedRelation: "commercial_reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commercial_appeals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"commercial_reviews": {
                  Row: {
                    "decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"id": string,"opened_at": string,"reasons": NonNullable<Json>,"score": number,"status": Database["public"]['Enums']["commercial_review_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"id"?: string,"opened_at"?: string,"reasons"?: NonNullable<Json>,"score": number,"status"?: Database["public"]['Enums']["commercial_review_status"],"user_id": string
                  }
                  Update: {
                    "decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"id"?: string,"opened_at"?: string,"reasons"?: NonNullable<Json>,"score"?: number,"status"?: Database["public"]['Enums']["commercial_review_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commercial_reviews_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commercial_reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"commercial_risk": {
                  Row: {
                    "score": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "score": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "score"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commercial_risk_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"commercial_signals": {
                  Row: {
                    "code": string,"created_at": string,"excerpt": string | null,"id": string,"points": number,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"excerpt"?: string | null,"id"?: string,"points": number,"post_id": string,"user_id": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"excerpt"?: string | null,"id"?: string,"points"?: number,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commercial_signals_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commercial_signals_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commercial_signals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"event_interests": {
                  Row: {
                    "created_at": string,"event_id": string,"kind": Database["public"]['Enums']["event_interest_kind"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"kind": Database["public"]['Enums']["event_interest_kind"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"kind"?: Database["public"]['Enums']["event_interest_kind"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_interests_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "event_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_interests_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_interests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "academy_id": string | null,"city": string,"created_at": string,"created_by": string,"description": string | null,"ends_at": string,"external_url": string | null,"id": string,"interest_count": number,"latitude": number | null,"location": unknown,"longitude": number | null,"martial_art_id": string | null,"neighborhood": string | null,"number": string | null,"postal_code": string | null,"starts_at": string,"state": string,"status": Database["public"]['Enums']["event_status"],"street": string | null,"title": string,"type": Database["public"]['Enums']["event_type"],"unit_id": string | null,"updated_at": string,"venue_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"city": string,"created_at"?: string,"created_by": string,"description"?: string | null,"ends_at": string,"external_url"?: string | null,"id"?: string,"interest_count"?: number,"latitude"?: number | null,"location"?: never,"longitude"?: number | null,"martial_art_id"?: string | null,"neighborhood"?: string | null,"number"?: string | null,"postal_code"?: string | null,"starts_at": string,"state": string,"status"?: Database["public"]['Enums']["event_status"],"street"?: string | null,"title": string,"type"?: Database["public"]['Enums']["event_type"],"unit_id"?: string | null,"updated_at"?: string,"venue_name"?: string | null
                  }
                  Update: {
                    "academy_id"?: string | null,"city"?: string,"created_at"?: string,"created_by"?: string,"description"?: string | null,"ends_at"?: string,"external_url"?: string | null,"id"?: string,"interest_count"?: number,"latitude"?: number | null,"location"?: never,"longitude"?: number | null,"martial_art_id"?: string | null,"neighborhood"?: string | null,"number"?: string | null,"postal_code"?: string | null,"starts_at"?: string,"state"?: string,"status"?: Database["public"]['Enums']["event_status"],"street"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["event_type"],"unit_id"?: string | null,"updated_at"?: string,"venue_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "academy_units"
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
                },"geocode_cache": {
                  Row: {
                    "created_at": string,"provider": string,"query": string,"query_hash": string,"response": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"provider": string,"query": string,"query_hash": string,"response": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"provider"?: string,"query"?: string,"query_hash"?: string,"response"?: NonNullable<Json>
                  }
                  Relationships: [
                    
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
                    "created_at": string,"description": string | null,"has_ranks": boolean,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"teacher_min_ordinal": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"has_ranks"?: boolean,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"teacher_min_ordinal"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"has_ranks"?: boolean,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"teacher_min_ordinal"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": Database["public"]['Enums']["moderation_action"],"created_at": string,"expires_at": string | null,"id": string,"moderator_id": string | null,"reason": string | null,"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "action": Database["public"]['Enums']["moderation_action"],"created_at"?: string,"expires_at"?: string | null,"id"?: string,"moderator_id"?: string | null,"reason"?: string | null,"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["moderation_action"],"created_at"?: string,"expires_at"?: string | null,"id"?: string,"moderator_id"?: string | null,"reason"?: string | null,"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_actions_moderator_id_fkey"
      columns: ["moderator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "academy_id": string | null,"actor_id": string | null,"comment_id": string | null,"created_at": string,"event_id": string | null,"id": string,"post_id": string | null,"read_at": string | null,"recipient_id": string,"type": Database["public"]['Enums']["notification_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"actor_id"?: string | null,"comment_id"?: string | null,"created_at"?: string,"event_id"?: string | null,"id"?: string,"post_id"?: string | null,"read_at"?: string | null,"recipient_id": string,"type": Database["public"]['Enums']["notification_type"]
                  }
                  Update: {
                    "academy_id"?: string | null,"actor_id"?: string | null,"comment_id"?: string | null,"created_at"?: string,"event_id"?: string | null,"id"?: string,"post_id"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"type"?: Database["public"]['Enums']["notification_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
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
      foreignKeyName: "notifications_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "event_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
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
                },"plan_features": {
                  Row: {
                    "feature_key": string,"plan_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "feature_key": string,"plan_id": string,"value": number
                  }
                  Update: {
                    "feature_key"?: string,"plan_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "audience": Database["public"]['Enums']["plan_audience"],"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"price_label": string | null,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: Database["public"]['Enums']["plan_audience"],"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"price_label"?: string | null,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["plan_audience"],"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"price_label"?: string | null,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "announcement": string | null,"id": boolean,"signups_open": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "announcement"?: string | null,"id"?: boolean,"signups_open"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "announcement"?: string | null,"id"?: boolean,"signups_open"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_settings_updated_by_fkey"
      columns: ["updated_by"]
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
                    "academy_id": string | null,"author_id": string,"business_id": string | null,"caption": string,"comment_count": number,"created_at": string,"deleted_at": string | null,"external_video_url": string | null,"id": string,"kind": Database["public"]['Enums']["post_kind"],"like_count": number,"location_label": string | null,"martial_art_id": string | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"save_count": number,"search_vector": unknown,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"author_id": string,"business_id"?: string | null,"caption"?: string,"comment_count"?: number,"created_at"?: string,"deleted_at"?: string | null,"external_video_url"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number,"location_label"?: string | null,"martial_art_id"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"save_count"?: number,"search_vector"?: never,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "academy_id"?: string | null,"author_id"?: string,"business_id"?: string | null,"caption"?: string,"comment_count"?: number,"created_at"?: string,"deleted_at"?: string | null,"external_video_url"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number,"location_label"?: string | null,"martial_art_id"?: string | null,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"save_count"?: number,"search_vector"?: never,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
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
                    "avatar_path": string | null,"bio": string | null,"city": string | null,"cover_path": string | null,"created_at": string,"display_name": string,"follower_count": number,"following_count": number,"id": string,"is_private": boolean,"post_count": number,"search_vector": unknown,"state": string | null,"status": Database["public"]['Enums']["account_status"],"suspended_until": string | null,"suspension_reason": string | null,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"cover_path"?: string | null,"created_at"?: string,"display_name": string,"follower_count"?: number,"following_count"?: number,"id": string,"is_private"?: boolean,"post_count"?: number,"search_vector"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["account_status"],"suspended_until"?: string | null,"suspension_reason"?: string | null,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"cover_path"?: string | null,"created_at"?: string,"display_name"?: string,"follower_count"?: number,"following_count"?: number,"id"?: string,"is_private"?: boolean,"post_count"?: number,"search_vector"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["account_status"],"suspended_until"?: string | null,"suspension_reason"?: string | null,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rank_promotions": {
                  Row: {
                    "academy_id": string | null,"confirmed_at": string | null,"created_at": string,"degree": number,"id": string,"notes": string | null,"promoted_on": string,"rank_id": string,"teacher_id": string | null,"updated_at": string,"user_id": string,"user_martial_art_id": string,"verification": Database["public"]['Enums']["verification_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"degree"?: number,"id"?: string,"notes"?: string | null,"promoted_on": string,"rank_id": string,"teacher_id"?: string | null,"updated_at"?: string,"user_id": string,"user_martial_art_id": string,"verification"?: Database["public"]['Enums']["verification_status"]
                  }
                  Update: {
                    "academy_id"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"degree"?: number,"id"?: string,"notes"?: string | null,"promoted_on"?: string,"rank_id"?: string,"teacher_id"?: string | null,"updated_at"?: string,"user_id"?: string,"user_martial_art_id"?: string,"verification"?: Database["public"]['Enums']["verification_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "rank_promotions_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_rank_id_fkey"
      columns: ["rank_id"]
isOneToOne: false
      referencedRelation: "martial_art_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_user_martial_art_id_fkey"
      columns: ["user_martial_art_id"]
isOneToOne: false
      referencedRelation: "journey_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_user_martial_art_id_fkey"
      columns: ["user_martial_art_id"]
isOneToOne: false
      referencedRelation: "user_martial_arts"
      referencedColumns: ["id"]
    }
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
                },"storage_cleanup_queue": {
                  Row: {
                    "bucket_id": string,"object_name": string,"queued_at": string,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"object_name": string,"queued_at"?: string,"reason": string
                  }
                  Update: {
                    "bucket_id"?: string,"object_name"?: string,"queued_at"?: string,"reason"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscription_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"from_status": Database["public"]['Enums']["subscription_status"] | null,"id": string,"reason": string | null,"subscription_id": string,"to_status": Database["public"]['Enums']["subscription_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"from_status"?: Database["public"]['Enums']["subscription_status"] | null,"id"?: string,"reason"?: string | null,"subscription_id": string,"to_status"?: Database["public"]['Enums']["subscription_status"] | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"from_status"?: Database["public"]['Enums']["subscription_status"] | null,"id"?: string,"reason"?: string | null,"subscription_id"?: string,"to_status"?: Database["public"]['Enums']["subscription_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscription_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_events_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscription_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_events_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "academy_id": string | null,"business_id": string | null,"created_at": string,"created_by": string | null,"ends_on": string | null,"id": string,"notes": string | null,"plan_id": string,"starts_on": string,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"business_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"notes"?: string | null,"plan_id": string,"starts_on"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string
                  }
                  Update: {
                    "academy_id"?: string | null,"business_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"notes"?: string | null,"plan_id"?: string,"starts_on"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_classes": {
                  Row: {
                    "accepts_trial": boolean,"created_at": string,"ends_at": string,"id": string,"level": Database["public"]['Enums']["class_level"],"martial_art_id": string,"notes": string | null,"place_id": string,"starts_at": string,"teacher_id": string,"updated_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepts_trial"?: boolean,"created_at"?: string,"ends_at": string,"id"?: string,"level"?: Database["public"]['Enums']["class_level"],"martial_art_id": string,"notes"?: string | null,"place_id": string,"starts_at": string,"teacher_id": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "accepts_trial"?: boolean,"created_at"?: string,"ends_at"?: string,"id"?: string,"level"?: Database["public"]['Enums']["class_level"],"martial_art_id"?: string,"notes"?: string | null,"place_id"?: string,"starts_at"?: string,"teacher_id"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_classes_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_classes_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "teacher_places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_classes_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_classes_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"teacher_martial_arts": {
                  Row: {
                    "martial_art_id": string,"rank_id": string | null,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "martial_art_id": string,"rank_id"?: string | null,"teacher_id": string
                  }
                  Update: {
                    "martial_art_id"?: string,"rank_id"?: string | null,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_martial_arts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_martial_arts_rank_id_fkey"
      columns: ["rank_id"]
isOneToOne: false
      referencedRelation: "martial_art_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_martial_arts_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_martial_arts_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"teacher_places": {
                  Row: {
                    "academy_id": string | null,"city": string,"complement": string | null,"created_at": string,"id": string,"latitude": number | null,"location": unknown,"longitude": number | null,"name": string,"neighborhood": string | null,"number": string | null,"postal_code": string | null,"reference_point": string | null,"state": string,"street": string | null,"teacher_id": string,"unit_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"city": string,"complement"?: string | null,"created_at"?: string,"id"?: string,"latitude"?: number | null,"location"?: never,"longitude"?: number | null,"name": string,"neighborhood"?: string | null,"number"?: string | null,"postal_code"?: string | null,"reference_point"?: string | null,"state": string,"street"?: string | null,"teacher_id": string,"unit_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "academy_id"?: string | null,"city"?: string,"complement"?: string | null,"created_at"?: string,"id"?: string,"latitude"?: number | null,"location"?: never,"longitude"?: number | null,"name"?: string,"neighborhood"?: string | null,"number"?: string | null,"postal_code"?: string | null,"reference_point"?: string | null,"state"?: string,"street"?: string | null,"teacher_id"?: string,"unit_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_places_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_places_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_places_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_places_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "academy_units"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_profiles": {
                  Row: {
                    "access_plans": string | null,"bio": string | null,"certifications": NonNullable<Json>,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"experience_years": number | null,"lineage": string | null,"professional_name": string,"review_notes": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"show_contact": boolean,"social_links": NonNullable<Json>,"status": Database["public"]['Enums']["teacher_status"],"student_count": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_plans"?: string | null,"bio"?: string | null,"certifications"?: NonNullable<Json>,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"experience_years"?: number | null,"lineage"?: string | null,"professional_name": string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"show_contact"?: boolean,"social_links"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["teacher_status"],"student_count"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "access_plans"?: string | null,"bio"?: string | null,"certifications"?: NonNullable<Json>,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"experience_years"?: number | null,"lineage"?: string | null,"professional_name"?: string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"show_contact"?: boolean,"social_links"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["teacher_status"],"student_count"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_profiles_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_students": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"requested_by": string,"status": string,"student_id": string,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"requested_by": string,"status"?: string,"student_id": string,"teacher_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"requested_by"?: string,"status"?: string,"student_id"?: string,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_students_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_students_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_students_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"training_checkins": {
                  Row: {
                    "academy_id": string | null,"class_schedule_id": string | null,"created_at": string,"duration_min": number | null,"id": string,"martial_art_id": string,"notes": string | null,"post_id": string | null,"trained_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academy_id"?: string | null,"class_schedule_id"?: string | null,"created_at"?: string,"duration_min"?: number | null,"id"?: string,"martial_art_id": string,"notes"?: string | null,"post_id"?: string | null,"trained_at": string,"user_id": string
                  }
                  Update: {
                    "academy_id"?: string | null,"class_schedule_id"?: string | null,"created_at"?: string,"duration_min"?: number | null,"id"?: string,"martial_art_id"?: string,"notes"?: string | null,"post_id"?: string | null,"trained_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "training_checkins_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_class_schedule_id_fkey"
      columns: ["class_schedule_id"]
isOneToOne: false
      referencedRelation: "class_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_class_schedule_id_fkey"
      columns: ["class_schedule_id"]
isOneToOne: false
      referencedRelation: "class_schedules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_martial_arts": {
                  Row: {
                    "created_at": string,"current_degree": number,"current_rank_id": string | null,"federation": string | null,"id": string,"martial_art_id": string,"started_on": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_degree"?: number,"current_rank_id"?: string | null,"federation"?: string | null,"id"?: string,"martial_art_id": string,"started_on"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"current_degree"?: number,"current_rank_id"?: string | null,"federation"?: string | null,"id"?: string,"martial_art_id"?: string,"started_on"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_martial_arts_current_rank_id_fkey"
      columns: ["current_rank_id"]
isOneToOne: false
      referencedRelation: "martial_art_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_martial_arts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_martial_arts_user_id_fkey"
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
                    "birth_date": string | null,"created_at": string,"declared_age": number | null,"locale": string,"notify_comments": boolean,"notify_events": boolean,"notify_follows": boolean,"notify_likes": boolean,"notify_mentions": boolean,"privacy_accepted_at": string,"show_academies": Database["public"]['Enums']["visibility"],"show_achievements": Database["public"]['Enums']["visibility"],"show_checkins": Database["public"]['Enums']["visibility"],"show_ranks": Database["public"]['Enums']["visibility"],"terms_accepted_at": string,"theme": Database["public"]['Enums']["theme_preference"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_date"?: string | null,"created_at"?: string,"declared_age"?: number | null,"locale"?: string,"notify_comments"?: boolean,"notify_events"?: boolean,"notify_follows"?: boolean,"notify_likes"?: boolean,"notify_mentions"?: boolean,"privacy_accepted_at": string,"show_academies"?: Database["public"]['Enums']["visibility"],"show_achievements"?: Database["public"]['Enums']["visibility"],"show_checkins"?: Database["public"]['Enums']["visibility"],"show_ranks"?: Database["public"]['Enums']["visibility"],"terms_accepted_at": string,"theme"?: Database["public"]['Enums']["theme_preference"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "birth_date"?: string | null,"created_at"?: string,"declared_age"?: number | null,"locale"?: string,"notify_comments"?: boolean,"notify_events"?: boolean,"notify_follows"?: boolean,"notify_likes"?: boolean,"notify_mentions"?: boolean,"privacy_accepted_at"?: string,"show_academies"?: Database["public"]['Enums']["visibility"],"show_achievements"?: Database["public"]['Enums']["visibility"],"show_checkins"?: Database["public"]['Enums']["visibility"],"show_ranks"?: Database["public"]['Enums']["visibility"],"terms_accepted_at"?: string,"theme"?: Database["public"]['Enums']["theme_preference"],"updated_at"?: string,"user_id"?: string
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
            "checkin_cards": {
                  Row: {
                    "academy_id": string | null,"academy_name": string | null,"academy_slug": string | null,"class_name": string | null,"class_schedule_id": string | null,"created_at": string,"duration_min": number | null,"id": string,"martial_art_id": string,"martial_art_name": string,"notes": string | null,"post_id": string | null,"trained_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "training_checkins_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_class_schedule_id_fkey"
      columns: ["class_schedule_id"]
isOneToOne: false
      referencedRelation: "class_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_class_schedule_id_fkey"
      columns: ["class_schedule_id"]
isOneToOne: false
      referencedRelation: "class_schedules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "post_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_checkins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"class_cards": {
                  Row: {
                    "academy_id": string,"academy_name": string,"academy_slug": string,"academy_verified": boolean,"accepts_trial": boolean,"city": string,"complement": string | null,"ends_at": string,"id": string,"latitude": number | null,"level": Database["public"]['Enums']["class_level"],"longitude": number | null,"martial_art_id": string,"martial_art_name": string,"name": string,"neighborhood": string | null,"notes": string | null,"number": string | null,"postal_code": string | null,"reference_point": string | null,"starts_at": string,"state": string,"status": Database["public"]['Enums']["class_status"],"street": string | null,"teacher_display_name": string | null,"teacher_id": string | null,"teacher_username": string | null,"unit_id": string,"unit_name": string,"weekday": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "class_schedules_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_schedules_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_schedules_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_schedules_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "academy_units"
      referencedColumns: ["id"]
    }
                  ]
                },"comment_cards": {
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
                },"event_cards": {
                  Row: {
                    "academy_id": string | null,"academy_name": string | null,"academy_slug": string | null,"city": string,"created_at": string,"created_by": string,"description": string | null,"ends_at": string,"external_url": string | null,"id": string,"interest_count": number,"latitude": number | null,"longitude": number | null,"martial_art_id": string | null,"martial_art_name": string | null,"neighborhood": string | null,"number": string | null,"organizer_display_name": string,"organizer_username": string | null,"postal_code": string | null,"starts_at": string,"state": string,"status": Database["public"]['Enums']["event_status"],"street": string | null,"title": string,"type": Database["public"]['Enums']["event_type"],"unit_id": string | null,"venue_name": string | null,"viewer_interested": boolean | null,"viewer_saved": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "events_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "academy_units"
      referencedColumns: ["id"]
    }
                  ]
                },"journey_cards": {
                  Row: {
                    "current_confirmed": boolean | null,"current_degree": number,"current_rank_id": string | null,"federation": string | null,"has_ranks": boolean,"id": string,"martial_art_id": string,"martial_art_name": string,"martial_art_slug": string,"max_degrees": number | null,"rank_color": string | null,"rank_name": string | null,"rank_secondary_color": string | null,"sort_order": number,"started_on": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "user_martial_arts_current_rank_id_fkey"
      columns: ["current_rank_id"]
isOneToOne: false
      referencedRelation: "martial_art_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_martial_arts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_martial_arts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_cards": {
                  Row: {
                    "academy_id": string | null,"academy_name": string | null,"academy_slug": string | null,"actor_avatar_path": string | null,"actor_display_name": string | null,"actor_id": string | null,"actor_username": string | null,"comment_id": string | null,"created_at": string,"event_id": string | null,"event_status": Database["public"]['Enums']["event_status"] | null,"event_title": string | null,"id": string,"post_excerpt": string | null,"post_id": string | null,"read_at": string | null,"type": Database["public"]['Enums']["notification_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "notifications_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
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
      foreignKeyName: "notifications_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "event_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
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
                    "academy_id": string | null,"academy_name": string | null,"academy_slug": string | null,"author_avatar_path": string | null,"author_display_name": string,"author_id": string,"author_username": string | null,"business_id": string | null,"business_logo_path": string | null,"business_name": string | null,"business_slug": string | null,"caption": string,"comment_count": number,"created_at": string,"id": string,"kind": Database["public"]['Enums']["post_kind"],"like_count": number,"location_label": string | null,"martial_art_id": string | null,"martial_art_name": string | null,"media": Json | null,"mentions": Json | null,"moderation_status": Database["public"]['Enums']["moderation_status"],"save_count": number,"viewer_has_liked": boolean | null,"viewer_has_saved": boolean | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "posts_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    }
                  ]
                },"promotion_cards": {
                  Row: {
                    "academy_id": string | null,"academy_name": string | null,"academy_slug": string | null,"confirmed_at": string | null,"created_at": string,"degree": number,"id": string,"martial_art_id": string,"martial_art_name": string,"max_degrees": number,"notes": string | null,"promoted_on": string,"rank_color": string | null,"rank_id": string,"rank_name": string,"rank_ordinal": number,"rank_secondary_color": string | null,"teacher_display_name": string | null,"teacher_id": string | null,"teacher_username": string | null,"user_display_name": string,"user_id": string,"user_martial_art_id": string,"user_username": string | null,"verification": Database["public"]['Enums']["verification_status"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "rank_promotions_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_rank_id_fkey"
      columns: ["rank_id"]
isOneToOne: false
      referencedRelation: "martial_art_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_user_martial_art_id_fkey"
      columns: ["user_martial_art_id"]
isOneToOne: false
      referencedRelation: "journey_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rank_promotions_user_martial_art_id_fkey"
      columns: ["user_martial_art_id"]
isOneToOne: false
      referencedRelation: "user_martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_martial_arts_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    }
                  ]
                },"subscription_cards": {
                  Row: {
                    "academy_id": string | null,"business_id": string | null,"created_at": string,"ends_on": string | null,"entity_kind": string | null,"entity_name": string | null,"entity_slug": string | null,"id": string,"notes": string | null,"plan_id": string,"plan_name": string,"plan_price_label": string | null,"starts_on": string,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_cards": {
                  Row: {
                    "access_plans": string | null,"avatar_path": string | null,"bio": string | null,"certifications": NonNullable<Json>,"city": string | null,"contact_email": string | null,"contact_phone": string | null,"display_name": string,"experience_years": number | null,"lineage": string | null,"martial_arts": Json | null,"professional_name": string,"social_links": NonNullable<Json>,"state": string | null,"student_count": number,"user_id": string,"username": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "teacher_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_class_cards": {
                  Row: {
                    "academy_confirmed": boolean | null,"academy_id": string | null,"academy_slug": string | null,"accepts_trial": boolean,"city": string,"complement": string | null,"ends_at": string,"id": string,"latitude": number | null,"level": Database["public"]['Enums']["class_level"],"longitude": number | null,"martial_art_id": string,"martial_art_name": string,"neighborhood": string | null,"notes": string | null,"number": string | null,"place_id": string,"place_name": string,"postal_code": string | null,"reference_point": string | null,"starts_at": string,"state": string,"street": string | null,"teacher_avatar_path": string | null,"teacher_id": string,"teacher_name": string | null,"teacher_username": string | null,"weekday": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "teacher_classes_martial_art_id_fkey"
      columns: ["martial_art_id"]
isOneToOne: false
      referencedRelation: "martial_arts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_classes_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "teacher_places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_classes_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_classes_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_places_academy_id_fkey"
      columns: ["academy_id"]
isOneToOne: false
      referencedRelation: "academies"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_student_cards": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"requested_by": string,"status": string,"student_avatar_path": string | null,"student_display_name": string,"student_id": string,"student_username": string | null,"teacher_avatar_path": string | null,"teacher_id": string,"teacher_name": string | null,"teacher_username": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "teacher_students_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_students_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "teacher_students_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                }
          }
          Functions: {
            "academy_gallery_limit":
{ Args: { "p_academy": string }; Returns: number
                           },
"admin_change_subscription":
{ Args: { "p_ends_on": string,"p_plan": string,"p_reason": string,"p_subscription": string }; Returns: undefined
                           },
"admin_create_subscription":
{ Args: { "p_academy"?: string,"p_business"?: string,"p_ends_on"?: string,"p_notes"?: string,"p_plan": string,"p_starts_on"?: string }; Returns: string
                           },
"admin_search_users":
{ Args: { "p_limit"?: number,"p_query"?: string,"p_status"?: Database["public"]['Enums']["account_status"] }; Returns: {
              "created_at": string,"display_name": string,"email": string,"id": string,"open_reports": number,"post_count": number,"roles": (Database["public"]['Enums']["platform_role"])[],"status": Database["public"]['Enums']["account_status"],"suspended_until": string,"suspension_reason": string,"username": string
            }[]
                           },
"admin_set_subscription_status":
{ Args: { "p_reason": string,"p_status": Database["public"]['Enums']["subscription_status"],"p_subscription": string }; Returns: undefined
                           },
"assert_caller_active":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"backfill_commercial_signals":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"business_catalog_limit":
{ Args: { "p_business": string }; Returns: number
                           },
"business_promotions_limit":
{ Args: { "p_business": string }; Returns: number
                           },
"can_interact_with_post":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"can_manage_cover_path":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_view_event":
{ Args: { "p_event": string }; Returns: boolean
                           },
"can_view_journey":
{ Args: { "p_owner": string,"p_section": string }; Returns: boolean
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
"close_reports":
{ Args: { "p_dismiss": boolean,"p_reason"?: string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: number
                           },
"commercial_reasons":
{ Args: { "p_user": string }; Returns: Json
                           },
"commercial_review_threshold":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"commercial_risk_score":
{ Args: { "p_user": string }; Returns: number
                           },
"commercial_text_score":
{ Args: { "p_text": string }; Returns: number
                           },
"commercial_text_signals":
{ Args: { "p_text": string }; Returns: {
              "code": string,"excerpt": string,"points": number
            }[]
                           },
"confirm_promotion":
{ Args: { "p_confirm": boolean,"p_promotion": string }; Returns: undefined
                           },
"cover_object_exists":
{ Args: { "p_path": string }; Returns: boolean
                           },
"create_academy":
{ Args: { "p_description"?: string,"p_martial_art_ids"?: (string)[],"p_name": string }; Returns: string
                           },
"create_business":
{ Args: { "p_category": Database["public"]['Enums']["business_category"],"p_name": string }; Returns: string
                           },
"create_checkin":
{ Args: { "p_academy_id"?: string,"p_class_schedule_id"?: string,"p_duration_min"?: number,"p_martial_art_id"?: string,"p_notes"?: string,"p_share"?: boolean,"p_trained_at": string,"p_visibility"?: Database["public"]['Enums']["visibility"] }; Returns: string
                           },
"create_commercial_appeal":
{ Args: { "p_message": string,"p_review": string }; Returns: string
                           },
"create_page_post":
{ Args: { "p_business": string,"p_caption": string,"p_id": string,"p_location_label"?: string,"p_martial_art_id"?: string,"p_media"?: Json,"p_visibility"?: Database["public"]['Enums']["visibility"] }; Returns: string
                           },
"create_post":
{ Args: { "p_caption": string,"p_id": string,"p_location_label"?: string,"p_martial_art_id"?: string,"p_media"?: Json,"p_visibility"?: Database["public"]['Enums']["visibility"] }; Returns: string
                           },
"decide_commercial_appeal":
{ Args: { "p_accept": boolean,"p_appeal": string,"p_response": string }; Returns: undefined
                           },
"decide_commercial_review":
{ Args: { "p_decision": string,"p_note": string,"p_review": string }; Returns: undefined
                           },
"default_entitlement":
{ Args: { "p_key": string }; Returns: number
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
"entitlement":
{ Args: { "p_entity": string,"p_key": string,"p_kind": string }; Returns: number
                           },
"event_owner_visible":
{ Args: { "p_academy": string,"p_created_by": string }; Returns: boolean
                           },
"expire_subscriptions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"featured_entities":
{ Args: { "p_kind": string }; Returns: string[]
                           },
"geocode_cache_get":
{ Args: { "p_hash": string }; Returns: Json
                           },
"geocode_cache_put":
{ Args: { "p_hash": string,"p_provider": string,"p_query": string,"p_response": Json }; Returns: undefined
                           },
"geocode_take_quota":
{ Args: { "p_provider": string }; Returns: string
                           },
"get_admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_business_posts":
{ Args: { "p_before_created_at"?: string,"p_before_id"?: string,"p_business": string,"p_limit"?: number }; Returns: {
              "academy_id": string | null,
"academy_name": string | null,
"academy_slug": string | null,
"author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"business_id": string | null,
"business_logo_path": string | null,
"business_name": string | null,
"business_slug": string | null,
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
"get_cleanup_queue_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_explore":
{ Args: { "p_limit"?: number,"p_page"?: number }; Returns: {
              "academy_id": string | null,
"academy_name": string | null,
"academy_slug": string | null,
"author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"business_id": string | null,
"business_logo_path": string | null,
"business_name": string | null,
"business_slug": string | null,
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
              "academy_id": string | null,
"academy_name": string | null,
"academy_slug": string | null,
"author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"business_id": string | null,
"business_logo_path": string | null,
"business_name": string | null,
"business_slug": string | null,
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
              "academy_id": string | null,
"academy_name": string | null,
"academy_slug": string | null,
"author_avatar_path": string | null,
"author_display_name": string,
"author_id": string,
"author_username": string | null,
"business_id": string | null,
"business_logo_path": string | null,
"business_name": string | null,
"business_slug": string | null,
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
"get_report_queue":
{ Args: { "p_limit"?: number,"p_status"?: string }; Returns: {
              "content_state": string,"details": (string)[],"first_reported_at": string,"last_reported_at": string,"link": string,"owner_id": string,"owner_status": Database["public"]['Enums']["account_status"],"owner_username": string,"preview": string,"priority": boolean,"reasons": (Database["public"]['Enums']["report_reason"])[],"report_count": number,"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
            }[]
                           },
"get_saved_posts":
{ Args: { "p_before_saved_at"?: string,"p_limit"?: number }; Returns: {
              "post": Database["public"]['Views']["post_cards"]['Row'],"saved_at": string
            }[]
                           },
"get_teacher_schedule":
{ Args: { "p_teacher": string }; Returns: {
              "academy_id": string,
"academy_name": string,
"academy_slug": string,
"academy_verified": boolean,
"accepts_trial": boolean,
"city": string,
"complement": string | null,
"ends_at": string,
"id": string,
"latitude": number | null,
"level": Database["public"]['Enums']["class_level"],
"longitude": number | null,
"martial_art_id": string,
"martial_art_name": string,
"name": string,
"neighborhood": string | null,
"notes": string | null,
"number": string | null,
"postal_code": string | null,
"reference_point": string | null,
"starts_at": string,
"state": string,
"status": Database["public"]['Enums']["class_status"],
"street": string | null,
"teacher_display_name": string | null,
"teacher_id": string | null,
"teacher_username": string | null,
"unit_id": string,
"unit_name": string,
"weekday": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "class_cards"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_training_summary":
{ Args: { "p_user": string }; Returns: {
              "last_30_days": number,"this_year": number,"total": number
            }[]
                           },
"has_blocked_me":
{ Args: { "other": string }; Returns: boolean
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["platform_role"] }; Returns: boolean
                           },
"has_role_for":
{ Args: { "p_role": Database["public"]['Enums']["platform_role"],"p_user": string }; Returns: boolean
                           },
"immutable_unaccent":
{ Args: { "": string }; Returns: string
                           },
"invite_business_admin":
{ Args: { "p_business": string,"p_username": string }; Returns: undefined
                           },
"invite_member":
{ Args: { "p_academy": string,"p_role": Database["public"]['Enums']["membership_role"],"p_username": string }; Returns: Database["public"]['Enums']["membership_status"]
                           },
"invite_student":
{ Args: { "p_username": string }; Returns: string
                           },
"is_academy_manager":
{ Args: { "p_academy": string }; Returns: boolean
                           },
"is_academy_owner":
{ Args: { "p_academy": string }; Returns: boolean
                           },
"is_academy_visible":
{ Args: { "p_academy": string }; Returns: boolean
                           },
"is_active_student_of":
{ Args: { "p_student": string,"p_teacher": string }; Returns: boolean
                           },
"is_approved_teacher":
{ Args: { "p_user": string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_business_manager":
{ Args: { "p_business": string }; Returns: boolean
                           },
"is_business_owner":
{ Args: { "p_business": string }; Returns: boolean
                           },
"is_business_visible":
{ Args: { "p_business": string }; Returns: boolean
                           },
"is_following":
{ Args: { "target": string }; Returns: boolean
                           },
"is_https_url_list":
{ Args: { "p_links": Json,"p_max": number }; Returns: boolean
                           },
"is_short_text_list":
{ Args: { "p_len": number,"p_list": (string)[],"p_max": number }; Returns: boolean
                           },
"is_username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"leave_membership":
{ Args: { "p_academy": string,"p_role": Database["public"]['Enums']["membership_role"] }; Returns: undefined
                           },
"lift_expired_suspensions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"log_moderation":
{ Args: { "p_action": Database["public"]['Enums']["moderation_action"],"p_expires_at"?: string,"p_reason"?: string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"moderate_content":
{ Args: { "p_reason": string,"p_remove": boolean,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"notify":
{ Args: { "p_academy"?: string,"p_actor": string,"p_comment"?: string,"p_post"?: string,"p_recipient": string,"p_type": Database["public"]['Enums']["notification_type"] }; Returns: undefined
                           },
"notify_academy_managers":
{ Args: { "p_academy": string,"p_actor": string }; Returns: undefined
                           },
"platform_rank":
{ Args: { "p_user": string }; Returns: number
                           },
"purge_deleted_content":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"purge_rate_limits":
{ Args: { "p_older_than"?: string }; Returns: number
                           },
"recompute_commercial_risk":
{ Args: { "p_user": string }; Returns: number
                           },
"refresh_commercial_risk":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"refresh_current_rank":
{ Args: { "p_uma": string }; Returns: undefined
                           },
"refresh_teacher_status":
{ Args: { "p_user": string }; Returns: undefined
                           },
"remove_business_member":
{ Args: { "p_business": string,"p_user": string }; Returns: undefined
                           },
"remove_member":
{ Args: { "p_academy": string,"p_role": Database["public"]['Enums']["membership_role"],"p_user": string }; Returns: undefined
                           },
"remove_student_link":
{ Args: { "p_student": string,"p_teacher": string }; Returns: undefined
                           },
"report_target_owner":
{ Args: { "p_id": string,"p_type": Database["public"]['Enums']["report_target"] }; Returns: string
                           },
"request_membership":
{ Args: { "p_academy": string,"p_role": Database["public"]['Enums']["membership_role"] }; Returns: Database["public"]['Enums']["membership_status"]
                           },
"request_teacher":
{ Args: { "p_teacher": string }; Returns: string
                           },
"require_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"respond_business_invite":
{ Args: { "p_accept": boolean,"p_business": string }; Returns: undefined
                           },
"respond_membership":
{ Args: { "p_academy": string,"p_accept": boolean,"p_role": Database["public"]['Enums']["membership_role"],"p_user": string }; Returns: undefined
                           },
"respond_student_link":
{ Args: { "p_accept": boolean,"p_student": string,"p_teacher": string }; Returns: undefined
                           },
"review_teacher":
{ Args: { "p_notes"?: string,"p_status": Database["public"]['Enums']["teacher_status"],"p_user": string }; Returns: undefined
                           },
"search_academies":
{ Args: { "p_city"?: string,"p_limit"?: number,"p_martial_art"?: string,"p_query"?: string }; Returns: {
              "cities": (string)[],"follower_count": number,"id": string,"is_verified": boolean,"martial_arts": (string)[],"name": string,"slug": string
            }[]
                           },
"search_classes":
{ Args: { "p_city"?: string,"p_lat"?: number,"p_level"?: Database["public"]['Enums']["class_level"],"p_limit"?: number,"p_lng"?: number,"p_martial_art"?: string,"p_neighborhood"?: string,"p_period"?: string,"p_radius_km"?: number,"p_trial_only"?: boolean,"p_weekday"?: number }; Returns: {
              "class": Database["public"]['Views']["class_cards"]['Row'],"distance_km": number
            }[]
                           },
"search_normalize":
{ Args: { "": string }; Returns: string
                           },
"search_profiles":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "avatar_path": string,"city": string,"display_name": string,"id": string,"is_private": boolean,"state": string,"username": string
            }[]
                           },
"search_teacher_classes":
{ Args: { "p_city"?: string,"p_lat"?: number,"p_level"?: Database["public"]['Enums']["class_level"],"p_limit"?: number,"p_lng"?: number,"p_martial_art"?: string,"p_neighborhood"?: string,"p_period"?: string,"p_radius_km"?: number,"p_trial_only"?: boolean,"p_weekday"?: number }; Returns: {
              "class": Database["public"]['Views']["teacher_class_cards"]['Row'],"distance_km": number
            }[]
                           },
"set_academy_verified":
{ Args: { "p_academy": string,"p_verified": boolean }; Returns: undefined
                           },
"set_business_verified":
{ Args: { "p_business": string,"p_verified": boolean }; Returns: undefined
                           },
"slugify":
{ Args: { "p_text": string }; Returns: string
                           },
"suspend_user":
{ Args: { "p_days": number,"p_reason": string,"p_user": string }; Returns: undefined
                           },
"teacher_art_qualifies":
{ Args: { "p_art": string,"p_rank": string }; Returns: boolean
                           },
"teacher_min_rank_ordinal":
{ Args: { "p_art": string }; Returns: number
                           },
"teacher_qualifies":
{ Args: { "p_user": string }; Returns: boolean
                           },
"unsuspend_user":
{ Args: { "p_reason"?: string,"p_user": string }; Returns: undefined
                           }
          }
          Enums: {
            "academy_status": "active"|"hidden"|"suspended","account_status": "active"|"suspended"|"deleted","achievement_type": "competition_result"|"milestone"|"certification"|"other","appeal_status": "open"|"accepted"|"rejected","business_category": "brand"|"store"|"service","business_member_status": "pending"|"active","business_role": "owner"|"admin","business_status": "active"|"hidden"|"suspended","catalog_item_kind": "product"|"service","class_level": "all"|"beginner"|"intermediate"|"advanced"|"kids"|"competition","class_status": "active"|"paused"|"cancelled","commercial_review_status": "open"|"dismissed"|"warned"|"actioned"|"reverted","coords_source": "manual"|"nominatim","event_interest_kind": "interested"|"saved","event_status": "draft"|"published"|"cancelled","event_type": "championship"|"seminar"|"open_mat"|"graduation"|"workshop"|"special_training"|"other","follow_status": "pending"|"accepted","medal": "gold"|"silver"|"bronze","media_status": "uploading"|"processing"|"ready"|"failed","media_type": "image"|"video","membership_requester": "user"|"academy","membership_role": "owner"|"admin"|"teacher"|"student","membership_status": "pending"|"active"|"rejected"|"left","mention_status": "pending"|"approved"|"rejected","moderation_action": "remove_content"|"restore_content"|"dismiss_reports"|"warn"|"suspend"|"unsuspend"|"ban"|"verify"|"unverify","moderation_status": "visible"|"under_review"|"removed","notification_type": "follow"|"follow_request"|"like"|"comment"|"reply"|"mention"|"class_update"|"event_update"|"promotion_confirmed"|"membership_request"|"moderation"|"promotion_request"|"business_invite"|"commercial_warning"|"appeal_decided"|"student_invite"|"student_request"|"student_accepted","plan_audience": "academy"|"business"|"both","platform_role": "moderator"|"admin"|"superadmin","post_kind": "standard"|"checkin"|"achievement"|"event_share","price_status": "paid"|"free"|"undisclosed","rank_track": "adult"|"kids","report_reason": "spam"|"harassment"|"violence"|"nudity"|"minor_safety"|"impersonation"|"misinformation"|"other","report_status": "open"|"in_review"|"resolved"|"dismissed","report_target": "post"|"comment"|"profile"|"academy"|"event"|"business","subscription_status": "active"|"suspended"|"cancelled"|"expired","teacher_status": "pending"|"approved"|"rejected"|"revoked","theme_preference": "light"|"dark"|"system","unit_access_kind": "totalpass"|"wellhub"|"day_pass","verification_status": "self_reported"|"teacher_confirmed","visibility": "public"|"followers"|"private"
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
            "academy_status": ["active", "hidden", "suspended"],"account_status": ["active", "suspended", "deleted"],"achievement_type": ["competition_result", "milestone", "certification", "other"],"appeal_status": ["open", "accepted", "rejected"],"business_category": ["brand", "store", "service"],"business_member_status": ["pending", "active"],"business_role": ["owner", "admin"],"business_status": ["active", "hidden", "suspended"],"catalog_item_kind": ["product", "service"],"class_level": ["all", "beginner", "intermediate", "advanced", "kids", "competition"],"class_status": ["active", "paused", "cancelled"],"commercial_review_status": ["open", "dismissed", "warned", "actioned", "reverted"],"coords_source": ["manual", "nominatim"],"event_interest_kind": ["interested", "saved"],"event_status": ["draft", "published", "cancelled"],"event_type": ["championship", "seminar", "open_mat", "graduation", "workshop", "special_training", "other"],"follow_status": ["pending", "accepted"],"medal": ["gold", "silver", "bronze"],"media_status": ["uploading", "processing", "ready", "failed"],"media_type": ["image", "video"],"membership_requester": ["user", "academy"],"membership_role": ["owner", "admin", "teacher", "student"],"membership_status": ["pending", "active", "rejected", "left"],"mention_status": ["pending", "approved", "rejected"],"moderation_action": ["remove_content", "restore_content", "dismiss_reports", "warn", "suspend", "unsuspend", "ban", "verify", "unverify"],"moderation_status": ["visible", "under_review", "removed"],"notification_type": ["follow", "follow_request", "like", "comment", "reply", "mention", "class_update", "event_update", "promotion_confirmed", "membership_request", "moderation", "promotion_request", "business_invite", "commercial_warning", "appeal_decided", "student_invite", "student_request", "student_accepted"],"plan_audience": ["academy", "business", "both"],"platform_role": ["moderator", "admin", "superadmin"],"post_kind": ["standard", "checkin", "achievement", "event_share"],"price_status": ["paid", "free", "undisclosed"],"rank_track": ["adult", "kids"],"report_reason": ["spam", "harassment", "violence", "nudity", "minor_safety", "impersonation", "misinformation", "other"],"report_status": ["open", "in_review", "resolved", "dismissed"],"report_target": ["post", "comment", "profile", "academy", "event", "business"],"subscription_status": ["active", "suspended", "cancelled", "expired"],"teacher_status": ["pending", "approved", "rejected", "revoked"],"theme_preference": ["light", "dark", "system"],"unit_access_kind": ["totalpass", "wellhub", "day_pass"],"verification_status": ["self_reported", "teacher_confirmed"],"visibility": ["public", "followers", "private"]
          }
        }
} as const
