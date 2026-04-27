"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/authStore"
import { ShieldAlert, Loader2 } from "lucide-react"

const ALLOWED_ROLES = ["Admin", "Editor", "Shift_Leader"]

export default function YonetimLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?redirect=/yonetim/personel")
      return
    }

    if (user && !ALLOWED_ROLES.includes(user.rol)) {
      router.replace("/?unauthorized=1")
    }
  }, [user, isAuthenticated, router])

  // Not authenticated or loading
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
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
