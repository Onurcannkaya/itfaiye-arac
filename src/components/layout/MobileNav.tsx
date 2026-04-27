"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Truck, Wind, FileText, Menu, X, Users, ListChecks, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function MobileNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false
    return pathname.startsWith(path)
  }

  const navLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className={cn(
        "flex flex-col items-center justify-center w-full py-2 transition-colors relative min-h-[56px]",
        isActive(href) ? "text-primary" : "text-muted-foreground active:text-primary/70"
      )}
    >
      {icon}
      <span className="text-[10px] mt-1 font-medium leading-none">{label}</span>
      {isActive(href) && <div className="absolute top-0 w-10 h-1 bg-primary rounded-b-md" />}
    </Link>
  )

  return (
    <>
      {/* Expanded Menu Overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative z-50 bg-surface border-t border-border rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-2 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm">Tüm Modüller</h3>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <Link href="/bakim" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors min-h-[52px]", isActive('/bakim') ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
              <Wrench className="w-5 h-5" /> <span className="font-medium">Bakım & Yakıt</span>
            </Link>
            <Link href="/yonetim/personel" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors min-h-[52px]", isActive('/yonetim') ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
              <Users className="w-5 h-5" /> <span className="font-medium">Personel Yönetimi</span>
            </Link>
            <Link href="/yonetim/sablonlar" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors min-h-[52px]", isActive('/yonetim/sablonlar') ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
              <ListChecks className="w-5 h-5" /> <span className="font-medium">Görev Şablonları</span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-md flex items-center justify-around z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.12)]"
           style={{ height: 'calc(72px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navLink("/", <Home size={22} />, "Ana Sayfa")}
        {navLink("/araclar", <Truck size={22} />, "Araçlar")}
        {navLink("/scba", <Wind size={22} />, "SCBA")}
        {navLink("/gorevler", <FileText size={22} />, "Görevler")}
        
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "flex flex-col items-center justify-center w-full py-2 transition-colors min-h-[56px]",
            menuOpen ? "text-primary" : "text-muted-foreground active:text-primary/70"
          )}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          <span className="text-[10px] mt-1 font-medium leading-none">Menü</span>
        </button>
      </nav>
    </>
  )
}
