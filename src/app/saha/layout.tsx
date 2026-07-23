"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/authStore"

/**
 * Saha Modu düzeni — bilinçli olarak sade.
 * (dashboard) grubunun DIŞINDADIR; Sidebar / Topbar / MobileNav render EDİLMEZ.
 * Böylece teknolojiyle arası az olan saha personeli için karmaşa kaldırılır.
 * Mevcut yönetim paneli düzeni hiç değişmez.
 */
export default function SahaLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const router = useRouter()

  // İlk giriş / parola sıfırlama sonrası önce parola değişimi zorunludur.
  useEffect(() => {
    if (user?.mustChangePassword) {
      router.replace("/sifre-degistir")
    }
  }, [user?.mustChangePassword, router])

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--fd-bg)] text-[var(--fd-text)] flex flex-col">
      {children}
    </div>
  )
}
