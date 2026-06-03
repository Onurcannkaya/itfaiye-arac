"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

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
  token: string | null
  isAuthenticated: boolean
  redirectUrl: string | null
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; token?: string }>
  logout: () => Promise<void>
  setRedirectUrl: (url: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      redirectUrl: null,

      login: async (identifier: string, password: string) => {
        const trimmed = identifier.trim()
        // If it starts with SB or is numeric, it is sicil_no -> uppercase, otherwise keep lowercase for username
        const isSicilNo = /^SB/i.test(trimmed) || /^\d+$/.test(trimmed);
        const key = isSicilNo ? trimmed.toUpperCase() : trimmed.toLowerCase();

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: key, password }),
          })

          const data = await res.json()

          if (!res.ok || data.error) {
            logAuthEvent(key, 'login_failed', data.error || 'Bilinmeyen hata')
            return { success: false, error: data.error || "Giriş başarısız." }
          }

          const userObj: AuthUser = {
            sicilNo: data.user.sicilNo,
            ad: data.user.ad,
            soyad: data.user.soyad,
            unvan: data.user.unvan,
            rol: data.user.rol,
            posta: data.user.posta || '',
            initials: `${data.user.ad.charAt(0)}${data.user.soyad.charAt(0)}`.toUpperCase()
          }

          set({ user: userObj, token: data.token, isAuthenticated: true })
          return { success: true, token: data.token }
        } catch (err: any) {
          console.error('[AuthStore] Login hatası:', err)
          return { success: false, error: "Sunucu bağlantı hatası." }
        }
      },

      logout: async () => {
        const currentUser = get().user
        const sicilNo = currentUser?.sicilNo || 'unknown'

        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } catch (err) {
          console.error('[AuthStore] Logout hatası:', err)
        }

        logAuthEvent(sicilNo, 'logout', currentUser ? `${currentUser.ad} ${currentUser.soyad} çıkış yaptı` : 'Bilinmeyen')
        set({ user: null, token: null, isAuthenticated: false, redirectUrl: null })

        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          document.cookie = 'itfaiye_token=; path=/; Max-Age=0'
          window.location.replace('/login')
        }
      },

      setRedirectUrl: (url) => set({ redirectUrl: url }),
    }),
    {
      name: "sivas-itfaiye-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
