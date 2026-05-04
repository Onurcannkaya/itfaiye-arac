"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { BarChart3, Droplets, Flame, Activity, MapPin, Loader2, Clock, Calendar, ShieldAlert } from "lucide-react"

type Incident = any; // TODO: Better typing

export default function IstatistiklerPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false })
          
        if (data) setIncidents(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 1. Olay Türü Dağılımı (Distribution)
  const distribution = useMemo(() => {
    const dist: Record<string, number> = {}
    incidents.forEach(inc => {
      dist[inc.olay_turu] = (dist[inc.olay_turu] || 0) + 1
    })
    
    // Sort by count descending
    return Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [incidents])

  const maxDistribution = distribution.length > 0 ? Math.max(...distribution.map(d => d.count)) : 0

  // 2. Sarfiyat Özetleri (Consumption)
  const consumption = useMemo(() => {
    let totalWater = 0
    let totalFoam = 0
    let totalKkt = 0

    incidents.forEach(inc => {
      totalWater += Number(inc.kullanilan_su_ton) || 0
      totalFoam += Number(inc.kullanilan_kopuk_litre) || 0
      totalKkt += Number(inc.kullanilan_kkt_kg) || 0
    })

    return { totalWater, totalFoam, totalKkt }
  }, [incidents])

  // 3. Performans ve Süre Analizi (Avg Response Time)
  const performance = useMemo(() => {
    let totalMinutes = 0
    let validCount = 0

    incidents.forEach(inc => {
      if (inc.cikis_saati && inc.varis_saati) {
        const cikis = new Date(inc.cikis_saati).getTime()
        const varis = new Date(inc.varis_saati).getTime()
        const diffMinutes = (varis - cikis) / (1000 * 60)
        
        // Ignore negative or crazy long times (e.g. typos)
        if (diffMinutes >= 0 && diffMinutes < 120) {
          totalMinutes += diffMinutes
          validCount++
        }
      }
    })

    const avg = validCount > 0 ? Math.round(totalMinutes / validCount) : 0
    return { avg, validCount }
  }, [incidents])

  // 4. Sıcak Noktalar (Hotspots - Top 5 Mahalle)
  const hotspots = useMemo(() => {
    const dist: Record<string, number> = {}
    incidents.forEach(inc => {
      if (inc.mahalle) {
        const mh = inc.mahalle.toUpperCase().trim()
        dist[mh] = (dist[mh] || 0) + 1
      }
    })
    
    return Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }, [incidents])

  const maxHotspot = hotspots.length > 0 ? hotspots[0].count : 0

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse text-muted-foreground flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" /> 
        İstatistikler Hesaplanıyor...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Raporlama ve İstatistik Analiz Paneli</h1>
        <p className="text-muted-foreground text-sm">Sistemdeki tüm vakaların gerçek zamanlı karar destek verileri</p>
      </div>

      {incidents.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-surface/50 text-muted-foreground">
          Sistemde analiz edilecek vaka kaydı bulunamadı.
        </div>
      ) : (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Vaka</p>
                    <h3 className="text-3xl font-bold mt-1">{incidents.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kullanılan Su (Ton)</p>
                    <h3 className="text-3xl font-bold mt-1 text-blue-500">{consumption.totalWater.toLocaleString('tr-TR')}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Droplets className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kullanılan Köpük (Lt)</p>
                    <h3 className="text-3xl font-bold mt-1 text-warning">{consumption.totalFoam.toLocaleString('tr-TR')}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kullanılan KKT (Kg)</p>
                    <h3 className="text-3xl font-bold mt-1 text-danger">{consumption.totalKkt.toLocaleString('tr-TR')}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                    <Flame className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Olay Dağılımı */}
            <Card className="border-border flex flex-col h-full">
              <CardHeader className="border-b bg-surface/30">
                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Olay Türü Dağılımı</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-4">
                {distribution.map((item, idx) => {
                  const percent = maxDistribution > 0 ? Math.round((item.count / maxDistribution) * 100) : 0
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground font-mono">{item.count} Vaka</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            item.name === 'Yangın' ? 'bg-danger' : 
                            item.name === 'Trafik Kazası' ? 'bg-warning' : 
                            item.name === 'Asılsız İhbar' ? 'bg-slate-400' : 
                            'bg-primary'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              {/* 3. Performans */}
              <Card className="border-border">
                <CardHeader className="border-b bg-surface/30 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" /> Ortalama Varış Süresi</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">İstasyondan çıkış ile olay yerine varış arasındaki ortalama süre.</p>
                    <p className="text-xs text-muted-foreground opacity-60">Hesaplanan vaka sayısı: {performance.validCount}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-5xl font-extrabold text-emerald-500">{performance.avg}</span>
                    <span className="text-emerald-500/70 font-medium ml-1">dk</span>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Sıcak Noktalar */}
              <Card className="border-border flex-1">
                <CardHeader className="border-b bg-surface/30 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-danger" /> Riskli Bölgeler (Hotspots)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {hotspots.map((item, idx) => {
                      const percent = maxHotspot > 0 ? Math.round((item.count / maxHotspot) * 100) : 0
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-3 w-2/3">
                            <div className="w-8 h-8 rounded-full bg-danger/10 text-danger font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </div>
                            <span className="font-medium truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 w-1/3 justify-end">
                            <div className="w-24 hidden sm:block bg-muted rounded-full h-1.5 overflow-hidden opacity-50">
                              <div className="bg-danger h-full rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                            <Badge variant="outline" className="font-mono bg-background border-danger/20">{item.count} Olay</Badge>
                          </div>
                        </div>
                      )
                    })}
                    {hotspots.length === 0 && (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Yeterli lokasyon verisi bulunmuyor.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
