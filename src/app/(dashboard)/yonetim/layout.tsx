"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/authStore"
import { ShieldAlert, Loader2 } from "lucide-react"

const ALLOWED_ROLES = ["Admin", "Editor", "Shift_Leader"]

export default function YonetimLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [hasHydrated, setHasHydrated] = useState(false)

  // Wait for Zustand persist to hydrate from localStorage before making auth decisions
  useEffect(() => {
    // Zustand persist hydrates synchronously for localStorage,
    // but the component needs one render cycle to reflect it.
    // Use a small timeout to ensure hydration completes.
    const timer = setTimeout(() => {
      setHasHydrated(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    if (typeof window === 'undefined') return

    const localToken = localStorage.getItem('auth_token')
    
    // 1. No token at all → definitely not logged in
    if (!localToken) {
      router.replace("/login?redirect=/yonetim")
      return
    }

    // 2. Token exists but Zustand says not authenticated
    //    (hydration complete but state is still false = stale token)
    if (!isAuthenticated) {
      // Token exists but Zustand state disagrees after hydration.
      // Try reading the persisted Zustand store directly.
      try {
        const authData = localStorage.getItem('sivas-itfaiye-auth')
        if (authData) {
          const parsed = JSON.parse(authData)
          if (parsed?.state?.isAuthenticated && parsed?.state?.token) {
            // Zustand store has valid data, just hasn't reflected in React yet.
            // Wait for next render cycle.
            return
          }
        }
      } catch {}
      // Truly not authenticated
      router.replace("/login?redirect=/yonetim")
      return
    }

    // 3. User authenticated, check role
    if (user && !ALLOWED_ROLES.includes(user.rol)) {
      router.replace("/?unauthorized=1")
    }
  }, [user, isAuthenticated, router, hasHydrated])

  // Still hydrating
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not authenticated after hydration
  if (!isAuthenticated) {
    // Check if there's a valid token in localStorage (hydration delay)
    if (typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )
    }
    return null
  }

  // User role — show brief unauthorized message before redirect
  if (user && !ALLOWED_ROLES.includes(user.rol)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3 max-w-md">
          <ShieldAlert className="w-12 h-12 text-danger mx-auto" />
          <h2 className="text-xl font-bold">Erişim Engellendi</h2>
          <p className="text-muted-foreground text-sm">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Yönetim paneli sadece
            Müdür, Amir ve Çavuş rollerine açıktır.
          </p>
          <p className="text-xs text-muted-foreground">Anasayfaya yönlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

