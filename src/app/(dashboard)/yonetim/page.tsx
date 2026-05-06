"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
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
} from "lucide-react"
import Link from "next/link"
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
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<KPIData>({
    activeIncidents: 0,
    vehiclesInMaintenance: 0,
    faultyHydrants: 0,
    upcomingTraining: { count: 0, nextDate: null, nextTopic: null },
  })
  const [dailyData, setDailyData] = useState<DailyIncident[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // ── 1. KPI: Active Incidents ──────────────────────────
      const { count: incidentCount } = await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true })

      // ── 2. KPI: Vehicles in Maintenance ───────────────────
      const { count: maintCount } = await supabase
        .from("vehicle_maintenances")
        .select("*", { count: "exact", head: true })
        .in("durum", ["Bekliyor", "Serviste"])

      // ── 3. KPI: Faulty Hydrants ───────────────────────────
      const { count: hydrantCount } = await supabase
        .from("fire_hydrants")
        .select("*", { count: "exact", head: true })
        .in("durum", ["Arızalı", "Bakımda"])

      // ── 4. KPI: Upcoming Trainings ────────────────────────
      const now = new Date().toISOString()
      const { data: trainings, count: trainingCount } = await supabase
        .from("activities_and_trainings")
        .select("faaliyet_konusu,baslangic_tarihi", { count: "exact" })
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

      const { data: recentIncidents } = await supabase
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

      recentIncidents?.forEach((inc) => {
        const dateStr = new Date(inc.created_at).toISOString().split("T")[0]
        const bucket = buckets.find((b) => b.date === dateStr)
        if (bucket) bucket.count++
      })

      setDailyData(buckets)

      // ── 6. Activity Feed (last 5 from each table) ─────────
      const feed: ActivityItem[] = []

      const { data: recentInc } = await supabase
        .from("incidents")
        .select("id,olay_turu,mahalle,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentInc?.forEach((r) =>
        feed.push({
          id: `inc-${r.id}`,
          type: "incident",
          title: `Yeni olay: ${r.olay_turu}`,
          detail: r.mahalle || "Konum belirtilmedi",
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      const { data: recentMaint } = await supabase
        .from("vehicle_maintenances")
        .select("id,plaka,islem_turu,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentMaint?.forEach((r) =>
        feed.push({
          id: `mnt-${r.id}`,
          type: "maintenance",
          title: `${r.plaka} — ${r.islem_turu}`,
          detail: "Araç bakım kaydı oluşturuldu",
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      const { data: recentHyd } = await supabase
        .from("fire_hydrants")
        .select("id,no,durum,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentHyd?.forEach((r) =>
        feed.push({
          id: `hyd-${r.id}`,
          type: "hydrant",
          title: `Hidrant #${r.no || "?"}`,
          detail: `Durum: ${r.durum}`,
          time: formatRelativeTime(r.created_at),
          rawTime: r.created_at,
        })
      )

      const { data: recentTrain } = await supabase
        .from("activities_and_trainings")
        .select("id,faaliyet_turu,faaliyet_konusu,created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      recentTrain?.forEach((r) =>
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

  // ─── Loading State ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Karar Destek Kokpiti yükleniyor…</p>
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
    color,
    href,
  }: {
    icon: React.ReactNode
    label: string
    value: number | string
    subtitle: string
    color: string
    href: string
  }) => (
    <Link href={href}>
      <Card className="group relative overflow-hidden border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color}`} />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            </div>
            <div
              className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}
            >
              {icon}
            </div>
          </div>
          <div className="flex items-center mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-primary font-medium group-hover:underline flex items-center gap-1">
              Detay Görüntüle <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  // ─── Custom Tooltip for Chart ─────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
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
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Karar Destek Kokpiti
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gerçek zamanlı operasyonel durum — Sivas İtfaiye Müdürlüğü
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto px-3 py-1.5 text-xs font-mono border-primary/30 text-primary bg-primary/5">
          <Activity className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
          CANLI
        </Badge>
      </div>

      {/* ═══════════ KPI CARDS ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          icon={<Flame className="w-5 h-5" />}
          label="Aktif Olaylar"
          value={kpi.activeIncidents}
          subtitle="Toplam kayıtlı vaka"
          color="from-red-500 to-rose-600"
          href="/yonetim/olaylar"
        />
        <KPICard
          icon={<Truck className="w-5 h-5" />}
          label="Araç Bakımda"
          value={kpi.vehiclesInMaintenance}
          subtitle="Servis bekleyen araç"
          color="from-orange-500 to-amber-600"
          href="/yonetim/arac-bakim"
        />
        <KPICard
          icon={<Droplets className="w-5 h-5" />}
          label="Arızalı Hidrant"
          value={kpi.faultyHydrants}
          subtitle="Bakım/Arıza durumunda"
          color="from-blue-500 to-cyan-600"
          href="/yonetim/harita"
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
          color="from-emerald-500 to-green-600"
          href="/yonetim/egitimler"
        />
      </div>

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
    </div>
  )
}
