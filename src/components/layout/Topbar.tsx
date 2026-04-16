import { Bell } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 z-10">
      <div className="flex items-center md:hidden space-x-2">
        <Image src="/logo-itfaiye.png" alt="Logo" width={28} height={28} className="object-contain" />
        <h1 className="text-lg font-bold tracking-tight">Sivas İtfaiyesi</h1>
      </div>
      <div className="hidden md:flex flex-1"></div>
      <div className="flex items-center space-x-4">
        <button className="rounded-full p-2 hover:bg-muted relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-danger border-2 border-surface"></span>
        </button>
        <Link href="/login" title="Çıkış Yap" className="flex items-center space-x-3 bg-muted/50 rounded-full py-1.5 px-3 hover:bg-muted cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            ÖÇ
          </div>
          <div className="hidden md:block text-sm pr-2">
            <p className="font-semibold leading-none text-foreground">Ömer Çakmak</p>
            <p className="text-muted-foreground text-[11px] mt-0.5 uppercase tracking-wide">Vardiya Çavuşu (Çıkış)</p>
          </div>
        </Link>
      </div>
    </header>
  )
}
