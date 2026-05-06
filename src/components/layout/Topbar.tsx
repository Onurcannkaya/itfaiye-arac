"use client"
import { Bell, LogOut, ScanLine } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/authStore'
import Link from 'next/link'

export function Topbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const displayName = user ? `${user.ad} ${user.soyad}` : "Misafir"
  const initials = user?.initials || "?"
  const rolLabel = user?.unvan || (user?.rol === 'Admin' ? 'Yönetici' : user?.rol === 'Editor' ? 'Amir' : user?.rol === 'Shift_Leader' ? 'Vardiya Çavuşu' : 'İtfaiye Eri')

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-3 sm:px-4 md:px-6 z-10 min-h-14 sm:min-h-16">
      <div className="flex items-center md:hidden space-x-2">
        <Image src="/logo-itfaiye.png" alt="Logo" width={28} height={28} className="object-contain" />
        <h1 className="text-lg font-bold tracking-tight">Sivas İtfaiyesi</h1>
      </div>
      <div className="hidden md:flex flex-1"></div>
      <div className="flex items-center space-x-3">
        
        {/* Desktop Quick Scan Button */}
        <Link 
          href="/barkod" 
          className="hidden md:flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors mr-2"
        >
          <ScanLine size={18} />
          <span className="text-sm font-bold">Barkod Oku</span>
        </Link>
        <button className="rounded-full p-2 hover:bg-muted relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-danger border-2 border-surface"></span>
        </button>
        
        {isAuthenticated ? (
          <button 
            onClick={handleLogout}
            title="Çıkış Yap"
            className="flex items-center space-x-3 bg-muted/50 rounded-full py-1.5 px-3 hover:bg-muted cursor-pointer transition-colors group"
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
            <div className="hidden md:block text-sm pr-2">
              <p className="font-semibold leading-none text-foreground">{displayName}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5 uppercase tracking-wide flex items-center gap-1">
                {rolLabel} 
                <LogOut className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-danger" />
              </p>
            </div>
          </button>
        ) : (
          <button 
            onClick={() => router.push('/login')} 
            className="flex items-center space-x-2 bg-primary/10 rounded-full py-1.5 px-4 hover:bg-primary/20 text-primary text-sm font-semibold transition-colors"
          >
            Giriş Yap
          </button>
        )}
      </div>
    </header>
  )
}
