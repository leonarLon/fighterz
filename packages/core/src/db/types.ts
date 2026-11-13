
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
            [_ in never]: never
          }
          Functions: {
            "check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window": string }; Returns: boolean
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"enforce_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window": string }; Returns: undefined
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["platform_role"] }; Returns: boolean
                           },
"immutable_unaccent":
{ Args: { "": string }; Returns: string
                           },
"is_username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"purge_rate_limits":
{ Args: { "p_older_than"?: string }; Returns: number
                           },
"search_normalize":
{ Args: { "": string }; Returns: string
                           }
          }
          Enums: {
            "account_status": "active"|"suspended"|"deleted","platform_role": "moderator"|"admin"|"superadmin","rank_track": "adult"|"kids","theme_preference": "light"|"dark"|"system","visibility": "public"|"followers"|"private"
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
            "account_status": ["active", "suspended", "deleted"],"platform_role": ["moderator", "admin", "superadmin"],"rank_track": ["adult", "kids"],"theme_preference": ["light", "dark", "system"],"visibility": ["public", "followers", "private"]
          }
        }
} as const
