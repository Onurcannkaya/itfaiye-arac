import { Truck, Users, AlertTriangle, CheckSquare } from 'lucide-react'
import { StatCard } from "@/components/dashboard/StatCard"
import { mockVehicles, mockPersonnel } from "@/lib/data"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  let activeVehicles = 0

  try {
    const supabase = await createClient()
    const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true })
    activeVehicles = count || 0
  } catch {
    // Supabase unreachable — fallback to mock data count
    activeVehicles = mockVehicles.length
  }

  const shiftPersonnel = mockPersonnel.filter(p => !!p.ad)

  // Updated role matching — now uses Shift_Leader and Admin/Editor
  const leaders = mockPersonnel.filter(p =>
    p.rol === 'Shift_Leader' || p.rol === 'Admin' || p.rol === 'Editor'
  )
  const others = mockPersonnel.filter(p =>
    p.rol !== 'Shift_Leader' && p.rol !== 'Admin' && p.rol !== 'Editor'
  ).sort((a, b) => a.ad.localeCompare(b.ad))
  const sortedPersonnel = [...leaders, ...others]

  // Role display helper
  function rolLabel(rol: string, unvan?: string): string {
    if (unvan) return unvan
    switch (rol) {
      case 'Admin': return 'Yönetici'
      case 'Editor': return 'Amir'
      case 'Shift_Leader': return 'Vardiya Çavuşu'
      default: return 'İtfaiye Eri'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col flex-wrap sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gösterge Paneli</h1>
          <p className="text-muted-foreground text-sm mt-1">Günlük özet, aktif görevler ve nöbetçi detayları.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Aktif Araçlar" 
          value={activeVehicles} 
          icon={Truck} 
          description="Garajda göreve hazır araç sayısı" 
        />
        <StatCard 
          title="Nöbetçi Personel" 
          value={shiftPersonnel.length} 
          icon={Users} 
          description="A Postası aktif nöbetçi listesi" 
        />
        <StatCard 
          title="Acil Bakım" 
          value="0" 
          icon={AlertTriangle} 
          description="Bekleyen acil araç bakım talebi yok." 
          className="border-warning/30 hover:border-warning/60"
        />
        <StatCard 
          title="Tamamlanan Görev" 
          value="4" 
          icon={CheckSquare} 
          description="Bugün başarıyla tamamlanan vaka" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Nöbetçi Personel Listesi</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-md">Sicil No</th>
                    <th className="px-4 py-3">Ad Soyad</th>
                    <th className="px-4 py-3 min-w-[120px]">Unvan</th>
                    <th className="px-4 py-3 rounded-tr-md text-right min-w-[100px]">Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPersonnel.map((p) => (
                    <tr key={p.sicil_no} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{p.sicil_no}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {p.ad} {p.soyad}
                        {(p.rol === 'Shift_Leader' || p.rol === 'Admin') && <Badge variant="default" className="ml-2 scale-90">{p.unvan}</Badge>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.unvan}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{rolLabel(p.rol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Günlük Uyarılar</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               <div className="flex items-start space-x-3 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Eksik Ekipman Bildirimi</h4>
                    <p className="text-xs mt-1 text-danger/80">58 TH 256 plakalı araçta 1 adet Hilti eksik.</p>
                  </div>
               </div>
               <div className="flex items-start space-x-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Yakıt Kontrolü</h4>
                    <p className="text-xs mt-1 text-warning/80">58 ACT 367 plakalı aracın yakıt seviyesi kritik (%15).</p>
                  </div>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
