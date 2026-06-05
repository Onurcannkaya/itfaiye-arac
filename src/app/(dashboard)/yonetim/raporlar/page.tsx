"use client"
import { useState, useEffect, useMemo } from "react"
import PageGuard from "@/components/PageGuard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Search, Loader2, Filter, AlertTriangle, CheckCircle2, History, X, ChevronDown, ChevronUp, ListChecks, Package } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

type UnifiedLog = {
  id: string
  tarih: string
  plaka: string
  islem_tipi: string
  sicil: string
  ad_soyad: string
  durum: string
  detaylar: string
}

type GroupedLog = {
  key: string
  tarih: string
  plaka: string
  islem_tipi: string
  ad_soyad: string
  sicil: string
  bolme: string
  durum: 'Kusursuz' | 'Sorunlu'
  items: { malzeme: string; yeni_durum: string; not?: string }[]
}

function parseInventoryDetail(detaylar: string): { bolme: string; malzeme: string; yeni_durum: string; not?: string } | null {
  // Format: "bolme - malzeme (durum) - Not: notlar"
  const match = detaylar.match(/^(.+?)\s*-\s*(.+?)\s*\(([^)]+)\)(.*)$/)
  if (!match) return null
  const notMatch = match[4]?.match(/-\s*Not:\s*(.+)/)
  return {
    bolme: match[1].trim(),
    malzeme: match[2].trim(),
    yeni_durum: match[3].trim(),
    not: notMatch ? notMatch[1].trim() : undefined
  }
}

function groupInventoryLogs(logs: UnifiedLog[]): (UnifiedLog | GroupedLog)[] {
  const result: (UnifiedLog | GroupedLog)[] = []
  const inventoryBuffer: UnifiedLog[] = []
  const otherLogs: UnifiedLog[] = []

  // Separate inventory logs from others
  logs.forEach(log => {
    if (log.islem_tipi === 'Envanter Sayımı') {
      inventoryBuffer.push(log)
    } else {
      otherLogs.push(log)
    }
  })

  // Group inventory logs by (minute, plaka, bolme, sicil)
  const groups = new Map<string, { logs: UnifiedLog[]; parsed: { bolme: string; malzeme: string; yeni_durum: string; not?: string }[] }>()
  
  inventoryBuffer.forEach(log => {
    const parsed = parseInventoryDetail(log.detaylar)
    if (!parsed) {
      otherLogs.push(log) // Can't parse, show as-is
      return
    }
    const minute = log.tarih ? new Date(log.tarih).toISOString().slice(0, 16) : ''
    const key = `${minute}|${log.plaka}|${parsed.bolme}|${log.sicil}`
    
    if (!groups.has(key)) {
      groups.set(key, { logs: [], parsed: [] })
    }
    groups.get(key)!.logs.push(log)
    groups.get(key)!.parsed.push(parsed)
  })

  // Convert groups to GroupedLog entries
  groups.forEach((group, key) => {
    const firstLog = group.logs[0]
    const firstParsed = group.parsed[0]
    const hasIssue = group.parsed.some(p => p.yeni_durum === 'Eksik' || p.yeni_durum === 'Arızalı')

    const grouped: GroupedLog = {
      key,
      tarih: firstLog.tarih,
      plaka: firstLog.plaka,
      islem_tipi: 'Envanter Sayımı',
      ad_soyad: firstLog.ad_soyad,
      sicil: firstLog.sicil,
      bolme: firstParsed.bolme,
      durum: hasIssue ? 'Sorunlu' : 'Kusursuz',
      items: group.parsed.map(p => ({ malzeme: p.malzeme, yeni_durum: p.yeni_durum, not: p.not }))
    }
    result.push(grouped)
  })

  // Add non-inventory logs
  result.push(...otherLogs)

  // Sort by tarih descending
  result.sort((a, b) => {
    const dateA = 'tarih' in a ? new Date(a.tarih).getTime() : 0
    const dateB = 'tarih' in b ? new Date(b.tarih).getTime() : 0
    return dateB - dateA
  })

  return result
}

function isGroupedLog(item: UnifiedLog | GroupedLog): item is GroupedLog {
  return 'items' in item && Array.isArray(item.items)
}

export default function LogsReportsPage() {
  const [logs, setLogs] = useState<UnifiedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days">("7days")
  const [plakaFilter, setPlakaFilter] = useState("")
  const [personnelFilter, setPersonnelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "kusursuz" | "sorunlu">("all")

  // Accordion state
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Fetch logic
  const fetchLogs = async () => {
    setLoading(true)
    setError("")
    try {
      let query = api.from("unified_system_logs").select("*")
      
      // Plaka filter (server-side)
      if (plakaFilter.trim()) {
        query = query.ilike("plaka", `%${plakaFilter.trim()}%`)
      }

      // Personnel filter (server-side - smart detection for name vs sicil)
      if (personnelFilter.trim()) {
        const term = personnelFilter.trim()
        if (/^SB\d+$/i.test(term)) {
          query = query.ilike("sicil", `%${term}%`)
        } else {
          query = query.ilike("ad_soyad", `%${term}%`)
        }
      }

      // Date filter (server-side)
      if (dateFilter === "today") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte("tarih", today.toISOString())
      } else if (dateFilter === "7days") {
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        query = query.gte("tarih", lastWeek.toISOString())
      }

      // Server-Side Limit & Order
      query = query.order("tarih", { ascending: false }).limit(500)

      const { data, error } = await query

      if (error) throw error

      setLogs((data || []) as UnifiedLog[])
    } catch (err: any) {
      console.error("[Logs] Fetch error:", err)
      setError(err.message || "Kayıtlar yüklenirken bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  // Shift Logs state
  const [shiftLogs, setShiftLogs] = useState<any[]>([])
  const [shiftLoading, setShiftLoading] = useState(true)

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return null
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    if (diffMs < 0) return "0 Saat 0 Dakika"
    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours} Saat ${minutes} Dakika`
  }

  const fetchShiftLogs = async () => {
    setShiftLoading(true)
    try {
      let query = api.from("personnel_shifts_log").select("*")

      // Personnel filter
      const term = personnelFilter.trim()
      if (term) {
        if (/^SB\d+$/i.test(term)) {
          const pRes = await api.from("personnel").select("id").ilike("sicil_no", term).limit(1)
          if (pRes.data && pRes.data.length > 0) {
            query = query.eq("personnel_id", pRes.data[0].id)
          } else {
            query = query.eq("personnel_id", "00000000-0000-0000-0000-000000000000")
          }
        } else {
          query = query.ilike("personel_ad_soyad", `%${term}%`)
        }
      }

      // Date filter
      if (dateFilter === "today") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte("giris_tarihi", today.toISOString())
      } else if (dateFilter === "7days") {
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        query = query.gte("giris_tarihi", lastWeek.toISOString())
      }

      query = query.order("giris_tarihi", { ascending: false }).limit(200)

      const { data, error } = await query
      if (error) throw error
      setShiftLogs((data || []) as any[])
    } catch (err: any) {
      console.error("[ShiftLogs] Fetch error:", err)
    } finally {
      setShiftLoading(false)
    }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()

    // Title
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(16)
    doc.text("SIVAS ITFAIYE MUDURLUGU", 14, 20)

    doc.setFont("Helvetica", "normal")
    doc.setFontSize(12)
    doc.text("Personel Gorev Baslangic ve Devir-Teslim Cizelgesi", 14, 28)

    doc.setFontSize(9)
    doc.setTextColor(120)
    const formattedDate = new Date().toLocaleDateString("tr-TR") + " " + new Date().toLocaleTimeString("tr-TR")
    doc.text(`Tarih: ${formattedDate}`, 14, 34)

    const tableColumn = ["TARIH", "PERSONEL ADI SOYADI", "GOREV YERI / POSTA", "GOREVE BASLAMA", "GOREV BITIS", "TOPLAM SURE", "DURUM"]
    
    const replaceTrChars = (str: string) => {
      if (!str) return ""
      const map: Record<string, string> = {
        'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i',
        'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u', 'Ç': 'C', 'ç': 'c'
      }
      return str.replace(/[ŞşĞğİıÖöÜüÇç]/g, ch => map[ch] || ch)
    }

    const tableRows = shiftLogs.map(log => {
      const dateStr = new Date(log.giris_tarihi).toLocaleDateString("tr-TR")
      const nameStr = log.personel_ad_soyad || ""
      const locationStr = `${log.istasyon} / ${log.posta}`
      const startStr = new Date(log.giris_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
      const endStr = log.cikis_tarihi 
        ? new Date(log.cikis_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
        : "-"
      const durationStr = log.durum === 'GÖREVDE' 
        ? "Aktif Calisiyor" 
        : formatDuration(log.giris_tarihi, log.cikis_tarihi) || "-"
      const statusStr = log.durum || ""

      return [
        replaceTrChars(dateStr),
        replaceTrChars(nameStr),
        replaceTrChars(locationStr),
        replaceTrChars(startStr),
        replaceTrChars(endStr),
        replaceTrChars(durationStr),
        replaceTrChars(statusStr)
      ]
    })

    autoTable(doc, {
      head: [tableColumn.map(replaceTrChars)],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      styles: { fontSize: 8 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'GOREVDE') {
            data.cell.styles.textColor = [40, 167, 69]
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [100, 100, 100]
          }
        }
      }
    })

    doc.save(`PDKS_Mesai_Cizelgesi_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const exportData = shiftLogs.map(log => {
      const dateStr = new Date(log.giris_tarihi).toLocaleDateString("tr-TR")
      const startStr = new Date(log.giris_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
      const endStr = log.cikis_tarihi 
        ? new Date(log.cikis_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
        : "-"
      const durationStr = log.durum === 'GÖREVDE' 
        ? "Aktif Çalışıyor" 
        : formatDuration(log.giris_tarihi, log.cikis_tarihi) || "-"

      return {
        "TARİH": dateStr,
        "PERSONEL ADI SOYADI": log.personel_ad_soyad,
        "GÖREV YERİ / POSTA": `${log.istasyon} / ${log.posta}`,
        "GÖREVE BAŞLAMA": startStr,
        "GÖREV BİTİŞ": endStr,
        "TOPLAM SÜRE": durationStr,
        "DURUM": log.durum
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    
    worksheet['!cols'] = [
      { wch: 12 }, // Tarih
      { wch: 25 }, // Personel Adı Soyadı
      { wch: 35 }, // Görev Yeri / Posta
      { wch: 18 }, // Göreve Başlama
      { wch: 18 }, // Görev Bitiş
      { wch: 20 }, // Toplam Süre
      { wch: 15 }  // Durum
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, "PDKS Devam Çizelgesi")
    XLSX.writeFile(workbook, `PDKS_Mesai_Cizelgesi_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Initial load & filter trigger
  useEffect(() => {
    fetchLogs()
    fetchShiftLogs()
  }, [dateFilter]) // Auto-fetch on date toggle

  // Handle manual search trigger for text inputs
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    fetchLogs()
    fetchShiftLogs()
  }

  const clearFilters = () => {
    setDateFilter("all")
    setPlakaFilter("")
    setPersonnelFilter("")
    setStatusFilter("all")
    setTimeout(() => {
      fetchLogs()
      fetchShiftLogs()
    }, 0)
  }

  // Group and filter logs
  const displayItems = useMemo(() => {
    const grouped = groupInventoryLogs(logs)
    
    if (statusFilter === "all") return grouped
    
    return grouped.filter(item => {
      const durum = isGroupedLog(item) ? item.durum : item.durum
      if (statusFilter === "sorunlu") return durum === "Sorunlu"
      if (statusFilter === "kusursuz") return durum === "Kusursuz"
      return true
    })
  }, [logs, statusFilter])

  // Stats
  const totalCount = displayItems.length
  const issueCount = displayItems.filter(item => (isGroupedLog(item) ? item.durum : item.durum) === "Sorunlu").length
  const perfectCount = totalCount - issueCount

  return (
    <PageGuard pageId="raporlar">
      <div className="min-h-screen flex flex-col overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-6">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sistem Logları ve Raporlar</h1>
        <p className="text-muted-foreground mt-1 text-sm">Tüm araç kontrolleri ve envanter sayımlarının birleştirilmiş görünümü.</p>
      </div>

      {/* FILTERS */}
      <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Araç Plakası</label>
              <Input 
                placeholder="Örn: 58 ACT 367" 
                value={plakaFilter}
                onChange={e => setPlakaFilter(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personel (Ad veya Sicil)</label>
              <Input 
                placeholder="Örn: Onurcan veya SB5801" 
                value={personnelFilter}
                onChange={e => setPersonnelFilter(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarih Aralığı</label>
              <select 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="today">Bugün</option>
                <option value="7days">Son 7 Gün</option>
                <option value="all">Tüm Zamanlar</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pt-2 sm:pt-0">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[100px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Ara</>}
              </Button>
              {(plakaFilter || personnelFilter || dateFilter !== "7days" || statusFilter !== "all") && (
                <Button type="button" variant="outline" onClick={clearFilters} title="Filtreleri Temizle" className="px-3">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Quick Status Filter Toggles */}
          <div className="pt-4 border-t border-border/50 flex flex-wrap gap-3">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border",
                statusFilter === "all"
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-md shadow-cyan-500/10"
                  : "bg-surface text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <ListChecks className="w-4 h-4" />
              Tümü ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("kusursuz")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border",
                statusFilter === "kusursuz"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-500/10"
                  : "bg-surface text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              Kusursuz Sayımlar ({perfectCount})
            </button>
            <button
              onClick={() => setStatusFilter("sorunlu")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border",
                statusFilter === "sorunlu"
                  ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-md shadow-red-500/10"
                  : "bg-surface text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              ⚠️ Eksik/Hasarlı ({issueCount})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* DATA GRID */}
      <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Kontrol Geçmişi
            </CardTitle>
            <CardDescription className="mt-1">
              {displayItems.length} kayıt gösteriliyor (gruplandırılmış)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-danger">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>{error}</p>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary/50" />
              <p>Veriler yükleniyor...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Bu filtrelere uygun kayıt bulunamadı.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {displayItems.map((item, idx) => {
                if (isGroupedLog(item)) {
                  // Grouped inventory accordion row
                  const isOpen = expandedKeys.has(item.key)
                  return (
                    <div key={item.key} className="group">
                      <button
                        onClick={() => toggleExpand(item.key)}
                        className="w-full text-left px-4 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                      >
                        {/* Date */}
                        <div className="shrink-0 w-[90px]">
                          <div className="font-medium text-sm">{new Date(item.tarih).toLocaleDateString("tr-TR")}</div>
                          <div className="text-xs text-muted-foreground">{new Date(item.tarih).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        {/* Plaka */}
                        <div className="shrink-0 w-[100px] font-bold text-primary text-sm">
                          {item.plaka}
                        </div>

                        {/* Personnel Name (NOT sicil) */}
                        <div className="shrink-0 w-[130px]">
                          <div className="font-semibold text-sm text-slate-200 truncate">{item.ad_soyad}</div>
                        </div>

                        {/* Summary */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-slate-300 font-medium truncate">
                              {item.bolme}
                            </span>
                            <span className="text-muted-foreground">—</span>
                            <span className="text-slate-400 text-xs">
                              Toplam {item.items.length} Kalem Malzeme Sayımı
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="shrink-0">
                          {item.durum === "Sorunlu" ? (
                            <Badge className="gap-1 px-2 py-0.5 bg-red-950/30 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.05)]">
                              <AlertTriangle className="w-3 h-3" /> Sorunlu
                            </Badge>
                          ) : (
                            <Badge className="gap-1 px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                              <CheckCircle2 className="w-3 h-3" /> Kusursuz
                            </Badge>
                          )}
                        </div>

                        {/* Chevron */}
                        <div className="shrink-0 text-muted-foreground">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Accordion Detail Panel */}
                      {isOpen && (
                        <div className="px-6 sm:px-10 pb-4 animate-in slide-in-from-top-1 duration-150">
                          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-1.5">
                            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
                              Sayılan Malzemeler — {item.bolme}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {item.items.map((it, i) => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border",
                                    it.yeni_durum === 'Eksik' || it.yeni_durum === 'Arızalı'
                                      ? "bg-red-950/20 border-red-500/20 text-red-400"
                                      : "bg-slate-950/40 border-white/5 text-slate-300"
                                  )}
                                >
                                  <span className="font-semibold truncate flex-1">{it.malzeme}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 shrink-0 font-bold",
                                      it.yeni_durum === 'Tam' ? "text-emerald-400 border-emerald-500/25" :
                                      it.yeni_durum === 'Eksik' ? "text-red-400 border-red-500/25" :
                                      it.yeni_durum === 'Arızalı' ? "text-amber-400 border-amber-500/25" :
                                      "text-slate-400 border-slate-500/25"
                                    )}
                                  >
                                    {it.yeni_durum}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            {item.items.some(it => it.not) && (
                              <div className="mt-2 pt-2 border-t border-white/5">
                                {item.items.filter(it => it.not).map((it, i) => (
                                  <p key={i} className="text-[10px] text-amber-400/80 italic">
                                    {it.malzeme}: {it.not}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                // Regular non-grouped log row
                return (
                  <div key={item.id || idx} className="px-4 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                    {/* Date */}
                    <div className="shrink-0 w-[90px]">
                      <div className="font-medium text-sm">{new Date(item.tarih).toLocaleDateString("tr-TR")}</div>
                      <div className="text-xs text-muted-foreground">{new Date(item.tarih).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>

                    {/* Plaka */}
                    <div className="shrink-0 w-[100px] font-bold text-primary text-sm">
                      {item.plaka}
                    </div>

                    {/* Personnel Name */}
                    <div className="shrink-0 w-[130px]">
                      <div className="font-semibold text-sm text-slate-200 truncate">{item.ad_soyad}</div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-muted-foreground truncate">
                        <span className="text-slate-400 font-medium">{item.islem_tipi}</span>
                        {item.detaylar && <span className="ml-2 text-slate-500">— {item.detaylar}</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {item.durum === "Sorunlu" ? (
                        <Badge className="gap-1 px-2 py-0.5 bg-red-950/30 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.05)]">
                          <AlertTriangle className="w-3 h-3" /> Sorunlu
                        </Badge>
                      ) : (
                        <Badge className="gap-1 px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                          <CheckCircle2 className="w-3 h-3" /> Kusursuz
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDKS SHIFT LOGS TABLE */}
      <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Personel Görev Başlangıç ve Devir-Teslim Çizelgesi
            </CardTitle>
            <CardDescription className="mt-1">
              Personel mesai giriş-çıkış logları ve aktif çalışma süreleri.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF} 
              className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-xs font-semibold gap-1.5"
            >
              <span>📄</span> PDF İndir
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportExcel} 
              className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-xs font-semibold gap-1.5"
            >
              <span>📊</span> Excel İndir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {shiftLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500/50" />
              <p>Devam çizelgesi yükleniyor...</p>
            </div>
          ) : shiftLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Görev kaydı bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 border-b border-border/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Personel Adı Soyadı</th>
                    <th className="px-6 py-4">Görev Yeri / Posta</th>
                    <th className="px-6 py-4">Göreve Başlama</th>
                    <th className="px-6 py-4">Görev Bitiş</th>
                    <th className="px-6 py-4">Toplam Süre</th>
                    <th className="px-6 py-4">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {shiftLogs.map((log) => {
                    const dateStr = new Date(log.giris_tarihi).toLocaleDateString("tr-TR")
                    const startStr = new Date(log.giris_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
                    const endStr = log.cikis_tarihi 
                      ? new Date(log.cikis_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
                      : "-"
                    
                    const duration = log.durum === 'GÖREVDE' 
                      ? (
                        <span className="text-emerald-400 font-bold animate-pulse drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                          Aktif Çalışıyor
                        </span>
                      )
                      : formatDuration(log.giris_tarihi, log.cikis_tarihi) || "-"

                    return (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-medium">{dateStr}</td>
                        <td className="px-6 py-4 font-semibold text-slate-200">{log.personel_ad_soyad}</td>
                        <td className="px-6 py-4 text-slate-400">{log.istasyon} / {log.posta}</td>
                        <td className="px-6 py-4 text-slate-300 font-mono">{startStr}</td>
                        <td className="px-6 py-4 text-slate-300 font-mono">{endStr}</td>
                        <td className="px-6 py-4">{duration}</td>
                        <td className="px-6 py-4">
                          {log.durum === 'GÖREVDE' ? (
                            <Badge className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                              Görevde
                            </Badge>
                          ) : (
                            <Badge className="px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800">
                              Tamamlandı
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobil Alt Bar Maskeleme Kalkanı - Spacer */}
      <div 
        className="w-full block md:hidden pointer-events-none clear-both" 
        style={{ height: 'calc(7rem + env(safe-area-inset-bottom))' }} 
        aria-hidden="true" 
      />
    </div>
    </PageGuard>
  )
}
