export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'chofer' | 'cliente'
          full_name: string
          phone: string | null
          balance: number | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'chofer' | 'cliente'
          full_name: string
          phone?: string | null
          balance?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'chofer' | 'cliente'
          full_name?: string
          phone?: string | null
          balance?: number | null
          created_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          plate: string
          brand: string
          model: string
          year: number
          capacity_kg: number | null
          status: string
          current_km: number | null
          next_service_km: number | null
          created_at: string
        }
        Insert: {
          id?: string
          plate: string
          brand: string
          model: string
          year: number
          capacity_kg?: number | null
          status?: string
          current_km?: number | null
          next_service_km?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          plate?: string
          brand?: string
          model?: string
          year?: number
          capacity_kg?: number | null
          status?: string
          current_km?: number | null
          next_service_km?: number | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          cuit: string | null
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          cuit?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          cuit?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          client_id: string | null
          vehicle_id: string | null
          driver_id: string | null
          origin: string
          destination: string
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_date: string | null
          end_date: string | null
          price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          origin: string
          destination: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_date?: string | null
          end_date?: string | null
          price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          origin?: string
          destination?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_date?: string | null
          end_date?: string | null
          price?: number | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          trip_id: string | null
          driver_id: string | null
          description: string | null
          amount: number
          category: string | null
          receipt_url: string | null
          ocr_data: Json | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          trip_id?: string | null
          driver_id?: string | null
          description?: string | null
          amount: number
          category?: string | null
          receipt_url?: string | null
          ocr_data?: Json | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string | null
          driver_id?: string | null
          description?: string | null
          amount?: number
          category?: string | null
          receipt_url?: string | null
          ocr_data?: Json | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          client_id: string | null
          trip_id: string | null
          amount: number
          status: 'pending' | 'paid' | 'cancelled'
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          trip_id?: string | null
          amount: number
          status?: 'pending' | 'paid' | 'cancelled'
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          trip_id?: string | null
          amount?: number
          status?: 'pending' | 'paid' | 'cancelled'
          due_date?: string | null
          created_at?: string
        }
      }
      maintenance_logs: {
        Row: {
          id: string
          vehicle_id: string | null
          service_type: string
          cost: number | null
          km_at_service: number | null
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id?: string | null
          service_type: string
          cost?: number | null
          km_at_service?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          service_type?: string
          cost?: number | null
          km_at_service?: number | null
          created_at?: string
        }
      }
    }
  }
}
