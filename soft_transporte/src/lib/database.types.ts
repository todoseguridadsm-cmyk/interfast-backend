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
          role: 'admin' | 'chofer' | 'cliente' | 'empleado'
          full_name: string
          username: string | null
          phone: string | null
          balance: number | null
          permissions: string[] | null
          birth_date: string | null
          license_expiry: string | null
          is_donor: boolean | null
          address: string | null
          city: string | null
          province: string | null
          blood_type: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'chofer' | 'cliente' | 'empleado'
          full_name: string
          username?: string | null
          phone?: string | null
          balance?: number | null
          permissions?: string[] | null
          birth_date?: string | null
          license_expiry?: string | null
          is_donor?: boolean | null
          address?: string | null
          city?: string | null
          province?: string | null
          blood_type?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'chofer' | 'cliente' | 'empleado'
          full_name?: string
          username?: string | null
          phone?: string | null
          balance?: number | null
          permissions?: string[] | null
          birth_date?: string | null
          license_expiry?: string | null
          is_donor?: boolean | null
          address?: string | null
          city?: string | null
          province?: string | null
          blood_type?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
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
          next_oil_change_date: string | null
          next_oil_filter_change_km: number | null
          next_oil_filter_change_date: string | null
          next_air_filter_change_km: number | null
          next_air_filter_change_date: string | null
          next_gearbox_oil_change_km: number | null
          next_gearbox_oil_change_date: string | null
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
          next_oil_change_date?: string | null
          next_oil_filter_change_km?: number | null
          next_oil_filter_change_date?: string | null
          next_air_filter_change_km?: number | null
          next_air_filter_change_date?: string | null
          next_gearbox_oil_change_km?: number | null
          next_gearbox_oil_change_date?: string | null
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
          next_oil_change_date?: string | null
          next_oil_filter_change_km?: number | null
          next_oil_filter_change_date?: string | null
          next_air_filter_change_km?: number | null
          next_air_filter_change_date?: string | null
          next_gearbox_oil_change_km?: number | null
          next_gearbox_oil_change_date?: string | null
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
          trip_code: string | null
          client_id: string | null
          vehicle_id: string | null
          driver_id: string | null
          origin: string
          destination: string
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_date: string | null
          end_date: string | null
          price: number | null
          estimated_km: number | null
          advance_payment: number | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_code?: string | null
          client_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          origin: string
          destination: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_date?: string | null
          end_date?: string | null
          price?: number | null
          estimated_km?: number | null
          advance_payment?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_code?: string | null
          client_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          origin?: string
          destination?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_date?: string | null
          end_date?: string | null
          price?: number | null
          estimated_km?: number | null
          advance_payment?: number | null
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
          has_receipt: boolean | null
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
          has_receipt?: boolean | null
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
          has_receipt?: boolean | null
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
      suppliers: {
        Row: {
          id: string
          company_name: string
          cuit: string | null
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_name: string
          cuit?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          cuit?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
      }
      checks: {
        Row: {
          id: string
          check_type: 'a_cobrar' | 'a_pagar'
          amount: number
          bank_name: string
          check_number: string
          issue_date: string
          due_date: string
          status: 'pending' | 'cashed' | 'deposited' | 'bounced'
          client_id: string | null
          supplier_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          check_type: 'a_cobrar' | 'a_pagar'
          amount: number
          bank_name: string
          check_number: string
          issue_date: string
          due_date: string
          status?: 'pending' | 'cashed' | 'deposited' | 'bounced'
          client_id?: string | null
          supplier_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          check_type?: 'a_cobrar' | 'a_pagar'
          amount?: number
          bank_name?: string
          check_number?: string
          issue_date?: string
          due_date?: string
          status?: 'pending' | 'cashed' | 'deposited' | 'bounced'
          client_id?: string | null
          supplier_id?: string | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          trip_id: string | null
          client_id: string | null
          amount: number
          payment_method: 'cuenta_corriente' | 'contado' | 'cheque' | 'transferencia'
          check_id: string | null
          status: 'pending' | 'paid' | 'cancelled'
          voucher_number: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id?: string | null
          client_id?: string | null
          amount: number
          payment_method: 'cuenta_corriente' | 'contado' | 'cheque' | 'transferencia'
          check_id?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          voucher_number?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string | null
          client_id?: string | null
          amount?: number
          payment_method?: 'cuenta_corriente' | 'contado' | 'cheque' | 'transferencia'
          check_id?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          voucher_number?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      company_expenses: {
        Row: {
          id: string
          supplier_id: string | null
          driver_id: string | null
          category: 'sueldo' | 'mantenimiento' | 'combustible_mayorista' | 'neumaticos' | 'ajuste_saldo' | 'otros'
          description: string
          amount: number
          payment_method: 'cuenta_corriente' | 'contado' | 'cheque' | 'transferencia'
          check_id: string | null
          status: 'pending' | 'paid' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          driver_id?: string | null
          category: 'sueldo' | 'mantenimiento' | 'combustible_mayorista' | 'neumaticos' | 'ajuste_saldo' | 'otros'
          description: string
          amount: number
          payment_method: 'cuenta_corriente' | 'contado' | 'cheque' | 'transferencia'
          check_id?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string | null
          driver_id?: string | null
          category?: 'sueldo' | 'mantenimiento' | 'combustible_mayorista' | 'neumaticos' | 'ajuste_saldo' | 'otros'
          description?: string
          amount?: number
          payment_method?: 'cuenta_corriente' | 'contado' | 'cheque' | 'transferencia'
          check_id?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          created_at?: string
        }
      }
    }
  }
}
