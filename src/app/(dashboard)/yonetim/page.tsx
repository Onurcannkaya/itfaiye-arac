"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import {
  Flame,
  Truck,
  Droplets,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  Wrench,
  Shield,
  Loader2,
  BarChart3,
  ArrowRight,
  Target,
  Map as MapIcon,
  Users,
} from "lucide-react"
import Link from "next/link"
import { CriticalAlertsWidget } from "@/components/dashboard/CriticalAlertsWidget"
import { ShiftList } from "@/components/dashboard/ShiftList"
import { Personnel } from "@/types"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

// ─── Types ──────────────────────────────────────────────────
interface KPIData {
  activeIncidents: number
  vehiclesInMaintenance: number
  faultyHydrants: number
  upcomingTraining: { count: number; nextDate: string | null; nextTopic: string | null }
}

interface DailyIncident {
  date: string
  label: string
  count: number
}

interface ActivityItem {
  id: string
  type: "incident" | "maintenance" | "hydrant" | "training"
  title: string
  detail: string
  time: string
  rawTime: string
}

interface IncidentInfo {
  created_at: string
}

interface IncidentDetail {
  id: string | number
  olay_turu: string
  mahalle: string | null
  created_at: string
}

interface VehicleMaintenance {
  id: number
  plaka: string
  islem_turu: string
  created_at: string
}

interface FireHydrant {
  id: string | number
  no: string | null
  durum: string
  created_at: string
}

interface ActivityAndTraining {
  id: number
  faaliyet_turu: string
  faaliyet_konusu: string
  created_at: string
}

interface DashboardTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name?: string; color?: string }>
  label?: string
}

interface VehicleInfo {
  plaka: string
  arac_tipi: string
}

interface ActiveIncidentDetail {
  id: string
  olay_turu: string
  ihbar_saati: string | null
  cikis_saati: string | null
  varis_saati: string | null
  donus_saati: string | null
  mahalle: string | null
  adres: string | null
  location: string | null
  status: string
  ek16_araclar: string | null
  created_at: string
}

interface ActiveMission {
  plaka: string
  arac_tipi: string
  olay_turu: string
  mahalle: string
  adres: string
  cikis_saati: string
  coords: [number, number] | null
}

// ─── Helpers ────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Az önce"
  if (diffMin < 60) return `${diffMin} dk önce`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} saat önce`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return "Dün"
  return `${diffDay} gün önce`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function LiveDuration({ cikisSaati }: { cikisSaati: string }) {
  const [durationStr, setDurationStr] = useState("00:00:00")

  useEffect(() => {
    const calculate = () => {
      const diffMs = Date.now() - new Date(cikisSaati).getTime()
      if (diffMs < 0) {
        setDurationStr("00:00:00")
        return
      }
      const totalSecs = Math.floor(diffMs / 1000)
      const hrs = Math.floor(totalSecs / 3600)
      const mins = Math.floor((totalSecs % 3600) / 60)
      const secs = totalSecs % 60

      const pad = (n: number) => String(n).padStart(2, "0")
      setDurationStr(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`)
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [cikisSaati])

  return <span className="font-mono text-cyan-400 font-bold">{durationStr}</span>
}

const activityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "incident":
      return <Flame className="w-4 h-4 text-red-500" />
    case "maintenance":
      return <Wrench className="w-4 h-4 text-orange-500" />
    case "hydrant":
      return <Droplets className="w-4 h-4 text-blue-500" />
    case "training":
      return <GraduationCap className="w-4 h-4 text-emerald-500" />
  }
}

// ─── Component ──────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<KPIData>({
    activeIncidents: 0,
    vehiclesInMaintenance: 0,
    faultyHydrants: 0,
    upcomingTraining: { count: 0, nextDate: null, nextTopic: null },
  })
  const [dailyData, setDailyData] = useState<DailyIncident[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([])
  const [activeIncidentsList, setActiveIncidentsList] = useState<ActiveIncidentDetail[]>([])
  const [personnelList, setPersonnelList] = useState<Personnel[]>([])

  // ─── PostGIS WKB parser helpers for real-time focus ─────────
  const parseWKBPoint = (wkbHex: string): [number, number] | null => {
    if (!wkbHex || typeof wkbHex !== 'string') return null
    const cleanHex = wkbHex.trim()
    if (cleanHex.length < 42) return null
    
    const isLittleEndian = cleanHex.substring(0, 2) === '01'
    const type = cleanHex.substring(2, 10)
    
    let coordsHex = ''
    if (type === '01000020' || type === '20000001') {
      coordsHex = cleanHex.substring(18)
    } else if (type === '01000000' || type === '00000001') {
      coordsHex = cleanHex.substring(10)
    } else {
      if (cleanHex.length === 50) {
        coordsHex = cleanHex.substring(18)
      } else if (cleanHex.length === 42) {
        coordsHex = cleanHex.substring(10)
      } else {
        return null
      }
    }

    if (coordsHex.length < 32) return null

    const xHex = coordsHex.substring(0, 16)
    const yHex = coordsHex.substring(16, 32)

    const hexToDouble = (hexStr: string): number => {
      const bytes = new Uint8Array(8)
      for (let i = 0; i < 8; i++) {
        const byteHex = hexStr.substring(i * 2, i * 2 + 2)
        bytes[isLittleEndian ? i : 7 - i] = parseInt(byteHex, 16)
      }
      const view = new DataView(bytes.buffer)
      return view.getFloat64(0, true)
    }

    const x = hexToDouble(xHex)
    const y = hexToDouble(yHex)

    return [x, y]
  }

  const parseLocation = (loc: any): [number, number] | null => {
    if (!loc) return null
    if (typeof loc === 'string') {
      const trimmed = loc.trim()
      if (/^[0-9a-fA-F]+$/.test(trimmed)) {
        const parsed = parseWKBPoint(trimmed)
        if (parsed) return parsed
      }
      try {
        const parsed = JSON.parse(loc)
        if (parsed.coordinates) {
          return [parsed.coordinates[0], parsed.coordinates[1]]
        }
      } catch {
        return null
      }
    }
    if (loc.coordinates) {
      return [loc.coordinates[0], loc.coordinates[1]]
    }
    return null
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // ── 1. KPI: Active Incidents ──────────────────────────
      const { count: incidentCount } = await api
        .from("incidents")
        .select("*")
        .eq("status", "active")

      // ── 2. KPI: Vehicles in Maintenance ───────────────────
      const { count: maintCount } = await api
        .from("vehicles")
        .select("*")
        .eq("status", "maintenance")

      // ── 3. KPI: Faulty Hydrants ───────────────────────────
      const { count: hydrantCount } = await api
        .from("fire_hydrants")
        .select("*")
        .eq("status", "broken")

      // ── 4. KPI: Upcoming Trainings ────────────────────────
      const now = new Date().toISOString()
      const { data: trainings, count: trainingCount } = await api
        .from("activities_and_trainings")
        .select("faaliyet_konusu,baslangic_tarihi")
        .gte("baslangic_tarihi", now)
        .order("baslangic_tarihi", { ascending: true })
        .limit(1)

      setKpi({
        activeIncidents: incidentCount ?? 0,
        vehiclesInMaintenance: maintCount ?? 0,
        faultyHydrants: hydrantCount ?? 0,
        upcomingTraining: {
          count: trainingCount ?? 0,
          nextDate: trainings?.[0]?.baslangic_tarihi ?? null,
          nextTopic: trainings?.[0]?.faaliyet_konusu ?? null,
        },
      })

      // ── 5. Last 7 Days Incident Trend ─────────────────────
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const { data: recentIncidents } = await api
        .from("incidents")
        .select("created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true })

      // Build 7-day buckets
      const buckets: DailyIncident[] = []
      const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo)
        d.setDate(d.getDate() + i)
        const dateStr = d.toISOString().split("T")[0]
        buckets.push({
          date: dateStr,
          label: dayNames[d.getDay()],
          count: 0,
        })
      }

      recentIncidents?.forEach((inc: IncidentInfo) => {
        const dateStr = new Date(inc.created_at).toISOString().split("T")[0]
        const bucket = buckets.find((b) => b.date === dateStr)
        if (bucket) bucket.count++
      })

      setDailyData(buckets)

      // ── 6. Activity Feed (last 5 from each table) ─────────
      const feed: ActivityItem[] = []

      const { data: recentInc } = await api
        .from("incidents")
        .select("id,olay_turu,mahalle,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentInc?.forEach((r: IncidentDetail) =>
        feed.push({
          id: `inc-${r.id}`,
          type: "incident",
          title: `Yeni olay: ${r.olay_turu}`,
          detail: r.mahalle || "Konum belirtilmedi",
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      const { data: recentMaint } = await api
        .from("vehicle_maintenances")
        .select("id,plaka,islem_turu,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentMaint?.forEach((r: VehicleMaintenance) =>
        feed.push({
          id: `mnt-${r.id}`,
          type: "maintenance",
          title: `${r.plaka} — ${r.islem_turu}`,
          detail: "Araç bakım kaydı oluşturuldu",
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      const { data: recentHyd } = await api
        .from("fire_hydrants")
        .select("id,no,durum,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentHyd?.forEach((r: FireHydrant) =>
        feed.push({
          id: `hyd-${r.id}`,
          type: "hydrant",
          title: `Hidrant #${r.no || "?"}`,
          detail: `Durum: ${r.durum}`,
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      const { data: recentTrain } = await api
        .from("activities_and_trainings")
        .select("id,faaliyet_turu,faaliyet_konusu,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentTrain?.forEach((r: ActivityAndTraining) =>
        feed.push({
          id: `trn-${r.id}`,
          type: "training",
          title: `${r.faaliyet_turu}: ${r.faaliyet_konusu}`,
          detail: "Eğitim/Faaliyet planlandı",
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      // Sort by raw time descending, take top 8
      feed.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime())
      setActivities(feed.slice(0, 8))

      // ── 7. Filo & Aktif Görevler Sorgulaması ───────────────
      const { data: vehiclesData } = await api
        .from<VehicleInfo>("vehicles")
        .select("plaka,arac_tipi")
      if (Array.isArray(vehiclesData)) {
        setVehicles(vehiclesData)
      }

      const { data: activeIncs } = await api
        .from<ActiveIncidentDetail>("incidents")
        .select("*")
        .eq("status", "active")
      if (Array.isArray(activeIncs)) {
        setActiveIncidentsList(activeIncs)
      }

      // ── 8. Nöbetçi Personel Sorgulaması ───────────────────
      const { data: persData } = await api
        .from<Personnel>("personnel")
        .select("*")
        .eq("aktif", true)
      if (Array.isArray(persData)) {
        setPersonnelList(persData)
      }
    } catch (err) {
      console.error("Dashboard veri hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Trend indicator ─────────────────────────────────────
  const trend = useMemo(() => {
    if (dailyData.length < 2) return 0
    const lastTwo = dailyData.slice(-2)
    return lastTwo[1].count - lastTwo[0].count
  }, [dailyData])

  const totalWeekIncidents = useMemo(
    () => dailyData.reduce((s, d) => s + d.count, 0),
    [dailyData]
  )

  const activeMissions = useMemo<ActiveMission[]>(() => {
    const list: ActiveMission[] = []

    if (activeIncidentsList.length > 0) {
      activeIncidentsList.forEach((inc) => {
        let plates: string[] = []
        if (inc.ek16_araclar) {
          try {
            plates = JSON.parse(inc.ek16_araclar)
          } catch {
            if (typeof inc.ek16_araclar === 'string') {
              plates = inc.ek16_araclar.split(',').map((p) => p.trim())
            }
          }
        }

        const coords = parseLocation(inc.location) || [37.0209312, 39.7339522]

        plates.forEach((plaka) => {
          const matchedVeh = vehicles.find((v) => v.plaka === plaka)
          list.push({
            plaka,
            arac_tipi: matchedVeh?.arac_tipi || "Arazöz",
            olay_turu: inc.olay_turu || "Bilinmeyen Olay",
            mahalle: inc.mahalle || "Bilinmeyen Mahalle",
            adres: inc.adres || "Adres belirtilmemiş",
            cikis_saati: inc.cikis_saati || inc.created_at || new Date().toISOString(),
            coords,
          })
        })
      })
    }

    return list
  }, [activeIncidentsList, vehicles])

  // ─── Nöbetçi posta: 3'lü posta döngüsü (Faz 28.23.8) ───
  // Referans: 04.06.2026 tarihinde 2. Posta nöbette. Döngü sırasıyla: 2 -> 3 -> 1 -> 2 -> 3 -> 1
  const activePostaNumber = useMemo(() => {
    const referenceDate = new Date("2026-06-04");
    referenceDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - referenceDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // diffDays % 3 can be negative or positive, make sure it maps correctly:
    const index = ((1 + (diffDays % 3) + 3) % 3) + 1;
    return index;
  }, []);

  const sortedPersonnel = useMemo<Personnel[]>(() => {
    if (personnelList.length === 0) return []
    // Filter to active posta only — ShiftList handles station grouping and hierarchical sorting internally
    return personnelList.filter(p => p.posta_no === activePostaNumber)
  }, [personnelList, activePostaNumber])

  // ─── Loading State ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Yönetim ve Gösterge Paneli yükleniyor…</p>
        </div>
      </div>
    )
  }

  // ─── KPI Card Component ───────────────────────────────────
  const KPICard = ({
    icon,
    label,
    value,
    subtitle,
    href,
    iconColor,
  }: {
    icon: React.ReactNode
    label: string
    value: number | string
    subtitle: string
    href: string
    iconColor: string
  }) => (
    <Link href={href}>
      <Card className="group relative overflow-hidden bg-slate-900/35 border-slate-800/90 hover:border-slate-700/90 transition-all duration-300 hover:shadow-md cursor-pointer rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{subtitle}</p>
            </div>
            <div
              className={`p-2.5 rounded-xl bg-slate-950/65 border border-slate-800 text-slate-300 shadow-inner group-hover:scale-105 transition-transform duration-300 ${iconColor}`}
            >
              {icon}
            </div>
          </div>
          <div className="flex items-center mt-3 pt-3 border-t border-slate-800/60">
            <span className="text-xs text-slate-400 font-medium group-hover:text-slate-200 transition-colors flex items-center gap-1">
              Detay Görüntüle <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  // ─── Custom Tooltip for Chart ─────────────────────────────
  const CustomTooltip = ({ active, payload, label }: DashboardTooltipProps) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-background border shadow-xl rounded-lg px-3 py-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-sm font-bold text-primary">{payload[0].value} olay</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Yönetim ve Gösterge Paneli
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Sivas İtfaiye Müdürlüğü Anlık Durum Özeti
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto px-3 py-1.5 text-xs font-mono border-primary/30 text-primary bg-primary/5">
          <Activity className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
          CANLI
        </Badge>
      </div>

      {/* ═══════════ GÖREVDEKİ ARAÇ DURUMLARI ═══════════ */}
      <Card className="border-border bg-slate-900/30 backdrop-blur-lg border-slate-800/80 shadow-[0_0_25px_rgba(6,182,212,0.1)] rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-800/60 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Görevdeki Araç Durumları
              </h2>
              <p className="text-xs text-cyan-400/80 font-mono mt-0.5 tracking-wide uppercase">
                Sivas İtfaiye Müdürlüğü Anlık Durum Özeti
              </p>
            </div>
          </div>
          <Link href="/yonetim/harita">
            <span className="h-9 px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer">
              <MapIcon className="w-3.5 h-3.5" /> Canlı Haritayı Aç
            </span>
          </Link>
        </div>
        <CardContent className="p-3 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {activeMissions.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 bg-slate-950/25 border border-slate-900 rounded-xl font-medium">
                Görevde aktif araç bulunmamaktadır.
              </div>
            ) : (
              activeMissions.map((mission, index) => {
                const latVal = mission.coords ? mission.coords[1].toFixed(5) : "39.73395"
                const lngVal = mission.coords ? mission.coords[0].toFixed(5) : "37.02093"
                return (
                  <div 
                    key={`${mission.plaka}-${index}`}
                    className="relative group bg-slate-950/75 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.08)] flex flex-col justify-between gap-3 overflow-hidden"
                  >
                    {/* Subtle siber grids overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                    
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold tracking-wider text-slate-200 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded shadow-inner">
                            {mission.plaka}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 border-cyan-500/20 text-cyan-400 bg-cyan-950/20 whitespace-nowrap">
                            {mission.arac_tipi}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                          <span>Vaka: <strong className="text-red-400">{mission.olay_turu}</strong></span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono whitespace-nowrap">
                        ⏱️ <LiveDuration cikisSaati={mission.cikis_saati} />
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-900 pt-2.5 relative z-10">
                      <div className="text-xs space-y-1.5">
                        <p className="text-slate-400 flex items-start gap-1">
                          <span className="text-slate-500 select-none">📍</span>
                          <span><strong className="text-slate-300">{mission.mahalle}</strong> {mission.adres}</span>
                        </p>
                        <p className="text-slate-500 font-mono text-[10px] flex items-center gap-1">
                          <span className="text-cyan-500/70 select-none">📡</span>
                          <span>GPS: <span className="text-cyan-400 font-semibold">{latVal}°N, {lngVal}°E</span></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1 relative z-10">
                      <button 
                        onClick={() => {
                          const lat = mission.coords ? mission.coords[1] : 39.73395
                          const lng = mission.coords ? mission.coords[0] : 37.02093
                          router.push(`/yonetim/harita?focusPlaka=${mission.plaka}&lat=${lat}&lng=${lng}`)
                        }}
                        className="w-full sm:w-auto px-3 h-8 text-[11px] font-semibold border border-slate-800 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 bg-slate-950/40 hover:bg-cyan-950/10 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer animate-none"
                      >
                        <Target className="w-3.5 h-3.5 text-cyan-400" /> Konuma Git
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ CRITICAL ALERTS ═══════════ */}
      <CriticalAlertsWidget />

      {/* ═══════════ KPI CARDS ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          icon={<Flame className="w-5 h-5" />}
          label="Aktif Olaylar"
          value={kpi.activeIncidents}
          subtitle="Toplam kayıtlı vaka"
          href="/yonetim/olaylar"
          iconColor="text-red-400"
        />
        <KPICard
          icon={<Truck className="w-5 h-5" />}
          label="Araç Bakımda"
          value={kpi.vehiclesInMaintenance}
          subtitle="Servis bekleyen araç"
          href="/yonetim/arac-bakim"
          iconColor="text-amber-400"
        />
        <KPICard
          icon={<Droplets className="w-5 h-5" />}
          label="Arızalı Hidrant"
          value={kpi.faultyHydrants}
          subtitle="Bakım/Arıza durumunda"
          href="/yonetim/harita"
          iconColor="text-blue-400"
        />
        <KPICard
          icon={<GraduationCap className="w-5 h-5" />}
          label="Planlı Eğitim"
          value={kpi.upcomingTraining.count}
          subtitle={
            kpi.upcomingTraining.nextTopic
              ? `Sonraki: ${kpi.upcomingTraining.nextTopic}`
              : "Planlanmış eğitim yok"
          }
          href="/yonetim/egitimler"
          iconColor="text-emerald-400"
        />
      </div>

      {/* ═══════════ SHIFT LIST (NÖBETÇİ PERSONEL) ═══════════ */}
      <Card className="border-border overflow-hidden bg-slate-900/10 border-slate-800/60 shadow-xl rounded-2xl">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-slate-800/45 bg-slate-950/20">
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-100">
            <Users className="w-4 h-4 text-cyan-500" />
            <span>{activePostaNumber}. Posta Canlı Nöbetçi Personel Listesi</span>
          </h2>
          <Badge variant="outline" className="text-xs bg-slate-950/40 text-slate-300 border-slate-800">{sortedPersonnel.length} Personel</Badge>
        </div>
        <CardContent className="p-4 sm:p-5">
          <ShiftList personnel={sortedPersonnel} activePosta={activePostaNumber} />
        </CardContent>
      </Card>

      {/* ═══════════ CHART + ACTIVITY FEED ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* ── Trend Chart (2/3 width) ── */}
        <Card className="lg:col-span-2 border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Son 7 Gün Olay Trendi
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toplam <span className="font-semibold text-foreground">{totalWeekIncidents}</span> olay
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {trend > 0 ? (
                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-xs px-2 py-0.5">
                  <TrendingUp className="w-3 h-3 mr-1" />+{trend}
                </Badge>
              ) : trend < 0 ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-xs px-2 py-0.5">
                  <TrendingDown className="w-3 h-3 mr-1" />{trend}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs px-2 py-0.5">Sabit</Badge>
              )}
            </div>
          </div>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#incidentGradient)"
                    dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Activity Feed (1/3 width) ── */}
        <Card className="border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Son Aktiviteler
            </h2>
            <Badge variant="outline" className="text-xs">{activities.length}</Badge>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">Henüz aktivite yok</p>
                  <p className="text-xs">Sisteme veri girildikçe burada listelenecek</p>
                </div>
              ) : (
                activities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-surface/50 transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-surface border shrink-0">
                      {activityIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                      {item.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════ QUICK LINKS ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/yonetim/personel", icon: <Shield className="w-5 h-5" />, label: "Personel", color: "text-indigo-500" },
          { href: "/yonetim/olaylar", icon: <Flame className="w-5 h-5" />, label: "Olaylar", color: "text-red-500" },
          { href: "/yonetim/harita", icon: <Activity className="w-5 h-5" />, label: "CBS Harita", color: "text-blue-500" },
          { href: "/yonetim/hizmetler", icon: <GraduationCap className="w-5 h-5" />, label: "Hizmetler", color: "text-emerald-500" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group border-border hover:border-primary/30 transition-all hover:shadow-md cursor-pointer">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={`${link.color} group-hover:scale-110 transition-transform`}>{link.icon}</div>
                <span className="text-sm font-medium">{link.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Mobil Alt Bar Maskeleme Kalkanı - Spacer */}
      <div 
        className="w-full block pointer-events-none clear-both" 
        style={{ height: 'calc(7rem + env(safe-area-inset-bottom))' }} 
        aria-hidden="true" 
      />
    </div>
  )
}
