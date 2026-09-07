import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// SecureStore adapter for persisting Supabase auth sessions securely
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key)
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return }
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return }
    return SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'patient' | 'doctor' | 'manager'
          full_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      doctor_profiles: {
        Row: {
          id: string
          specialty: string
          department: string
          license_number: string | null
          bio: string | null
          experience_years: number
          hospital_name: string | null
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['doctor_profiles']['Row'], 'created_at' | 'updated_at' | 'approved_by' | 'approved_at'>
        Update: Partial<Database['public']['Tables']['doctor_profiles']['Insert']>
      }
      appointment_slots: {
        Row: {
          id: string
          doctor_id: string
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['appointment_slots']['Row'], 'created_at' | 'id'>
        Update: Partial<Database['public']['Tables']['appointment_slots']['Insert']>
      }
      appointments: {
        Row: {
          id: string
          slot_id: string
          patient_id: string
          doctor_id: string
          status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
          notes: string | null
          cancelled_by: 'patient' | 'doctor' | 'manager' | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'created_at' | 'updated_at' | 'id'>
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }
      insurance_profiles: {
        Row: {
          id: string
          patient_id: string
          provider_name: string
          policy_number: string
          group_number: string | null
          card_image_path: string | null
          verified: boolean
          verified_by: string | null
          verified_at: string | null
          uploaded_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['insurance_profiles']['Row'], 'uploaded_at' | 'updated_at' | 'id' | 'verified' | 'verified_by' | 'verified_at'>
        Update: Partial<Database['public']['Tables']['insurance_profiles']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          appointment_id: string | null
          patient_id: string
          doctor_id: string | null
          amount_cents: number
          currency: string
          description: string | null
          status: 'pending' | 'paid' | 'failed' | 'refunded' | 'waived'
          stripe_payment_intent_id: string | null
          stripe_customer_id: string | null
          due_date: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'created_at' | 'updated_at' | 'id'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          type: string
          title: string
          body: string
          data: Record<string, unknown> | null
          read_at: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: 'ios' | 'android' | 'web'
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_tokens']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>
      }
    }
  }
}
