"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClient } from "@/lib/supabase/client"

export interface AuthUser {
  sicilNo: string
  ad: string
  soyad: string
  unvan: string
  rol: string
  posta: string
  initials: string
}

// ─── Auth Log Helper ─────────────────────────────────
// Fire-and-forget: Kullanıcı deneyimini engellemez
function logAuthEvent(sicilNo: string, eventType: 'login_success' | 'login_failed' | 'logout', details?: string) {
  if (typeof window === 'undefined') return

  fetch('/api/auth-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sicil_no: sicilNo,
      event_type: eventType,
      details: details || null,
    }),
  }).catch((err) => {
    console.error('[AuthLog] Log gönderimi başarısız:', err)
  })
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  redirectUrl: string | null
  login: (sicilNo: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  setRedirectUrl: (url: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      redirectUrl: null,

      login: async (sicilNo: string, password: string) => {
        const key = sicilNo.toUpperCase().trim()
        const email = `${key}@itfaiye.local`
        const supabase = createClient()

        // 1. Supabase Auth ile giriş yap
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError || !authData.user) {
          logAuthEvent(key, 'login_failed', `Hatalı parola veya sicil: ${authError?.message}`)
          return { success: false, error: "Sicil numarası veya parola hatalı." }
        }

        // 2. Personel tablosundan detayları çek
        const { data: profile, error: profileError } = await supabase
          .from('personnel')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (profileError || !profile) {
          logAuthEvent(key, 'login_failed', `Profil bulunamadı: ${profileError?.message}`)
          await supabase.auth.signOut()
          return { success: false, error: "Kullanıcı profili bulunamadı." }
        }

        if (!profile.aktif) {
          logAuthEvent(key, 'login_failed', `Hesap pasif durumda.`)
          await supabase.auth.signOut()
          return { success: false, error: "Hesabınız pasif durumdadır." }
        }

        const userObj: AuthUser = {
          sicilNo: profile.sicil_no,
          ad: profile.ad,
          soyad: profile.soyad,
          unvan: profile.unvan,
          rol: profile.rol,
          posta: profile.posta || '',
          initials: `${profile.ad.charAt(0)}${profile.soyad.charAt(0)}`.toUpperCase()
        }

        set({ user: userObj, isAuthenticated: true })

        // ── Başarılı giriş logu ──
        logAuthEvent(key, 'login_success', `${profile.ad} ${profile.soyad} (${profile.unvan})`)

        return { success: true }
      },

      logout: async () => {
        const currentUser = get().user
        const sicilNo = currentUser?.sicilNo || 'unknown'
        const details = currentUser
          ? `${currentUser.ad} ${currentUser.soyad} çıkış yaptı`
          : 'Bilinmeyen kullanıcı çıkış yaptı'

        const supabase = createClient()
        await supabase.auth.signOut()

        // ── Çıkış logu ──
        logAuthEvent(sicilNo, 'logout', details)

        set({ user: null, isAuthenticated: false, redirectUrl: null })
      },

      setRedirectUrl: (url) => set({ redirectUrl: url }),
    }),
    {
      name: "sivas-itfaiye-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
