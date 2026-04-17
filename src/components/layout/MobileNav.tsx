"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Truck, ScanLine, Users, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false
    return pathname.startsWith(path)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface/90 backdrop-blur-md flex items-center justify-between h-[68px] pb-safe z-50 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <Link 
        href="/" 
        className={cn(
          "flex flex-col items-center justify-center w-full h-full pt-1 transition-colors relative",
          isActive('/') ? "text-primary" : "text-muted-foreground hover:text-primary/70"
        )}
      >
        <Home size={24} className={isActive('/') ? "fill-primary/20" : ""} />
        <span className="text-[10px] mt-1 font-medium">Ana Sayfa</span>
        {isActive('/') && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-md" />}
      </Link>
      
      <Link 
        href="/araclar" 
        className={cn(
          "flex flex-col items-center justify-center w-full h-full pt-1 transition-colors relative",
          isActive('/araclar') ? "text-primary" : "text-muted-foreground hover:text-primary/70"
        )}
      >
        <Truck size={24} className={isActive('/araclar') ? "fill-primary/20" : ""} />
        <span className="text-[10px] mt-1 font-medium">Araçlar</span>
        {isActive('/araclar') && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-md" />}
      </Link>

      {/* Floating Action Button (Barkod) */}
      <div className="relative w-full h-full flex justify-center">
        <Link 
          href="/barkod" 
          className={cn(
            "absolute -top-6 flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg border-4 border-surface hover:scale-105 active:scale-95 transition-all relative z-10",
            isActive('/barkod') || isActive('/arac/') 
              ? "bg-cyan-500 text-white shadow-cyan-500/30 ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-surface" 
              : "bg-primary text-primary-foreground shadow-primary/30"
          )}
        >
          <ScanLine size={isActive('/barkod') || isActive('/arac/') ? 30 : 28} className={isActive('/barkod') || isActive('/arac/') ? "animate-pulse" : ""} />
        </Link>
        <span className="absolute bottom-1.5 text-[10px] font-bold text-primary">Barkod</span>
      </div>

      <Link 
        href="/yonetim/personel" 
        className={cn(
          "flex flex-col items-center justify-center w-full h-full pt-1 transition-colors relative",
          isActive('/yonetim/personel') ? "text-primary" : "text-muted-foreground hover:text-primary/70"
        )}
      >
        <Users size={24} className={isActive('/yonetim/personel') ? "fill-primary/20" : ""} />
        <span className="text-[10px] mt-1 font-medium">Personel</span>
        {isActive('/yonetim/personel') && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-md" />}
      </Link>

      <button className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary pt-1 transition-colors focus:outline-none">
        <Menu size={24} />
        <span className="text-[10px] mt-1 font-medium">Menü</span>
      </button>
    </nav>
  )
}
