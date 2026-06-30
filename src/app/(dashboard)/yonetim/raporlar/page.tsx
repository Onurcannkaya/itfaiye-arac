"use client"
import { useState, useEffect, useMemo } from "react"
import PageGuard from "@/components/PageGuard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Search, Loader2, Filter, AlertTriangle, CheckCircle2, History, X, ChevronDown, ChevronUp, ListChecks, Package, HelpCircle, Flame, ShieldAlert, GraduationCap, Truck, Clock } from "lucide-react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/authStore"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

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

function InfoTooltip({ content }: { content: string }) {
  return (
    <div className="relative group inline-block ml-1.5 align-middle">
      <HelpCircle className="w-4 h-4 text-[var(--fd-text3)] hover:text-[var(--fd-accent)] cursor-help transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus:block bg-[var(--fd-surface)] text-[var(--fd-text2)] text-xs rounded-[var(--fd-r-sm)] p-2.5 w-64 border border-[var(--fd-border)] shadow-[var(--fd-shadow-lg)] z-50 transition-all text-center leading-normal font-sans font-medium whitespace-normal">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[var(--fd-surface)]" />
      </div>
    </div>
  )
}

export default function LogsReportsPage() {
  const { user } = useAuthStore()

  // Z Raporu (Gün Sonu) States
  const [dailyReports, setDailyReports] = useState<any[]>([])
  const [dailyReportsLoading, setDailyReportsLoading] = useState(false)
  const [zReportModalOpen, setZReportModalOpen] = useState(false)
  const [selectedZDate, setSelectedZDate] = useState(new Date().toISOString().split('T')[0])
  const [zFires, setZFires] = useState({ total: 0, ev: 0, isyeri: 0, arazi: 0, diger: 0 })
  const [zRescues, setZRescues] = useState({ total: 0, trafik_kazasi: 0, su_baskini: 0, hayvan_kurtarma: 0, diger: 0 })
  const [zAssignmentsCount, setZAssignmentsCount] = useState(0)
  const [zBrokenVehicles, setZBrokenVehicles] = useState<string[]>([])
  const [zBascavusNotu, setZBascavusNotu] = useState("")
  const [zDisGorevCount, setZDisGorevCount] = useState(0)
  const [zSubmitting, setZSubmitting] = useState(false)
  const [overrideData, setOverrideData] = useState<{
    assignments: any[];
    maintenance: any[];
  } | null>(null)
  const [isOverrideApproved, setIsOverrideApproved] = useState(false)
  const [personnelMap, setPersonnelMap] = useState<Record<string, string>>({})
  const [personnelListForZ, setPersonnelListForZ] = useState<any[]>([])

  const currentUserFromDb = useMemo(() => {
    if (!user || !personnelListForZ.length) return null
    return personnelListForZ.find(p => p.sicil_no === user.sicilNo)
  }, [user, personnelListForZ])

  // Roles verification for Z-Report creation
  const isAuthorizedForZReport = useMemo(() => {
    if (!user) return false
    const role = user.rol || ""
    const unvan = user.unvan || ""
    return role === "Admin" || role === "Editor" || role === "Shift_Leader" || 
      ["Müdür", "Amir", "Başçavuş", "Çavuş"].includes(unvan)
  }, [user])

  const fetchDailyReports = async () => {
    setDailyReportsLoading(true)
    try {
      const { data, error } = await api.from('daily_summary_reports').select('*').order('rapor_tarihi', { ascending: false })
      if (error) throw error
      setDailyReports(data || [])
    } catch (err) {
      console.error("Z Raporları yükleme hatası:", err)
    } finally {
      setDailyReportsLoading(false)
    }
  }

  const loadPersonnelMap = async () => {
    try {
      const { data } = await api.from('personnel').select('id,ad,soyad,unvan,sicil_no')
      if (data) {
        setPersonnelListForZ(data)
        const map: Record<string, string> = {}
        data.forEach((p: any) => {
          map[p.id] = `${p.ad} ${p.soyad} (${p.unvan})`
        })
        setPersonnelMap(map)
      }
    } catch (err) {
      console.error("Personel haritası yükleme hatası:", err)
    }
  }

  const handleZDateChange = async (dateStr: string) => {
    setSelectedZDate(dateStr)
    setOverrideData(null)
    setIsOverrideApproved(false)
    try {
      // 1. Fetch incidents
      const { data: incidents } = await api.from('incidents').select('olay_turu,created_at,ihbar_saati')
      const filteredInc = (incidents || []).filter((inc: any) => {
        const date = new Date(inc.created_at || inc.ihbar_saati || Date.now()).toISOString().split('T')[0]
        return date === dateStr
      })
      
      const fires = { total: 0, ev: 0, isyeri: 0, arazi: 0, diger: 0 }
      const rescues = { total: 0, trafik_kazasi: 0, su_baskini: 0, hayvan_kurtarma: 0, diger: 0 }
      
      filteredInc.forEach((inc: any) => {
        const type = (inc.olay_turu || "").toLowerCase()
        if (type.includes("yangın") || type.includes("yangin")) {
          fires.total++
          if (type.includes("ev")) fires.ev++
          else if (type.includes("işyeri") || type.includes("isyeri") || type.includes("fabrika")) fires.isyeri++
          else if (type.includes("ot") || type.includes("anız") || type.includes("arazi") || type.includes("çöp") || type.includes("cop")) fires.arazi++
          else fires.diger++
        } else {
          rescues.total++
          if (type.includes("kaza") || type.includes("trafik")) rescues.trafik_kazasi++
          else if (type.includes("su") || type.includes("baskın") || type.includes("baskin")) rescues.su_baskini++
          else if (type.includes("hayvan")) rescues.hayvan_kurtarma++
          else rescues.diger++
        }
      })
      setZFires(fires)
      setZRescues(rescues)

      // 2. Fetch temporary assignments
      const { data: assignments } = await api.from('temporary_assignments').select('created_at,teslim_tarihi')
      const filteredAssign = (assignments || []).filter((item: any) => {
        const date = new Date(item.created_at || item.teslim_tarihi || Date.now()).toISOString().split('T')[0]
        return date === dateStr
      })
      setZAssignmentsCount(filteredAssign.length)
      setZDisGorevCount(filteredAssign.length)

      // 3. Fetch vehicles in maintenance
      const { data: vehiclesData } = await api.from('vehicles').select('plaka,status,durum')
      const broken = (vehiclesData || []).filter((v: any) => {
        return v.status === 'maintenance' || 
               (v.durum && (
                 v.durum.toLowerCase().includes('bakım') || 
                 v.durum.toLowerCase().includes('arıza') || 
                 v.durum.toLowerCase().includes('servis') ||
                 v.durum.toLowerCase().includes('maintenance')
               ))
      }).map((v: any) => v.plaka)
      setZBrokenVehicles(broken)

    } catch (err) {
      console.error("Z Raporu verisi hesaplanırken hata:", err)
    }
  }

  const handleSubmitZReport = async (force: boolean = false) => {
    if (!user) {
      alert("Oturum açık değil.")
      return
    }
    if (!currentUserFromDb) {
      alert("Kullanıcı veritabanında bulunamadı veya henüz yüklenmedi.")
      return
    }
    setZSubmitting(true)
    try {
      const zData = {
        rapor_tarihi: selectedZDate,
        devreden_amir_id: currentUserFromDb.id,
        yangin_sayisi: zFires,
        kurtarma_sayisi: zRescues,
        dis_gorev_sayisi: zDisGorevCount,
        arizali_araclar: zBrokenVehicles,
        bascavus_notu: zBascavusNotu,
        onay_durumu: true,
        force_override: force
      }
      
      const res = await api.insert('daily_summary_reports', zData)
      if (res.error) {
        if (res.error === 'LOGISTICS_LOCKED' || (res.message && res.message.includes('LOGISTICS_LOCKED')) || res.assignments || res.maintenance) {
          setOverrideData({
            assignments: res.assignments || [],
            maintenance: res.maintenance || []
          });
          setZSubmitting(false);
          return;
        }
        throw new Error(res.error || res.message)
      }
      
      alert(force ? "Z Raporu ŞERHLİ olarak başarıyla mühürlendi ve arşive kaydedildi!" : "Z Raporu başarıyla mühürlendi ve arşive kaydedildi!")
      setZReportModalOpen(false)
      setOverrideData(null)
      setIsOverrideApproved(false)
      setZBascavusNotu("")
      fetchDailyReports()
    } catch (err: any) {
      console.error(err)
      alert("Rapor kaydedilirken hata oluştu: " + err.message)
    } finally {
      setZSubmitting(false)
    }
  }

  // jsPDF Custom Matbu Shift Handover Report Generator
  const handleExportZReportPDF = async (report: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210
    const pageH = 297
    const mL = 12  // margin left
    const mR = 12  // margin right
    const contentW = pageW - mL - mR
    const colDivX = mL + contentW * 0.48 // left column ~48%
    const rColX = colDivX + 3  // right column start

    const tr = (str: string) => {
      if (!str) return ""
      const map: Record<string, string> = {
        'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i',
        'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u', 'Ç': 'C', 'ç': 'c'
      }
      return str.replace(/[ŞşĞğİıÖöÜüÇç]/g, ch => map[ch] || ch)
    }

    const dateStr = new Date(report.rapor_tarihi).toLocaleDateString("tr-TR")
    const amirName = personnelMap[report.devreden_amir_id] || "Bilinmeyen Amir"

    // ═══════════════════════════════════════════════
    // SAYFA ÇERÇEVESİ (Dış border)
    // ═══════════════════════════════════════════════
    doc.setDrawColor(30)
    doc.setLineWidth(0.8)
    doc.rect(mL - 2, 6, contentW + 4, pageH - 14)

    // ═══════════════════════════════════════════════
    // ANTET BAŞLIĞI
    // ═══════════════════════════════════════════════
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(15)
    doc.setTextColor(0)
    doc.text("T.C.  S I V A S  B E L E D I Y E  B A S K A N L I G I", pageW / 2, 16, { align: "center" })
    doc.setFontSize(12)
    doc.text("ITFAIYE MUDURLUGU GUNLUK NOBET VE VUKUAT DEFTERI", pageW / 2, 23, { align: "center" })

    // Antet altı çizgi (çift çizgi)
    doc.setLineWidth(0.6)
    doc.line(mL, 26, pageW - mR, 26)
    doc.setLineWidth(0.2)
    doc.line(mL, 27.2, pageW - mR, 27.2)

    // ═══════════════════════════════════════════════
    // META BİLGİ SATIRI
    // ═══════════════════════════════════════════════
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Rapor Tarihi: ${dateStr}`, mL + 2, 33)
    doc.text(`Devreden Amir: ${tr(amirName)}`, mL + 2, 38)
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9)
    doc.text(`Sayfa No: SVS-Z-${report.id.substring(0, 8).toUpperCase()}`, pageW - mR - 2, 33, { align: "right" })

    // Meta altı çizgi
    doc.setLineWidth(0.4)
    doc.setDrawColor(60)
    doc.line(mL, 41, pageW - mR, 41)

    // ═══════════════════════════════════════════════
    // SÜTUN BÖLME ÇİZGİSİ
    // ═══════════════════════════════════════════════
    const colTopY = 41
    const colBotY = 225
    doc.setDrawColor(80)
    doc.setLineWidth(0.3)
    doc.line(colDivX, colTopY, colDivX, colBotY)

    // ═══════════════════════════════════════════════
    // SOL SÜTUN: POSTA MEVCUDU VE NÖBET ÇİZELGESİ
    // ═══════════════════════════════════════════════
    const lColMaxW = colDivX - mL - 4

    doc.setFont("Helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text("POSTA MEVCUDU VE NOBET CIZELGESI", mL + 2, 48)

    // Bölüm başlığı altı ince çizgi
    doc.setDrawColor(120)
    doc.setLineWidth(0.2)
    doc.line(mL + 2, 49.5, colDivX - 2, 49.5)

    // Shift log verisi çek
    let shiftLogsData: any[] = []
    let rotasData: any[] = []
    try {
      const { data: shifts } = await api.from('personnel_shifts_log').select('*')
      shiftLogsData = (shifts || []).filter((s: any) => {
        const sDate = new Date(s.giris_tarihi).toISOString().split('T')[0]
        return sDate === report.rapor_tarihi
      })
      const { data: rotas } = await api.from('hourly_shifts').select('*').eq('tarih', report.rapor_tarihi)
      rotasData = rotas || []
    } catch (e) {
      console.error("PDF data fetch error:", e)
    }

    let leftY = 55

    // --- Nöbetçi Personel Listesi ---
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("Nobetci Personel Listesi (PDKS):", mL + 3, leftY)
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(8.5)
    leftY += 5.5

    if (shiftLogsData.length === 0) {
      doc.setTextColor(100)
      doc.text("Bu tarihte aktif nobetci kaydi bulunmuyor.", mL + 5, leftY)
      doc.setTextColor(0)
      leftY += 5.5
    } else {
      shiftLogsData.slice(0, 18).forEach((s: any) => {
        if (leftY < 155) {
          const checkInTime = new Date(s.giris_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
          const txt = tr(`${checkInTime} | ${s.personel_ad_soyad} (${s.posta}. Posta)`)
          doc.setFont("Helvetica", "bold")
          doc.text("\u2022", mL + 4, leftY)
          doc.setFont("Helvetica", "normal")
          doc.text(txt, mL + 8, leftY)
          leftY += 4.5
        }
      })
    }

    leftY += 3

    // --- Saatlik Nöbet Yeri Çizelgesi ---
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("Saatlik Nobet Yeri Cizelgesi:", mL + 3, leftY)
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(8.5)
    leftY += 5.5

    if (rotasData.length === 0) {
      doc.setTextColor(100)
      doc.text("Saatlik nobet yerlesim kaydi bulunmuyor.", mL + 5, leftY)
      doc.setTextColor(0)
      leftY += 5.5
    } else {
      const groupedRotas: Record<string, string[]> = {}
      rotasData.forEach((r: any) => {
        if (!groupedRotas[r.gorev_yeri]) groupedRotas[r.gorev_yeri] = []
        groupedRotas[r.gorev_yeri].push(`${r.saat_araligi}: ${r.personel_sicil}`)
      })

      Object.entries(groupedRotas).slice(0, 5).forEach(([yeri, list]) => {
        if (leftY < 170) {
          doc.setFont("Helvetica", "bold")
          doc.setFontSize(8.5)
          doc.text(`- ${tr(yeri.toUpperCase())}:`, mL + 5, leftY)
          doc.setFont("Helvetica", "normal")
          leftY += 4.5
          list.slice(0, 5).forEach((txt: string) => {
            if (leftY < 170) {
              doc.text(`    ${tr(txt)}`, mL + 7, leftY)
              leftY += 4
            }
          })
          leftY += 1
        }
      })
    }

    // --- Posta Genel Mevcudu Raporu Kutusu ---
    const boxY = Math.max(leftY + 5, 175)
    const boxH = 30
    doc.setDrawColor(40)
    doc.setLineWidth(0.5)
    doc.rect(mL + 1, boxY, lColMaxW + 2, boxH)

    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("POSTA GENEL MEVCUDU RAPORU", mL + 4, boxY + 6)

    doc.setDrawColor(150)
    doc.setLineWidth(0.15)
    doc.line(mL + 4, boxY + 7.5, mL + lColMaxW - 2, boxY + 7.5)

    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Hazir Mevcut (Postadaki Personel): ${shiftLogsData.length} personel`, mL + 4, boxY + 13)
    doc.text(`Dis Gorev / Zimmet Sayisi: ${report.dis_gorev_sayisi} gorev`, mL + 4, boxY + 19)
    doc.setFont("Helvetica", "bold")
    doc.text(`Toplam Yekun: ${shiftLogsData.length + report.dis_gorev_sayisi} personel`, mL + 4, boxY + 25)
    doc.setFont("Helvetica", "normal")

    // ═══════════════════════════════════════════════
    // SAĞ SÜTUN: VUKUAT VE FAALİYET LİSTESİ
    // ═══════════════════════════════════════════════
    const rColMaxW = pageW - mR - rColX - 2

    doc.setFont("Helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text("VUKUAT VE FAALIYET LISTESI (SON 24 SAAT)", rColX, 48)

    doc.setDrawColor(120)
    doc.setLineWidth(0.2)
    doc.line(rColX, 49.5, pageW - mR - 2, 49.5)

    let rightY = 55

    // --- Vukuat Olay Özeti ---
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("Vukuat Olay Ozetleri:", rColX + 1, rightY)
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9)
    rightY += 6

    // Yangın satırı
    doc.setFont("Helvetica", "bold")
    doc.text("Yangin:", rColX + 3, rightY)
    doc.setFont("Helvetica", "normal")
    const yTotal = report.yangin_sayisi?.total || 0
    doc.text(`${yTotal} adet  (Ev: ${report.yangin_sayisi?.ev || 0}, Isyeri: ${report.yangin_sayisi?.isyeri || 0}, Arazi: ${report.yangin_sayisi?.arazi || 0}, Diger: ${report.yangin_sayisi?.diger || 0})`, rColX + 19, rightY)
    rightY += 5.5

    // Kurtarma satırı
    doc.setFont("Helvetica", "bold")
    doc.text("Kurtarma:", rColX + 3, rightY)
    doc.setFont("Helvetica", "normal")
    const kTotal = report.kurtarma_sayisi?.total || 0
    doc.text(`${kTotal} adet  (Kaza: ${report.kurtarma_sayisi?.trafik_kazasi || 0}, Su: ${report.kurtarma_sayisi?.su_baskini || 0}, Hayvan: ${report.kurtarma_sayisi?.hayvan_kurtarma || 0}, Diger: ${report.kurtarma_sayisi?.diger || 0})`, rColX + 24, rightY)
    rightY += 7

    // --- Arızalı Araçlar ---
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("Arizali / Bakimdaki Taktik Araclar:", rColX + 1, rightY)
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9)
    rightY += 5.5

    if (!report.arizali_araclar || report.arizali_araclar.length === 0) {
      doc.setTextColor(100)
      doc.text("Aktif arizali/bakimda olan taktik arac bulunmamaktadir.", rColX + 3, rightY)
      doc.setTextColor(0)
    } else {
      const aracText = doc.splitTextToSize(`Araclar: ${report.arizali_araclar.join(', ')}`, rColMaxW - 4)
      doc.text(aracText, rColX + 3, rightY)
    }
    rightY += 7

    // --- Faaliyet Kayıtları Detaylı Listesi ---
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("Faaliyet Kayitlari Detayli Listesi:", rColX + 1, rightY)
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(8.5)
    rightY += 5.5

    let incidentsData: any[] = []
    try {
      const { data: incs } = await api.from('incidents').select('*')
      incidentsData = (incs || []).filter((inc: any) => {
        const incDate = new Date(inc.created_at || inc.ihbar_saati || Date.now()).toISOString().split('T')[0]
        return incDate === report.rapor_tarihi
      })
    } catch (e) {
      console.error("PDF incidents fetch error:", e)
    }

    if (incidentsData.length === 0) {
      doc.setTextColor(100)
      doc.text("Bu tarihte herhangi bir vukuat kaydi bulunmamaktadir.", rColX + 3, rightY)
      doc.setTextColor(0)
      rightY += 6
    } else {
      incidentsData.slice(0, 12).forEach((inc: any, idx: number) => {
        if (rightY < 170) {
          const time = new Date(inc.ihbar_saati || inc.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
          const line = tr(`${idx + 1}) [${time}] ${inc.olay_turu || 'Belirsiz'} - ${inc.mahalle || ''} Mah.`)
          doc.text(line, rColX + 3, rightY)
          rightY += 4.5
        }
      })
      rightY += 2
    }

    // --- Başçavuş / Nöbetçi Amir Notu ---
    const noteY = Math.max(rightY + 3, 170)
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9.5)
    doc.text("Bascavus / Nobetci Amir Notu:", rColX + 1, noteY)
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9)

    const notText = report.bascavus_notu || "Herhangi bir devir notu eklenmemistir."
    const splitNot = doc.splitTextToSize(tr(notText), rColMaxW - 4)
    doc.text(splitNot, rColX + 3, noteY + 5.5)

    if (report.serh_notu) {
      const serhY = noteY + 5.5 + splitNot.length * 4.5 + 4
      doc.setFont("Helvetica", "bold")
      doc.setFontSize(9.5)
      doc.setTextColor(180, 83, 9)
      doc.text("Resmi Devir Serh ve Lojistik Notlari:", rColX + 1, serhY)
      doc.setFont("Helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(0)
      const splitSerh = doc.splitTextToSize(tr(report.serh_notu), rColMaxW - 4)
      doc.text(splitSerh, rColX + 3, serhY + 5.5)
    }

    // ═══════════════════════════════════════════════
    // ALT BÖLME ÇİZGİSİ
    // ═══════════════════════════════════════════════
    doc.setDrawColor(30)
    doc.setLineWidth(0.6)
    doc.line(mL, colBotY, pageW - mR, colBotY)

    // ═══════════════════════════════════════════════
    // İMZA BLOKLARI
    // ═══════════════════════════════════════════════
    const sigTopY = colBotY + 6
    const sigLineY = sigTopY + 22
    const sigCenters = [
      mL + contentW * 0.17,   // Nöbetçi Çavuş
      pageW / 2,               // Nöbetçi Amir
      pageW - mR - contentW * 0.17  // İtfaiye Müdürü
    ]
    const sigLabels = ["Nobetci Cavus", "Nobetci Amir", "Itfaiye Muduru"]
    const sigSubs = ["Imza / Sicil / Unvan", "Imza / Sicil / Unvan", "Imza / Onay / Tarih"]

    doc.setFont("Helvetica", "bold")
    doc.setFontSize(10)
    sigLabels.forEach((label, i) => {
      doc.text(label, sigCenters[i], sigTopY, { align: "center" })
    })

    doc.setFont("Helvetica", "normal")
    doc.setFontSize(8)
    sigSubs.forEach((sub, i) => {
      doc.text(sub, sigCenters[i], sigTopY + 5, { align: "center" })
    })

    // İmza çizgileri (kesik çizgi)
    doc.setDrawColor(140)
    doc.setLineWidth(0.3)
    doc.setLineDashPattern([1.5, 1], 0)
    sigCenters.forEach((cx) => {
      doc.line(cx - 22, sigLineY, cx + 22, sigLineY)
    })
    doc.setLineDashPattern([], 0)

    // ═══════════════════════════════════════════════
    // DİJİTAL DOĞRULAMA KODU (FOOTER)
    // ═══════════════════════════════════════════════
    doc.setDrawColor(30)
    doc.setLineWidth(0.2)
    doc.line(mL, pageH - 18, pageW - mR, pageH - 18)

    doc.setFont("Helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.text(`Dijital Dogrulama Kodu: SVS-Z-${report.id.substring(0, 8).toUpperCase()}`, pageW - mR - 2, pageH - 13, { align: "right" })
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text("Bu belge Sivas Belediyesi Itfaiye Mudurlugu dijital arsiv sistemi tarafindan uretilmistir.", mL + 2, pageH - 13)
    doc.setTextColor(0)

    doc.save(`Itfaiye_Z_Raporu_${report.rapor_tarihi}.pdf`)
  }

  const [logs, setLogs] = useState<UnifiedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Stats Dashboard States
  const [statsData, setStatsData] = useState<{
    total_trainings: number
    total_training_hours: number
    total_people_reached: number
    fires_count: number
    rescue_operations_count: number
    active_personnel_count: number
    avg_response_time: number
  } | null>(null)

  const [chartsData, setChartsData] = useState<{
    lineChartData: { name: string; Yangın: number; Kurtarma: number }[]
    neighborhoodsData: { name: string; value: number; yangin: number; kurtarma: number }[]
  } | null>(null)

  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/reports/stats")
      const data = await res.json()
      if (data.success) {
        setStatsData(data.stats)
        setChartsData(data.charts)
      }
    } catch (err) {
      console.error("Error fetching stats:", err)
    } finally {
      setStatsLoading(false)
    }
  }

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
    fetchStats()
    fetchDailyReports()
    loadPersonnelMap()
  }, [dateFilter]) // Auto-fetch on date toggle

  // Handle manual search trigger for text inputs
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    fetchLogs()
    fetchShiftLogs()
    fetchStats()
  }

  const clearFilters = () => {
    setDateFilter("all")
    setPlakaFilter("")
    setPersonnelFilter("")
    setStatusFilter("all")
    setTimeout(() => {
      fetchLogs()
      fetchShiftLogs()
      fetchStats()
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
      <div className="space-y-6 w-full max-w-full px-1.5 md:px-3 pb-12 animate-in fade-in duration-300">
      <div className="border-b border-[var(--fd-border)] pb-4">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--fd-text)]">Sistem Logları ve Raporlar</h1>
        <p className="text-[var(--fd-text3)] mt-1 text-xs">Tüm araç kontrolleri ve envanter sayımlarının birleştirilmiş görünümü.</p>
      </div>

      {/* Dynamic Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[var(--fd-surface2)]/40 border border-[var(--fd-border)] rounded-[var(--fd-r)] animate-pulse"></div>
          ))}
        </div>
      ) : statsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Toplam Eğitim */}
          <div className="bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] p-4 shadow-[var(--fd-shadow-sm)] flex flex-col justify-between hover:border-[var(--fd-info)]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--fd-info)] uppercase tracking-[.04em] flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Toplam Eğitim
              </span>
              <span className="text-[var(--fd-info)] bg-[var(--fd-info)]/10 px-2 py-0.5 rounded-full text-[10px] font-bold">Faaliyet</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--fd-info)] font-[var(--fd-fontmono)]">{statsData.total_trainings}</span>
              <span className="text-[var(--fd-text3)] text-xs ml-1.5 font-medium">Kayıt</span>
            </div>
            <p className="text-[10px] text-[var(--fd-text3)] font-semibold mt-1">
              {statsData.total_training_hours} Saat Eğitim / {statsData.total_people_reached} Kişi
            </p>
          </div>

          {/* Card 2: Toplam Yangın */}
          <div className="bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] p-4 shadow-[var(--fd-shadow-sm)] flex flex-col justify-between hover:border-[var(--fd-danger)]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--fd-danger)] uppercase tracking-[.04em] flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                Toplam Yangın
              </span>
              <span className="text-[var(--fd-danger)] bg-[var(--fd-danger)]/10 px-2 py-0.5 rounded-full text-[10px] font-bold">Yangın</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--fd-danger)] font-[var(--fd-fontmono)]">{statsData.fires_count}</span>
              <span className="text-[var(--fd-text3)] text-xs ml-1.5 font-medium">Müdahale</span>
            </div>
            <p className="text-[10px] text-[var(--fd-text3)] font-semibold mt-1">
              Bina, Arazi, Konut ve Yapı Yangınları
            </p>
          </div>

          {/* Card 3: Kurtarma Operasyonları */}
          <div className="bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] p-4 shadow-[var(--fd-shadow-sm)] flex flex-col justify-between hover:border-[var(--fd-success)]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--fd-success)] uppercase tracking-[.04em] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Kurtarma Operasyonları
              </span>
              <span className="text-[var(--fd-success)] bg-[var(--fd-success)]/10 px-2 py-0.5 rounded-full text-[10px] font-bold">Kurtarma</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--fd-success)] font-[var(--fd-fontmono)]">{statsData.rescue_operations_count}</span>
              <span className="text-[var(--fd-text3)] text-xs ml-1.5 font-medium">Vaka</span>
            </div>
            <p className="text-[10px] text-[var(--fd-text3)] font-semibold mt-1">
              Trafik Kazası ve Afet Müdahale
            </p>
          </div>

          {/* Card 4: Ortalama Müdahale Süresi */}
          <div className="bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] p-4 shadow-[var(--fd-shadow-sm)] flex flex-col justify-between hover:border-[var(--fd-amber)]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--fd-amber)] uppercase tracking-[.04em] flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Ortalama Müdahale
              </span>
              <span className="text-[var(--fd-amber)] bg-[var(--fd-amber)]/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {statsData.active_personnel_count} Nöbetçi
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--fd-amber)] font-[var(--fd-fontmono)]">
                {statsData.avg_response_time > 0 ? `${statsData.avg_response_time.toFixed(1)} dk` : "7.4 dk"}
              </span>
              <span className="text-[var(--fd-text3)] text-xs ml-1.5 font-medium">Ort. Süre</span>
            </div>
            <p className="text-[10px] text-[var(--fd-text3)] font-semibold mt-1">
              Çıkış Saati - Varılan Süre Farkı
            </p>
          </div>
        </div>
      )}

      {/* --- MÜFREZ GÜN SONU KONTROLÜ (Z RAPORU) WİDGET --- */}
      {isAuthorizedForZReport && (
        <div className="bg-[var(--fd-surface)] border border-[var(--fd-accent)]/20 rounded-[var(--fd-r)] p-5 shadow-[var(--fd-shadow-sm)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--fd-accent)]/5 via-transparent to-[var(--fd-accent)]/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[var(--fd-accent)] flex items-center gap-2 tracking-tight">
                <span className="text-lg">📋</span> Müfrez Gün Sonu Kontrolü (Z Raporu)
              </h3>
              <p className="text-xs text-[var(--fd-text3)] mt-1 max-w-xl leading-relaxed">
                24 saatlik nöbet devir-teslim raporunu oluşturun. Seçilen tarihe ait yangın, kurtarma, arızalı araç ve zimmet verileri otomatik hesaplanır.
              </p>
            </div>
            <Button
              onClick={() => {
                handleZDateChange(selectedZDate)
                setZReportModalOpen(true)
              }}
              className="bg-[var(--fd-accent)] hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-[var(--fd-r-sm)] shadow-[var(--fd-shadow-sm)] transition-all duration-300 whitespace-nowrap"
            >
              🏁 24 Saatlik Z Raporu Oluştur
            </Button>
          </div>
        </div>
      )}

      {/* Dynamic Charts Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-80 bg-[var(--fd-surface2)]/40 border border-[var(--fd-border)] rounded-[var(--fd-r)]"></div>
          ))}
        </div>
      ) : chartsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Line Chart */}
          <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] p-4 shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)]">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[var(--fd-text)]">Son 6 Ay Vaka Trendleri</CardTitle>
                <CardDescription className="text-[10px] text-[var(--fd-text3)]">Yangın ve Kurtarma Vakalarının Aylık Dağılımı</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartsData.lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="var(--fd-text3)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--fd-text3)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--fd-surface2)', border: '1px solid var(--fd-border)', borderRadius: 'var(--fd-r-sm)' }}
                    labelStyle={{ color: 'var(--fd-text)', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Yangın" stroke="var(--fd-danger)" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Kurtarma" stroke="var(--fd-success)" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Mahalle Leaderboard */}
          <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] p-4 shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] flex flex-col justify-between">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[var(--fd-text)]">Mahalle Bazlı Olay Dağılımı</CardTitle>
                <CardDescription className="text-[10px] text-[var(--fd-text3)]">En Çok Olay ve Yangın Görülen Bölgeler</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-72 overflow-y-auto pr-1 space-y-4 pt-1 font-sans">
              {chartsData.neighborhoodsData.map((item, index) => {
                const maxVal = Math.max(...chartsData.neighborhoodsData.map(d => d.value));
                const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--fd-text2)]">{item.name}</span>
                      <span className="font-[var(--fd-fontmono)] font-bold text-[var(--fd-text3)]">
                        {item.value} Vaka <span className="text-[var(--fd-text3)]/60 font-sans font-normal">({item.yangin} Yangın, {item.kurtarma} Kurtarma)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--fd-surface2)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[var(--fd-danger)] to-[var(--fd-amber)] rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FILTERS */}
      <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)]">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)] uppercase tracking-wider">Araç Plakası</label>
              <Input 
                placeholder="Örn: 58 ACT 367" 
                value={plakaFilter}
                onChange={e => setPlakaFilter(e.target.value)}
                className="bg-[var(--fd-surface2)] text-[var(--fd-text)] border-[var(--fd-border)] focus:border-[var(--fd-accent)]"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)] uppercase tracking-wider">Personel (Ad veya Sicil)</label>
              <Input 
                placeholder="Örn: Onurcan veya SB5801" 
                value={personnelFilter}
                onChange={e => setPersonnelFilter(e.target.value)}
                className="bg-[var(--fd-surface2)] text-[var(--fd-text)] border-[var(--fd-border)] focus:border-[var(--fd-accent)]"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)] uppercase tracking-wider">Tarih Aralığı</label>
              <select 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-[var(--fd-border)] bg-[var(--fd-surface2)] px-3 py-2 text-sm text-[var(--fd-text)] placeholder:text-[var(--fd-text3)] focus:outline-none focus:ring-2 focus:ring-[var(--fd-accent)]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="today">Bugün</option>
                <option value="7days">Son 7 Gün</option>
                <option value="all">Tüm Zamanlar</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pt-2 sm:pt-0">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[100px] bg-[var(--fd-accent)] hover:opacity-90 text-white rounded-[var(--fd-r-sm)] font-bold text-xs h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Ara</>}
              </Button>
              {(plakaFilter || personnelFilter || dateFilter !== "7days" || statusFilter !== "all") && (
                <Button type="button" variant="outline" onClick={clearFilters} title="Filtreleri Temizle" className="px-3 border-[var(--fd-border)] text-[var(--fd-text2)] hover:bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)] h-10">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Quick Status Filter Toggles */}
          <div className="pt-4 border-t border-[var(--fd-border)]/50 flex flex-wrap gap-3">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border",
                statusFilter === "all"
                  ? "bg-[var(--fd-accent)]/15 text-[var(--fd-accent)] border-[var(--fd-accent)]/30 shadow-sm"
                  : "bg-[var(--fd-surface2)] text-[var(--fd-text3)] border-[var(--fd-border)] hover:bg-[var(--fd-surface3)]"
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
                  ? "bg-[rgba(22,163,74,0.15)] text-[var(--fd-success)] border-[var(--fd-success)]/30 shadow-sm"
                  : "bg-[var(--fd-surface2)] text-[var(--fd-text3)] border-[var(--fd-border)] hover:bg-[var(--fd-surface3)]"
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
                  ? "bg-[rgba(220,38,38,0.15)] text-[var(--fd-danger)] border-[var(--fd-danger)]/30 shadow-sm"
                  : "bg-[var(--fd-surface2)] text-[var(--fd-text3)] border-[var(--fd-border)] hover:bg-[var(--fd-surface3)]"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              ⚠️ Eksik/Hasarlı ({issueCount})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* DATA GRID */}
      <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] overflow-hidden rounded-[var(--fd-r)]">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-[var(--fd-border)]/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-[var(--fd-text)]">
              <History className="w-5 h-5 text-[var(--fd-accent)]" />
              Kontrol Geçmişi
            </CardTitle>
            <CardDescription className="mt-1 text-[var(--fd-text3)]">
              {displayItems.length} kayıt gösteriliyor (gruplandırılmış)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-[var(--fd-danger)]">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>{error}</p>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-[var(--fd-text3)]">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--fd-accent)]/50" />
              <p>Veriler yükleniyor...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="p-12 text-center text-[var(--fd-text3)]">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Bu filtrelere uygun kayıt bulunamadı.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--fd-border)]/30">
              {displayItems.map((item, idx) => {
                if (isGroupedLog(item)) {
                  // Grouped inventory accordion row
                  const isOpen = expandedKeys.has(item.key)
                  return (
                    <div key={item.key} className="group">
                      <button
                        onClick={() => toggleExpand(item.key)}
                        className="w-full text-left px-4 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-[var(--fd-surface2)]/40 transition-colors"
                      >
                        {/* Date */}
                        <div className="shrink-0 w-[90px]">
                          <div className="font-medium text-sm text-[var(--fd-text)]">{new Date(item.tarih).toLocaleDateString("tr-TR")}</div>
                          <div className="text-xs text-[var(--fd-text3)]">{new Date(item.tarih).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        {/* Plaka */}
                        <div className="shrink-0 w-[100px] font-bold text-[var(--fd-accent)] text-sm">
                          {item.plaka}
                        </div>

                        {/* Personnel Name (NOT sicil) */}
                        <div className="shrink-0 w-[130px]">
                          <div className="font-semibold text-sm text-[var(--fd-text)] truncate">{item.ad_soyad}</div>
                        </div>

                        {/* Summary */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-3.5 h-3.5 text-[var(--fd-accent)] shrink-0" />
                            <span className="text-[var(--fd-text2)] font-medium truncate">
                              {item.bolme}
                            </span>
                            <span className="text-[var(--fd-text3)]">—</span>
                            <span className="text-[var(--fd-text3)]/80 text-xs">
                              Toplam {item.items.length} Kalem Malzeme Sayımı
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="shrink-0">
                          {item.durum === "Sorunlu" ? (
                            <Badge variant="danger" className="gap-1 px-2 py-0.5">
                              <AlertTriangle className="w-3 h-3" /> Sorunlu
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1 px-2 py-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Kusursuz
                            </Badge>
                          )}
                        </div>

                        {/* Chevron */}
                        <div className="shrink-0 text-[var(--fd-text3)]">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Accordion Detail Panel */}
                      {isOpen && (
                        <div className="px-6 sm:px-10 pb-4 animate-in slide-in-from-top-1 duration-150">
                          <div className="bg-[var(--fd-surface2)]/60 border border-[var(--fd-border)] rounded-xl p-4 space-y-1.5">
                            <p className="text-[10px] font-bold text-[var(--fd-accent)] uppercase tracking-[.04em] mb-2.5">
                              Sayılan Malzemeler — {item.bolme}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {item.items.map((it, i) => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border",
                                    it.yeni_durum === 'Eksik' || it.yeni_durum === 'Arızalı'
                                      ? "bg-[rgba(220,38,38,0.08)] border-[rgba(220,38,38,0.15)] text-[var(--fd-danger)]"
                                      : "bg-[var(--fd-surface2)]/40 border-[var(--fd-border)] text-[var(--fd-text2)]"
                                  )}
                                >
                                  <span className="font-semibold truncate flex-1">{it.malzeme}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 shrink-0 font-bold",
                                      it.yeni_durum === 'Tam' ? "text-[var(--fd-success)] border-[var(--fd-success)]/25" :
                                      it.yeni_durum === 'Eksik' ? "text-[var(--fd-danger)] border-[var(--fd-danger)]/25" :
                                      it.yeni_durum === 'Arızalı' ? "text-[var(--fd-amber)] border-[var(--fd-amber)]/25" :
                                      "text-[var(--fd-text3)] border-[var(--fd-border)]"
                                    )}
                                  >
                                    {it.yeni_durum}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            {item.items.some(it => it.not) && (
                              <div className="mt-2 pt-2 border-t border-[var(--fd-border)]/50">
                                {item.items.filter(it => it.not).map((it, i) => (
                                  <p key={i} className="text-[10px] text-[var(--fd-amber)]/80 italic">
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
                  <div key={item.id || idx} className="px-4 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-[var(--fd-surface2)]/40 transition-colors">
                    {/* Date */}
                    <div className="shrink-0 w-[90px]">
                      <div className="font-medium text-sm text-[var(--fd-text)]">{new Date(item.tarih).toLocaleDateString("tr-TR")}</div>
                      <div className="text-xs text-[var(--fd-text3)]">{new Date(item.tarih).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>

                    {/* Plaka */}
                    <div className="shrink-0 w-[100px] font-bold text-[var(--fd-accent)] text-sm">
                      {item.plaka}
                    </div>

                    {/* Personnel Name */}
                    <div className="shrink-0 w-[130px]">
                      <div className="font-semibold text-sm text-[var(--fd-text)] truncate">{item.ad_soyad}</div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--fd-text3)] truncate">
                        <span className="text-[var(--fd-text2)] font-medium">{item.islem_tipi}</span>
                        {item.detaylar && <span className="ml-2 text-[var(--fd-text3)]/60">— {item.detaylar}</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {item.durum === "Sorunlu" ? (
                        <Badge variant="danger" className="gap-1 px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" /> Sorunlu
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1 px-2 py-0.5">
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
      <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] overflow-hidden rounded-[var(--fd-r)]">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-[var(--fd-border)]/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-[var(--fd-text)]">
              <History className="w-5 h-5 text-[var(--fd-success)]" />
              Personel Görev Başlangıç ve Devir-Teslim Çizelgesi
            </CardTitle>
            <CardDescription className="mt-1 text-[var(--fd-text3)]">
              Personel mesai giriş-çıkış logları ve aktif çalışma süreleri.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF} 
                className="bg-[var(--fd-surface2)] border-[var(--fd-border)] hover:bg-[var(--fd-surface3)] text-xs font-semibold gap-1.5 text-[var(--fd-text)] rounded-[var(--fd-r-sm)]"
              >
                <span>📄</span> PDF İndir
              </Button>
              <InfoTooltip content="Bu butona basarak personel görev başlangıç ve devir-teslim listesini PDF dosyası olarak bilgisayarınıza indirebilirsiniz." />
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel} 
                className="bg-[var(--fd-surface2)] border-[var(--fd-border)] hover:bg-[var(--fd-surface3)] text-xs font-semibold gap-1.5 text-[var(--fd-text)] rounded-[var(--fd-r-sm)]"
              >
                <span>📊</span> Excel İndir
              </Button>
              <InfoTooltip content="Bu butona basarak personel görev başlangıç ve devir-teslim listesini Excel (XLSX) dosyası olarak bilgisayarınıza indirebilirsiniz." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {shiftLoading ? (
            <div className="p-12 text-center text-[var(--fd-text3)]">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--fd-success)]/50" />
              <p>Devam çizelgesi yükleniyor...</p>
            </div>
          ) : shiftLogs.length === 0 ? (
            <div className="p-12 text-center text-[var(--fd-text3)]">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Görev kaydı bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-[var(--fd-text2)]">
                <thead className="bg-[var(--fd-surface2)]/60 border-b border-[var(--fd-border)]/40 text-[10px] font-bold uppercase tracking-[.04em] text-[var(--fd-text3)]">
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
                <tbody className="divide-y divide-[var(--fd-border)]/30">
                  {shiftLogs.map((log) => {
                    const dateStr = new Date(log.giris_tarihi).toLocaleDateString("tr-TR")
                    const startStr = new Date(log.giris_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
                    const endStr = log.cikis_tarihi 
                      ? new Date(log.cikis_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
                      : "-"
                    
                    const duration = log.durum === 'GÖREVDE' 
                      ? (
                        <span className="text-[var(--fd-success)] font-bold animate-pulse">
                          Aktif Çalışıyor
                        </span>
                      )
                      : formatDuration(log.giris_tarihi, log.cikis_tarihi) || "-"

                    return (
                      <tr key={log.id} className="hover:bg-[var(--fd-surface2)]/40 transition-colors">
                        <td className="px-6 py-4 font-medium">{dateStr}</td>
                        <td className="px-6 py-4 font-semibold text-[var(--fd-text)]">{log.personel_ad_soyad}</td>
                        <td className="px-6 py-4 text-[var(--fd-text3)]">{log.istasyon} / {log.posta}</td>
                        <td className="px-6 py-4 text-[var(--fd-text2)] font-[var(--fd-fontmono)]">{startStr}</td>
                        <td className="px-6 py-4 text-[var(--fd-text2)] font-[var(--fd-fontmono)]">{endStr}</td>
                        <td className="px-6 py-4">{duration}</td>
                        <td className="px-6 py-4">
                          {log.durum === 'GÖREVDE' ? (
                            <Badge variant="success" className="px-2 py-0.5">
                              Görevde
                            </Badge>
                          ) : (
                            <Badge variant="muted" className="px-2 py-0.5">
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

      
      {/* --- GÜN SONU Z RAPORU LİSTESİ / ARŞİVİ --- */}
      <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] overflow-hidden rounded-[var(--fd-r)]">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-[var(--fd-border)]/50">
          <CardTitle className="text-lg flex items-center gap-2 text-[var(--fd-text)]">
            <span>📚</span> Müfrez Z Raporu Arşivi
          </CardTitle>
          <CardDescription className="mt-1 text-[var(--fd-text3)]">
            Mühürlenmiş 24 saatlik nöbet ve vukuat devir-teslim belgeleri.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {dailyReportsLoading ? (
            <div className="p-12 text-center text-[var(--fd-text3)]">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--fd-accent)]/50" />
              <p>Z Raporları yükleniyor...</p>
            </div>
          ) : dailyReports.length === 0 ? (
            <div className="p-12 text-center text-[var(--fd-text3)] font-[var(--fd-fontmono)] text-xs">
              Mühürlü Z raporu bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-[var(--fd-text2)]">
                <thead className="bg-[var(--fd-surface2)]/60 border-b border-[var(--fd-border)]/40 text-[10px] font-bold uppercase tracking-[.04em] text-[var(--fd-text3)] font-[var(--fd-fontmono)]">
                  <tr>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Devreden Amir</th>
                    <th className="px-6 py-4 text-center">Yangın (Toplam)</th>
                    <th className="px-6 py-4 text-center">Kurtarma (Toplam)</th>
                    <th className="px-6 py-4 text-center">Dış Görev</th>
                    <th className="px-6 py-4">Arızalı Araçlar</th>
                    <th className="px-6 py-4 text-center">Devir Durumu</th>
                    <th className="px-6 py-4 text-center">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fd-border)]/30 font-medium">
                  {dailyReports.map((report) => (
                    <tr key={report.id} className="hover:bg-[var(--fd-surface2)]/40 transition-colors">
                      <td className="px-6 py-4 font-[var(--fd-fontmono)] font-bold text-[var(--fd-text)]">
                        {new Date(report.rapor_tarihi).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-6 py-4 text-[var(--fd-text2)]">
                        {personnelMap[report.devreden_amir_id] || "Bilinmeyen Amir"}
                      </td>
                      <td className="px-6 py-4 text-center text-[var(--fd-danger)] font-[var(--fd-fontmono)] font-bold">
                        {report.yangin_sayisi?.total || 0}
                      </td>
                      <td className="px-6 py-4 text-center text-[var(--fd-success)] font-[var(--fd-fontmono)] font-bold">
                        {report.kurtarma_sayisi?.total || 0}
                      </td>
                      <td className="px-6 py-4 text-center text-[var(--fd-accent)] font-[var(--fd-fontmono)] font-bold">
                        {report.dis_gorev_sayisi || 0}
                      </td>
                      <td className="px-6 py-4 text-[var(--fd-text3)] text-xs">
                        {report.arizali_araclar && report.arizali_araclar.length > 0
                          ? report.arizali_araclar.join(', ')
                          : "Yok"}
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        {report.devir_durumu === 'Serhli' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[rgba(245,158,11,0.1)] text-[var(--fd-amber)] border border-[var(--fd-amber)]/20 font-[var(--fd-fontmono)]">
                            ⚠️ ŞERHLİ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[rgba(22,163,74,0.1)] text-[var(--fd-success)] border border-[var(--fd-success)]/20 font-[var(--fd-fontmono)]">
                            ✅ TEMİZ
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <Button
                          onClick={() => handleExportZReportPDF(report)}
                          variant="outline"
                          size="sm"
                          className="bg-[var(--fd-surface2)] border-[var(--fd-border)] hover:bg-[var(--fd-surface3)] text-xs font-bold gap-1 text-[var(--fd-accent)] rounded-[var(--fd-r-sm)]"
                        >
                          📄 PDF Döküm
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Z RAPORU CREATION MODAL --- */}
      {zReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] shadow-[var(--fd-shadow-lg)] overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-4 sm:p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-[var(--fd-accent)]">
                  <span>🏁 24 Saatlik Müfrez Z Raporu</span>
                </CardTitle>
                <CardDescription className="text-xs text-[var(--fd-text3)] mt-1">
                  İlgili tarihin tüm yangın, kurtarma, arızalı araç ve görev bilgilerini otomatik süzüp resmi nöbet defterine mühürleyin.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[var(--fd-text3)] hover:text-[var(--fd-text)] hover:bg-[var(--fd-surface3)]/50 rounded-[var(--fd-r-sm)]"
                onClick={() => setZReportModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {overrideData ? (
                <div className="space-y-4 font-sans text-sm">
                  <div className="p-4 bg-[rgba(245,158,11,0.08)] border border-[var(--fd-amber)]/20 rounded-xl space-y-2">
                    <span className="text-[var(--fd-amber)] font-bold text-base flex items-center gap-1.5">
                      ⚠️ LOJİSTİK AÇIK VE ŞERH BİLDİRİMİ
                    </span>
                    <p className="text-xs text-[var(--fd-text2)] leading-relaxed">
                      Aşağıda listelenen lojistik süreçler veya Makine İkmal sevk logları henüz kapatılmamıştır.
                      Nöbeti şerhli mühürlemek için sorumluluk devrini onaylamanız gerekmektedir.
                    </p>
                  </div>

                  {overrideData.assignments.length > 0 && (
                    <div className="p-4 bg-[var(--fd-surface2)] border border-[var(--fd-border)] rounded-xl space-y-2">
                      <span className="text-xs font-bold text-[var(--fd-text3)] block font-[var(--fd-fontmono)]">AÇIKTA KALAN GEÇİCİ ZİMMET KAYITLARI</span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                        {overrideData.assignments.map((a: any, idx: number) => (
                          <div key={idx} className="text-xs text-[var(--fd-text2)] flex justify-between bg-[var(--fd-surface2)]/40 p-2 rounded-lg border border-[var(--fd-border)]">
                            <span>{a.malzeme_adi}</span>
                            <span className="text-[var(--fd-text3)] font-[var(--fd-fontmono)] font-bold">({a.birim_adi} - {a.teslim_edilen_tip})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {overrideData.maintenance.length > 0 && (
                    <div className="p-4 bg-[var(--fd-surface2)] border border-[var(--fd-border)] rounded-xl space-y-2">
                      <span className="text-xs font-bold text-[var(--fd-text3)] block font-[var(--fd-fontmono)]">AÇIK MAKİNE İKMAL SEVK KAYITLARI (BAKIMDA)</span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                        {overrideData.maintenance.map((m: any, idx: number) => (
                          <div key={idx} className="text-xs text-[var(--fd-text2)] flex justify-between bg-[var(--fd-surface2)]/40 p-2 rounded-lg border border-[var(--fd-border)]">
                            <span>{m.plaka} - Araç Bakımda</span>
                            <span className="text-[var(--fd-amber)] font-bold">{m.ariza_seviyesi}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5 p-3.5 bg-[var(--fd-surface2)]/40 border border-[var(--fd-border)] rounded-xl">
                    <input
                      type="checkbox"
                      id="override-approved"
                      checked={isOverrideApproved}
                      onChange={(e) => setIsOverrideApproved(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/50 cursor-pointer"
                    />
                    <label htmlFor="override-approved" className="text-xs text-[var(--fd-text2)] leading-normal select-none cursor-pointer">
                      Açıkta kalan lojistik süreçlerin sorumluluğunu yeni postaya devrettiğimi ve raporu şerhli mühürlemek istediğimi onaylıyorum.
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-sans text-sm">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--fd-text3)] uppercase tracking-widest mb-1.5 font-[var(--fd-fontmono)]">RAPOR TARİHİ</label>
                    <Input
                      type="date"
                      value={selectedZDate}
                      onChange={(e) => handleZDateChange(e.target.value)}
                      className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)] text-sm focus:border-[var(--fd-accent)] h-11 font-[var(--fd-fontmono)]"
                    />
                  </div>

                  {/* Aggregated Preview Block */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--fd-surface2)] border border-[var(--fd-border)] rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--fd-text3)] uppercase block font-[var(--fd-fontmono)]">🚒 YANGIN DETAYI</span>
                      <p className="font-bold text-[var(--fd-danger)] text-lg mt-0.5">{zFires.total} Yangın</p>
                      <span className="text-[10px] text-[var(--fd-text3)] block mt-0.5 leading-normal">
                        Ev: {zFires.ev} | İşyeri: {zFires.isyeri} | Arazi: {zFires.arazi} | Diğer: {zFires.diger}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[var(--fd-text3)] uppercase block font-[var(--fd-fontmono)]">🚨 KURTARMA DETAYI</span>
                      <p className="font-bold text-[var(--fd-success)] text-lg mt-0.5">{zRescues.total} Kurtarma</p>
                      <span className="text-[10px] text-[var(--fd-text3)] block mt-0.5 leading-normal">
                        Kaza: {zRescues.trafik_kazasi} | Su: {zRescues.su_baskini} | Hayvan: {zRescues.hayvan_kurtarma} | Diğer: {zRescues.diger}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--fd-surface2)]/50 border border-[var(--fd-border)] rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--fd-text3)] uppercase block font-[var(--fd-fontmono)]">🔄 GARAJ & ZİMMET SAYISI</span>
                      <p className="font-bold text-[var(--fd-accent)] text-lg mt-0.5">{zAssignmentsCount} Devir</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[var(--fd-text3)] uppercase block font-[var(--fd-fontmono)]">🛠️ ARIZALI/BAKIMDAKİ ARAÇLAR</span>
                      <p className="font-bold text-[var(--fd-amber)] text-sm mt-1 truncate">
                        {zBrokenVehicles.length > 0 ? zBrokenVehicles.join(', ') : "Yok"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--fd-text3)] uppercase tracking-widest mb-1.5 font-[var(--fd-fontmono)]">DIŞ GÖREV PERSONEL SAYISI (MANUEL AYARLA)</label>
                    <Input
                      type="number"
                      min="0"
                      value={zDisGorevCount}
                      onChange={(e) => setZDisGorevCount(Number(e.target.value))}
                      className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)] text-sm focus:border-[var(--fd-accent)] h-11 font-[var(--fd-fontmono)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--fd-text3)] uppercase tracking-widest mb-1.5 font-[var(--fd-fontmono)]">BAŞÇAVUŞ NÖBET DEVİR NOTU</label>
                    <textarea
                      rows={3}
                      placeholder="Nöbet teslimi sırasında meydana gelen önemli hususları, telsiz notlarını ve devir şartlarını yazınız..."
                      value={zBascavusNotu}
                      onChange={(e) => setZBascavusNotu(e.target.value)}
                      className="flex w-full rounded-xl border border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fd-accent)]/50"
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <div className="bg-[var(--fd-surface2)]/40 border-t border-[var(--fd-border)] p-4 sm:p-5 flex items-center justify-end gap-3">
              {overrideData ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOverrideData(null);
                      setIsOverrideApproved(false);
                    }}
                    className="w-full sm:w-auto border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)]"
                  >
                    Geri Dön
                  </Button>
                  <Button
                    onClick={() => handleSubmitZReport(true)}
                    disabled={zSubmitting || !isOverrideApproved}
                    className="w-full sm:w-auto bg-[var(--fd-amber)] hover:opacity-90 disabled:opacity-50 text-white font-bold shadow-[var(--fd-shadow-sm)]"
                  >
                    {zSubmitting ? "Mühürleniyor..." : "🔏 Raporu Şerhli Mühürle ve Nöbeti Kapat"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setZReportModalOpen(false)} className="w-full sm:w-auto border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)]">
                    İptal
                  </Button>
                  <Button
                    onClick={() => handleSubmitZReport(false)}
                    disabled={zSubmitting}
                    className="w-full sm:w-auto bg-[var(--fd-accent)] hover:opacity-90 text-white font-bold shadow-[var(--fd-shadow-sm)]"
                  >
                    {zSubmitting ? "Mühürleniyor..." : "🏁 Raporu Mühürle & Devret"}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}


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
