"use client"
import { useState, useEffect } from "react"
import { mockMaintenanceLogs, mockFuelLogs } from "@/lib/data"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Wrench, Fuel, Gauge, Clock, TrendingUp, Calendar } from "lucide-react"

const MAINTENANCE_TIP_LABEL: Record<string, string> = {
  periyodik: "Periyodik Bakım",
  ariza: "Arıza Onarımı",
  kaza: "Kaza Onarımı",
  revizyon: "Revizyon",
}

const MAINTENANCE_TIP_VARIANT: Record<string, "success" | "danger" | "warning" | "default"> = {
  periyodik: "success",
  ariza: "danger",
  kaza: "danger",
  revizyon: "warning",
}

export default function BakimPage() {
  const [activeTab, setActiveTab] = useState<"bakim" | "yakit">("bakim")
  const [selectedPlaka, setSelectedPlaka] = useState<string>("all")
  const [vehicles, setVehicles] = useState<any[]>([])

  useEffect(() => {
    async function loadVehicles() {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('plaka')
      if (data) setVehicles(data)
    }
    loadVehicles()
  }, [])


  const filteredMaintenance = selectedPlaka === "all"
    ? mockMaintenanceLogs
    : mockMaintenanceLogs.filter(m => m.plaka === selectedPlaka)

  const filteredFuel = selectedPlaka === "all"
    ? mockFuelLogs
    : mockFuelLogs.filter(f => f.plaka === selectedPlaka)

  const totalFuelCost = mockFuelLogs.reduce((s, f) => s + f.tutar, 0)
  const totalMaintenanceCost = mockMaintenanceLogs.reduce((s, m) => s + (m.maliyet || 0), 0)

  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bakım & Yakıt Takibi</h1>
        <p className="text-muted-foreground mt-1 text-sm">Araçların periyodik bakım, arıza ve yakıt kayıtları.</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 rounded-lg"><Wrench className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Bakım</p>
              <p className="text-xl font-bold">{mockMaintenanceLogs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2.5 bg-warning/10 rounded-lg"><TrendingUp className="w-5 h-5 text-warning" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Bakım Maliyeti</p>
              <p className="text-xl font-bold">₺{totalMaintenanceCost.toLocaleString("tr-TR")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2.5 bg-success/10 rounded-lg"><Fuel className="w-5 h-5 text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Yakıt Alım</p>
              <p className="text-xl font-bold">{mockFuelLogs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Yakıt Maliyeti</p>
              <p className="text-xl font-bold">₺{totalFuelCost.toLocaleString("tr-TR")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab + Filtre */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex bg-muted rounded-lg p-1">
          <button onClick={() => setActiveTab("bakim")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "bakim" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Wrench className="w-4 h-4 inline mr-1.5 -mt-0.5" />Bakım Logları
          </button>
          <button onClick={() => setActiveTab("yakit")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "yakit" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Fuel className="w-4 h-4 inline mr-1.5 -mt-0.5" />Yakıt Logları
          </button>
        </div>
        <select value={selectedPlaka} onChange={e => setSelectedPlaka(e.target.value)} className="h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Tüm Araçlar</option>
          {vehicles.map((v: any) => <option key={v.plaka} value={v.plaka}>{v.plaka}</option>)}
        </select>
      </div>

      {/* Bakım Tablosu */}
      {activeTab === "bakim" && (
        <Card>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base">Bakım Geçmişi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Tarih</th>
                    <th className="px-4 py-3 text-left">Plaka</th>
                    <th className="px-4 py-3 text-left">Tip</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">KM</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">PTO Saat</th>
                    <th className="px-4 py-3 text-left">Açıklama</th>
                    <th className="px-4 py-3 text-right">Maliyet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredMaintenance.map(log => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-muted-foreground -mt-0.5" />
                        {new Date(log.tarih).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{log.plaka}</td>
                      <td className="px-4 py-3">
                        <Badge variant={MAINTENANCE_TIP_VARIANT[log.tip] || "default"}>
                          {MAINTENANCE_TIP_LABEL[log.tip] || log.tip}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Gauge className="w-3.5 h-3.5 inline mr-1 text-muted-foreground -mt-0.5" />{log.kmAt.toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Clock className="w-3.5 h-3.5 inline mr-1 text-muted-foreground -mt-0.5" />{log.ptoAt.toLocaleString("tr-TR")} sa
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.aciklama}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {log.maliyet ? `₺${log.maliyet.toLocaleString("tr-TR")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yakıt Tablosu */}
      {activeTab === "yakit" && (
        <Card>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base">Yakıt Alım Geçmişi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Tarih</th>
                    <th className="px-4 py-3 text-left">Plaka</th>
                    <th className="px-4 py-3 text-right">Litre</th>
                    <th className="px-4 py-3 text-right">Tutar</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">KM</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">İstasyon</th>
                    <th className="px-4 py-3 text-left">Kayıt Eden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredFuel.map(log => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-muted-foreground -mt-0.5" />
                        {new Date(log.tarih).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{log.plaka}</td>
                      <td className="px-4 py-3 text-right">{log.litre} lt</td>
                      <td className="px-4 py-3 text-right font-semibold">₺{log.tutar.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{log.kmAt.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{log.istasyon}</td>
                      <td className="px-4 py-3">{log.kayitEden}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
