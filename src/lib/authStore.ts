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

// SB58XX seed kullanıcıları (demo parola: "1234")
const SEED_USERS: Record<string, { password: string; user: AuthUser }> = {
  SB5801: { password: "1234", user: { sicilNo: "SB5801", ad: "İbrahim", soyad: "Alaçam", unvan: "Müdür", rol: "Admin", posta: "", initials: "İA" } },
  SB5802: { password: "1234", user: { sicilNo: "SB5802", ad: "Seyfi Ali", soyad: "Gül", unvan: "Amir", rol: "Editor", posta: "", initials: "SG" } },
  SB5803: { password: "1234", user: { sicilNo: "SB5803", ad: "Ahmet", soyad: "Çelimli", unvan: "Amir", rol: "Editor", posta: "", initials: "AÇ" } },
  SB5804: { password: "1234", user: { sicilNo: "SB5804", ad: "Ahmet", soyad: "Yıldız", unvan: "Amir", rol: "Editor", posta: "", initials: "AY" } },
  SB5805: { password: "1234", user: { sicilNo: "SB5805", ad: "Hidayet", soyad: "Yücekaya", unvan: "Başçavuş", rol: "Shift_Leader", posta: "", initials: "HY" } },
  SB5806: { password: "1234", user: { sicilNo: "SB5806", ad: "Ömer", soyad: "Çakmak", unvan: "Çavuş", rol: "Shift_Leader", posta: "", initials: "ÖÇ" } },
  SB5807: { password: "1234", user: { sicilNo: "SB5807", ad: "Abdullah Übeyde", soyad: "Özkur", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "AÖ" } },
  SB5808: { password: "1234", user: { sicilNo: "SB5808", ad: "Beyza", soyad: "Durak", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "BD" } },
  SB5809: { password: "1234", user: { sicilNo: "SB5809", ad: "Beyza", soyad: "Kılıç", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "BK" } },
  SB5810: { password: "1234", user: { sicilNo: "SB5810", ad: "Elif", soyad: "Tunçer", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "ET" } },
  SB5811: { password: "1234", user: { sicilNo: "SB5811", ad: "Emir Furkan", soyad: "Taşdelen", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "ET" } },
  SB5812: { password: "1234", user: { sicilNo: "SB5812", ad: "Fatih", soyad: "Güler", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "FG" } },
  SB5813: { password: "1234", user: { sicilNo: "SB5813", ad: "Fatmanur", soyad: "Kişi", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "FK" } },
  SB5814: { password: "1234", user: { sicilNo: "SB5814", ad: "Gülenay", soyad: "Koçak", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "GK" } },
  SB5815: { password: "1234", user: { sicilNo: "SB5815", ad: "Hasan Çınar", soyad: "Kuzu", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "HK" } },
  SB5816: { password: "1234", user: { sicilNo: "SB5816", ad: "İsmail", soyad: "Aslan", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "İA" } },
  SB5817: { password: "1234", user: { sicilNo: "SB5817", ad: "Kadir", soyad: "Kuru", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "KK" } },
  SB5818: { password: "1234", user: { sicilNo: "SB5818", ad: "Melih", soyad: "Arslan", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MA" } },
  SB5819: { password: "1234", user: { sicilNo: "SB5819", ad: "Muhammed Emin", soyad: "Kara", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MK" } },
  SB5820: { password: "1234", user: { sicilNo: "SB5820", ad: "Muhammed Enes", soyad: "Yıldırım", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MY" } },
  SB5821: { password: "1234", user: { sicilNo: "SB5821", ad: "Muhammed", soyad: "Kara", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MK" } },
  SB5822: { password: "1234", user: { sicilNo: "SB5822", ad: "Muhammed Yasir", soyad: "İnce", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "Mİ" } },
  SB5823: { password: "1234", user: { sicilNo: "SB5823", ad: "Mustafa", soyad: "Demir", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MD" } },
  SB5824: { password: "1234", user: { sicilNo: "SB5824", ad: "Mustafa", soyad: "Köse", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MK" } },
  SB5825: { password: "1234", user: { sicilNo: "SB5825", ad: "Mustafa Metin", soyad: "Bıçakcigil", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "MB" } },
  SB5826: { password: "1234", user: { sicilNo: "SB5826", ad: "Onurcan", soyad: "Kaya", unvan: "İtfaiye Eri / Geliştirici", rol: "Admin", posta: "", initials: "OK" } },
  SB5827: { password: "1234", user: { sicilNo: "SB5827", ad: "Selahattin", soyad: "Tosun", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "ST" } },
  SB5828: { password: "1234", user: { sicilNo: "SB5828", ad: "Sencer", soyad: "Yıldız", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "SY" } },
  SB5829: { password: "1234", user: { sicilNo: "SB5829", ad: "Uğur", soyad: "Budak", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "UB" } },
  SB5830: { password: "1234", user: { sicilNo: "SB5830", ad: "Yağmur", soyad: "Aydın", unvan: "İtfaiye Eri", rol: "User", posta: "", initials: "YA" } },
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  redirectUrl: string | null
  login: (sicilNo: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  setRedirectUrl: (url: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      redirectUrl: null,

      login: (sicilNo: string, password: string) => {
        const key = sicilNo.toUpperCase().trim()
        const entry = SEED_USERS[key]

        if (!entry) {
          return { success: false, error: "Sicil numarası bulunamadı." }
        }
        if (entry.password !== password) {
          return { success: false, error: "Parola hatalı." }
        }

        set({ user: entry.user, isAuthenticated: true })
        // Set cookie for middleware auth check
        if (typeof document !== 'undefined') {
          document.cookie = `sivas-auth-active=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
        }
        return { success: true }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, redirectUrl: null })
        // Clear auth cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'sivas-auth-active=; path=/; max-age=0'
        }
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

export { SEED_USERS }
