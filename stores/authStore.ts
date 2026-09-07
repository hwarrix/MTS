import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row']

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  doctorProfile: DoctorProfile | null
  loading: boolean
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, data: { full_name: string; role: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  doctorProfile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        const doctorProfile = profile?.role === 'doctor'
          ? await fetchDoctorProfile(session.user.id)
          : null

        set({
          session,
          user: session.user,
          profile,
          doctorProfile,
          initialized: true,
        })
      } else {
        set({ initialized: true })
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id)
          const doctorProfile = profile?.role === 'doctor'
            ? await fetchDoctorProfile(session.user.id)
            : null
          set({ session, user: session.user, profile, doctorProfile })
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, profile: null, doctorProfile: null })
        }
      })
    } catch (e) {
      set({ initialized: true })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }

      const profile = await fetchProfile(data.user.id)
      const doctorProfile = profile?.role === 'doctor'
        ? await fetchDoctorProfile(data.user.id)
        : null

      set({ session: data.session, user: data.user, profile, doctorProfile })
      return { error: null }
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email, password, { full_name, role }) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, role },
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, doctorProfile: null })
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'medicare://reset-password',
    })
    return { error: error?.message ?? null }
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const profile = await fetchProfile(user.id)
    const doctorProfile = profile?.role === 'doctor'
      ? await fetchDoctorProfile(user.id)
      : null
    set({ profile, doctorProfile })
  },
}))

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

async function fetchDoctorProfile(doctorId: string): Promise<DoctorProfile | null> {
  const { data } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('id', doctorId)
    .single()
  return data
}
