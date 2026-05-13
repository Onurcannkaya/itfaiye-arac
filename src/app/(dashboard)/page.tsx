import { Truck, Users, AlertTriangle, CheckSquare, Activity } from 'lucide-react'
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

import { createClient } from "@/lib/supabase/server"
import { ShiftList } from "@/components/dashboard/ShiftList"

export default async function DashboardPage() {
  let activeVehicles = 0
  let personnelData: any[] = []
  let scbaWarningCount = 0
  let expiringCertifications: any[] = []

  try {
    const supabase = await createClient()
    const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true })
    activeVehicles = count || 0

    const { data } = await supabase.from('personnel').select('*').eq('aktif', true)
    if (data) personnelData = data

    // SCBA Warnings (< 6 months)
    const { data: scbaData } = await supabase.from('scba_cylinders').select('sonraki_test_tarihi')
    if (scbaData) {
      const now = new Date().getTime()
      scbaWarningCount = scbaData.filter(c => {
         const next = new Date(c.sonraki_test_tarihi).getTime()
         const diffDays = (next - now) / (1000 * 60 * 60 * 24)
         return diffDays <= 180
      }).length
    }

    // Expiring Certifications
    const { data: certsData } = await supabase.from('vw_expiring_certifications').select('*')
    if (certsData) {
      expiringCertifications = certsData
    }

  } catch {
    // Supabase unreachable
  }

  // Role matching
  const leaders = personnelData.filter(p =>
    p.rol === 'Shift_Leader' || p.rol === 'Admin' || p.rol === 'Editor'
  )
  const others = personnelData.filter(p =>
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
          value={activeShiftPersonnel.length} 
          icon={Users} 
          description={`${activePosta}. Posta aktif nöbetçi listesi`} 
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
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base flex items-center space-x-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span>{activePosta}. Posta Nöbetçi Personel Listesi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ShiftList personnel={sortedPersonnel} activePosta={activePosta} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Günlük Uyarılar</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               {expiringCertifications.map(cert => (
                 <div key={cert.id} className="flex items-start space-x-3 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger">
                   <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                   <div>
                     <h4 className="text-sm font-bold">{cert.ad} {cert.soyad} - {cert.tip} Uyarısı</h4>
                     <p className="text-xs mt-1 text-danger/80">
                       {cert.tip} belgesinin dolmasına <strong>{cert.kalan_gun < 0 ? 0 : cert.kalan_gun} gün kaldı!</strong> (Bitiş: {new Date(cert.gecerlilik_tarihi).toLocaleDateString('tr-TR')})
                     </p>
                   </div>
                 </div>
               ))}
               {scbaWarningCount > 0 && (
                 <div className="flex items-start space-x-3 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger">
                    <Activity size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">SCBA Test Uyarısı</h4>
                      <p className="text-xs mt-1 text-danger/80">
                        <strong>{scbaWarningCount}</strong> adet oksijen tüpünün hidrostatik test tarihi geçmiş veya yaklaşmakta!
                      </p>
                    </div>
                 </div>
               )}
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
