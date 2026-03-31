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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          hospital_id: string | null
          id: string
          is_read: boolean | null
          message: string
          truck_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          truck_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          cylinders_delivered: number
          delivered_at: string | null
          hospital_id: string | null
          id: string
          level_after_pct: number | null
          level_before_pct: number | null
          notes: string | null
          route_stop_id: string | null
          truck_id: string | null
        }
        Insert: {
          cylinders_delivered: number
          delivered_at?: string | null
          hospital_id?: string | null
          id?: string
          level_after_pct?: number | null
          level_before_pct?: number | null
          notes?: string | null
          route_stop_id?: string | null
          truck_id?: string | null
        }
        Update: {
          cylinders_delivered?: number
          delivered_at?: string | null
          hospital_id?: string | null
          id?: string
          level_after_pct?: number | null
          level_before_pct?: number | null
          notes?: string | null
          route_stop_id?: string | null
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          created_at: string | null
          daily_capacity: number
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          daily_capacity: number
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          daily_capacity?: number
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          assigned_facility_id: string | null
          contact_phone: string | null
          created_at: string | null
          critical_threshold_pct: number | null
          cylinder_capacity: number
          district: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          reorder_threshold_pct: number | null
          total_beds: number | null
        }
        Insert: {
          assigned_facility_id?: string | null
          contact_phone?: string | null
          created_at?: string | null
          critical_threshold_pct?: number | null
          cylinder_capacity: number
          district: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          reorder_threshold_pct?: number | null
          total_beds?: number | null
        }
        Update: {
          assigned_facility_id?: string | null
          contact_phone?: string | null
          created_at?: string | null
          critical_threshold_pct?: number | null
          cylinder_capacity?: number
          district?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          reorder_threshold_pct?: number | null
          total_beds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitals_assigned_facility_id_fkey"
            columns: ["assigned_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      o2_readings: {
        Row: {
          created_at: string | null
          cylinder_capacity: number
          cylinders_available: number
          hospital_id: string
          id: string
          level_pct: number | null
          logged_by: string | null
          notes: string | null
          reading_date: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          cylinder_capacity: number
          cylinders_available: number
          hospital_id: string
          id?: string
          level_pct?: number | null
          logged_by?: string | null
          notes?: string | null
          reading_date?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          cylinder_capacity?: number
          cylinders_available?: number
          hospital_id?: string
          id?: string
          level_pct?: number | null
          logged_by?: string | null
          notes?: string | null
          reading_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "o2_readings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          actual_delivery_time: string | null
          created_at: string | null
          cylinders_to_deliver: number
          eta: string | null
          hospital_id: string
          id: string
          route_id: string
          status: string | null
          stop_order: number
        }
        Insert: {
          actual_delivery_time?: string | null
          created_at?: string | null
          cylinders_to_deliver: number
          eta?: string | null
          hospital_id: string
          id?: string
          route_id: string
          status?: string | null
          stop_order: number
        }
        Update: {
          actual_delivery_time?: string | null
          created_at?: string | null
          cylinders_to_deliver?: number
          eta?: string | null
          hospital_id?: string
          id?: string
          route_id?: string
          status?: string | null
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string | null
          estimated_duration_hours: number | null
          facility_id: string | null
          id: string
          route_date: string
          route_name: string
          status: string | null
          total_cylinders: number | null
          total_distance_km: number | null
          truck_id: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_duration_hours?: number | null
          facility_id?: string | null
          id?: string
          route_date?: string
          route_name: string
          status?: string | null
          total_cylinders?: number | null
          total_distance_km?: number | null
          truck_id?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_duration_hours?: number | null
          facility_id?: string | null
          id?: string
          route_date?: string
          route_name?: string
          status?: string | null
          total_cylinders?: number | null
          total_distance_km?: number | null
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          assigned_facility_id: string | null
          created_at: string | null
          current_location: string | null
          cylinder_capacity: number
          driver_name: string
          driver_phone: string | null
          id: string
          status: string | null
          truck_code: string
        }
        Insert: {
          assigned_facility_id?: string | null
          created_at?: string | null
          current_location?: string | null
          cylinder_capacity?: number
          driver_name: string
          driver_phone?: string | null
          id?: string
          status?: string | null
          truck_code: string
        }
        Update: {
          assigned_facility_id?: string | null
          created_at?: string | null
          current_location?: string | null
          cylinder_capacity?: number
          driver_name?: string
          driver_phone?: string | null
          id?: string
          status?: string | null
          truck_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "trucks_assigned_facility_id_fkey"
            columns: ["assigned_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
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
