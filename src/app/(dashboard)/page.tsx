import { Truck, Users, AlertTriangle, CheckSquare, Activity } from 'lucide-react'
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"

import { query, queryMany, queryOne } from "@/lib/db"
import { ShiftList } from "@/components/dashboard/ShiftList"

export default async function DashboardPage() {
  let activeVehicles = 0
  let personnelData: any[] = []
  let scbaWarningCount = 0
  let expiringCertifications: any[] = []
  let maintenanceCount = 0
  let closedIncidentsCount = 0
  let missingEquipments: Array<{ plaka: string; malzeme: string; durum: string }> = []
  let activeIncidentReports: Array<{ plaka: string; aciklama: string; oncelik: string }> = []

  try {
    // Aktif araç sayısı
    const vResult = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM vehicles WHERE durum = 'aktif'");
    activeVehicles = parseInt(vResult?.count || '0', 10);

    // Aktif personel
    personnelData = await queryMany('SELECT * FROM personnel WHERE aktif = true');

    // SCBA Warnings (< 6 months)
    const scbaData = await queryMany<{ sonraki_test_tarihi: string }>('SELECT sonraki_test_tarihi FROM scba_cylinders');
    const now = new Date().getTime();
    scbaWarningCount = scbaData.filter(c => {
      const next = new Date(c.sonraki_test_tarihi).getTime();
      const diffDays = (next - now) / (1000 * 60 * 60 * 24);
      return diffDays <= 180;
    }).length;

    // Expiring Certifications (view)
    expiringCertifications = await queryMany('SELECT * FROM vw_expiring_certifications');

    // Acil Bakım sayısı
    const maintResult = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM vehicle_maintenances WHERE durum IN ('Bekliyor', 'Serviste')");
    maintenanceCount = parseInt(maintResult?.count || '0', 10);

    // Tamamlanan Görev (Kapalı Vakalar)
    const closedResult = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM incidents WHERE status = 'closed'");
    closedIncidentsCount = parseInt(closedResult?.count || '0', 10);

    // Bölmelerdeki eksik/arızalı malzemeleri tara
    const vehiclesData = await queryMany<{ plaka: string; bolmeler: any }>('SELECT plaka, bolmeler FROM vehicles');
    vehiclesData.forEach(v => {
      try {
        const bolmeler = typeof v.bolmeler === 'string' ? JSON.parse(v.bolmeler) : v.bolmeler;
        if (bolmeler && typeof bolmeler === 'object') {
          Object.entries(bolmeler).forEach(([_, items]: [string, any]) => {
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                if (item && item.malzeme && item.durum) {
                  const statusUpper = item.durum.toUpperCase();
                  if (statusUpper.includes('EKSIK') || statusUpper.includes('KAYIP') || statusUpper.includes('ARIZALI')) {
                    missingEquipments.push({
                      plaka: v.plaka,
                      malzeme: item.malzeme,
                      durum: item.durum
                    });
                  }
                }
              });
            }
          });
        }
      } catch {}
    });

    // Aktif arıza bildirimlerini çek
    activeIncidentReports = await queryMany<{ plaka: string; aciklama: string; oncelik: string }>(
      "SELECT plaka, aciklama, oncelik FROM incident_reports WHERE durum = 'acik' ORDER BY created_at DESC LIMIT 5"
    );

  } catch (err) {
    console.error("Dashboard database fetch error:", err);
  }

  // Calculate active posta based on days since epoch (rotation of 3 shifts: 1, 2, 3)
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const daysSinceEpoch = Math.floor(todayStart.getTime() / MS_PER_DAY);
  const activePosta = (daysSinceEpoch % 3) + 1;

  // Filter personnel for active posta
  const activeShiftPersonnel = personnelData.filter(p => p.posta_no === activePosta)

  // Role matching for active shift
  const leaders = activeShiftPersonnel.filter(p =>
    p.rol === 'Shift_Leader' || p.rol === 'Admin' || p.rol === 'Editor'
  )
  const others = activeShiftPersonnel.filter(p =>
    p.rol !== 'Shift_Leader' && p.rol !== 'Admin' && p.rol !== 'Editor'
  ).sort((a: any, b: any) => a.ad.localeCompare(b.ad))
  
  const sortedPersonnel = [...leaders, ...others]

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
          value={maintenanceCount} 
          icon={AlertTriangle} 
          description={maintenanceCount > 0 ? `${maintenanceCount} adet aktif bakım kaydı bulunmaktadır.` : "Bekleyen acil araç bakım talebi yok."}
          className={maintenanceCount > 0 ? "border-danger/30 hover:border-danger/60" : "border-warning/30 hover:border-warning/60"}
        />
        <StatCard 
          title="Tamamlanan Görev" 
          value={closedIncidentsCount} 
          icon={CheckSquare} 
          description="Toplam tamamlanan olay raporu" 
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
               {expiringCertifications.length === 0 && scbaWarningCount === 0 && missingEquipments.length === 0 && activeIncidentReports.length === 0 && (
                 <p className="text-xs text-muted-foreground text-center py-4">Kayıtlı herhangi bir aktif uyarı bulunmamaktadır.</p>
               )}
               
               {expiringCertifications.map((cert: any) => (
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

               {missingEquipments.slice(0, 5).map((eq, i) => (
                 <div key={`missing-${i}`} className="flex items-start space-x-3 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger">
                   <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                   <div>
                     <h4 className="text-sm font-bold">Eksik Ekipman: {eq.malzeme}</h4>
                     <p className="text-xs mt-1 text-danger/80">{eq.plaka} plakalı araçta {eq.malzeme} {eq.durum.toLowerCase()}.</p>
                   </div>
                 </div>
               ))}

               {activeIncidentReports.map((rep, idx) => (
                 <div 
                   key={`rep-${idx}`} 
                   className={rep.oncelik === 'kritik' || rep.oncelik === 'yuksek' 
                     ? "flex items-start space-x-3 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger" 
                     : "flex items-start space-x-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning"
                   }
                 >
                   <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                   <div>
                     <h4 className="text-sm font-bold">Aktif Arıza Bildirimi: {rep.plaka}</h4>
                     <p className="text-xs mt-1 opacity-90">{rep.aciklama}</p>
                   </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
