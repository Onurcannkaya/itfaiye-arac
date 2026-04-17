import Link from 'next/link'
import Image from 'next/image'
import { Home, Truck, Users, Wrench, FileText, ScanLine } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center px-6 border-b border-border space-x-3">
         <Image src="/logo-itfaiye.png" alt="Logo" width={32} height={32} className="object-contain" />
         <h1 className="text-lg font-bold tracking-tight text-foreground">Sivas İtfaiyesi</h1>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        <Link href="/" className="flex items-center space-x-3 rounded-md px-3 py-2 bg-primary/10 text-primary font-medium">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/araclar" className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Truck size={20} />
          <span>Araçlar & Envanter</span>
        </Link>
        <Link href="/yonetim/personel" className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Users size={20} />
          <span>Personel</span>
        </Link>
        <Link href="/bakim" className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Wrench size={20} />
          <span>Bakım & Yakıt</span>
        </Link>
        <Link href="/barkod" className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <ScanLine size={20} />
          <span>Barkod Tarayıcı</span>
        </Link>
        <Link href="/envanter-yonetimi" className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <ScanLine size={20} />
          <span>QR & Envanter Yön.</span>
        </Link>
        <Link href="/gorevler" className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <FileText size={20} />
          <span>Görevler</span>
        </Link>
      </nav>
    </aside>
  )
}
