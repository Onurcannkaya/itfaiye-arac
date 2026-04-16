import Link from 'next/link'
import { Home, Truck, ScanLine, Users, Menu } from 'lucide-react'

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface/90 backdrop-blur-md flex items-center justify-between h-[68px] pb-safe z-50 px-2">
      <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary pt-1 transition-colors">
        <Home size={24} />
        <span className="text-[10px] mt-1 font-medium">Ana Sayfa</span>
      </Link>
      
      <Link href="/araclar" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary pt-1 transition-colors">
        <Truck size={24} />
        <span className="text-[10px] mt-1 font-medium">Araçlar</span>
      </Link>

      {/* Floating Action Button (Barkod) */}
      <div className="relative w-full h-full flex justify-center">
        <Link href="/barkod" className="absolute -top-6 flex flex-col items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 border-4 border-surface hover:scale-105 active:scale-95 transition-transform">
          <ScanLine size={28} />
        </Link>
        <span className="absolute bottom-1.5 text-[10px] font-bold text-primary">Barkod</span>
      </div>

      <Link href="/personel" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary pt-1 transition-colors">
        <Users size={24} />
        <span className="text-[10px] mt-1 font-medium">Personel</span>
      </Link>

      <button className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary pt-1 transition-colors focus:outline-none">
        <Menu size={24} />
        <span className="text-[10px] mt-1 font-medium">Menü</span>
      </button>
    </nav>
  )
}
