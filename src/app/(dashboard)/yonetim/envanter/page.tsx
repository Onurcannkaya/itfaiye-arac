"use client"

import { useState, useEffect, useMemo } from "react"
import EnvanteriPage from "../envanteri/page"
import PageGuard from "@/components/PageGuard"
import { api } from "@/lib/api"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { 
  Truck, 
  RefreshCw, 
  Printer, 
  Inbox, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  FileText, 
  Calendar,
  Combine,
  Loader2
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useAuthStore } from "@/lib/authStore"

interface AssignmentItem {
  id: number
  uuid: string
  malzeme_id: number
  teslim_edilen_tip: 'PERSONEL' | 'ARAC' | 'DIS_BIRIM'
  birim_adi: string
  teslim_tarihi: string
  tahmini_iade_tarihi: string
  durum: 'AKTIF' | 'IADE_EDILDI' | 'GECIKTI'
  materialName?: string
  telefon?: string
  ucret?: string
}

export default function EnvanterPageFallback() {
  const { user } = useAuthStore()
  const [activeSection, setActiveSection] = useState<"vehicles" | "assignments">("vehicles")
  
  // Assignment Tab States
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [activePrintAssignment, setActivePrintAssignment] = useState<any | null>(null)

  // Load assignments
  const loadAssignments = async () => {
    setLoading(true)
    try {
      // Fetch assignments - will auto-update durum to GECIKTI in backend GET
      const { data: list } = await api.from('temporary_assignments').select('*').order('created_at', { ascending: false })
      const { data: invData } = await api.from('inventory').select('id,malzeme_adi')
      
      if (list && invData) {
        const invMap = new Map((invData || []).map((i: any) => [i.id, i.malzeme_adi]))
        const mapped = (list || []).map((item: any) => ({
          ...item,
          materialName: invMap.get(item.malzeme_id) || `Bilinmeyen Malzeme (ID: ${item.malzeme_id})`
        }))
        setAssignments(mapped)
      } else {
        setAssignments([])
      }
    } catch (err) {
      console.error("Zimmet listesi yükleme hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === "assignments") {
      loadAssignments()
    }
  }, [activeSection])

  // Print Effect Handler
  useEffect(() => {
    if (activePrintAssignment) {
      const printArea = document.getElementById('print-area-assignment-control')
      if (printArea) {
        const existing = document.getElementById('print-area-assignment-live')
        if (existing) {
          try { document.body.removeChild(existing); } catch (e) {}
        }

        const clone = printArea.cloneNode(true) as HTMLElement
        clone.className = 'print-area-container'
        clone.id = 'print-area-assignment-live'
        document.body.appendChild(clone)
        
        setTimeout(() => {
          window.print()
          setTimeout(() => {
            const live = document.getElementById('print-area-assignment-live')
            if (live) {
              try { document.body.removeChild(live); } catch (e) {}
            }
            setActivePrintAssignment(null)
          }, 500)
        }, 400)
      } else {
        setActivePrintAssignment(null)
      }
    }
  }, [activePrintAssignment])

  // Return item logic
  const handleReturnItem = async (assignment: AssignmentItem) => {
    if (!window.confirm(`"${assignment.materialName}" malzemesini iade almak istediğinize emin misiniz?`)) return

    try {
      // 1. Update temporary_assignments durum to IADE_EDILDI
      const res = await api.update('temporary_assignments', { durum: 'IADE_EDILDI' }, { id: assignment.id })
      if (res.error) throw new Error(res.error)

      // 2. Find matching vehicle_inventory item with 🔄 GEÇİCİ ZİMMETTE status
      const { data: vehInvList } = await api
        .from('vehicle_inventory')
        .select('*')
        .eq('inventory_id', assignment.malzeme_id)
        .eq('durum', '🔄 GEÇİCİ ZİMMETTE')

      if (vehInvList && vehInvList.length > 0) {
        const targetItem = vehInvList[0]
        
        // Update vehicle_inventory status back to Tam
        await api.update('vehicle_inventory', { durum: 'Tam' }, { id: targetItem.id })

        // Fetch all items for this vehicle to rebuild bolmeler JSON cache
        const { data: allItems } = await api
          .from('vehicle_inventory')
          .select('*')
          .eq('plaka', targetItem.plaka)

        const { data: masterInv } = await api.from('inventory').select('id,malzeme_adi')

        if (allItems && masterInv) {
          const cache: Record<number, string> = {}
          masterInv.forEach((m: any) => {
            cache[m.id] = m.malzeme_adi
          })

          const newBolmeler: Record<string, any[]> = {}
          allItems.forEach((row: any) => {
            const label = row.bolme_kapak || "Araç İçi"
            const key = Object.entries(COMPARTMENT_NAMES).find(
              ([_, v]) => v.toLowerCase() === label.toLowerCase()
            )?.[0] || label.replace(/\s+/g, "_").toLowerCase()

            if (!newBolmeler[key]) newBolmeler[key] = []
            newBolmeler[key].push({
              malzeme: cache[row.inventory_id] || "Bilinmeyen Malzeme",
              adet: row.adet,
              durum: row.durum
            })
          })

          await api.update('vehicles', { bolmeler: newBolmeler }, { plaka: targetItem.plaka })
        }
      }

      // Save audit log
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'temporary_assignment_return',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: assignment.materialName,
          details: {
            assignment_id: assignment.id,
            birim_adi: assignment.birim_adi,
          },
        }),
      }).catch(err => console.error('[AuditLog] İade logu gönderilemedi:', err))

      alert("Malzeme başarıyla iade alındı ve araç envanter statüsü güncellendi.")
      loadAssignments()
    } catch (err: any) {
      console.error(err)
      alert("Hata oluştu: " + err.message)
    }
  }

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments
    const q = searchQuery.toLowerCase().trim()
    return assignments.filter(item => 
      (item.materialName || "").toLowerCase().includes(q) ||
      (item.birim_adi || "").toLowerCase().includes(q)
    )
  }, [assignments, searchQuery])

  // Stats
  const stats = useMemo(() => {
    const total = assignments.length
    const active = assignments.filter(a => a.durum === 'AKTIF').length
    const overdue = assignments.filter(a => a.durum === 'GECIKTI').length
    const returned = assignments.filter(a => a.durum === 'IADE_EDILDI').length
    return { total, active, overdue, returned }
  }, [assignments])

  return (
    <PageGuard pageId="envanter">
      <div className="flex flex-col min-h-screen space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8">
        
        {/* Siberian-matte Top-level Tabs */}
        <div className="flex gap-2.5 p-1 bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-white/5 self-start print:hidden">
          <button
            onClick={() => setActiveSection("vehicles")}
            className={`px-5 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
              activeSection === "vehicles" 
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            🚒 Araç Envanterleri
          </button>
          <button
            onClick={() => setActiveSection("assignments")}
            className={`px-5 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 ${
              activeSection === "assignments" 
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            🔄 Geçici Zimmet Takibi
          </button>
        </div>

        {/* Section Rendering */}
        {activeSection === "vehicles" ? (
          <EnvanteriPage />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200 print:hidden">
            {/* Header Section */}
            <div className="border-b border-white/10 pb-4">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <RefreshCw className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                Geçici Zimmet Kontrol Merkezi
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                İtfaiye bünyesindeki geçici zimmet kayıtlarını izleyin, iadeleri yönetin ve teslim formlarını yazdırın.
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-900/35 border-slate-800/90 rounded-2xl">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Toplam Zimmet</span>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/35 border-slate-800/90 rounded-2xl border-l-2 border-l-cyan-500/50">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Aktif Zimmetler</span>
                  <p className="text-2xl sm:text-3xl font-bold text-cyan-400 mt-1">{stats.active}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/35 border-slate-800/90 rounded-2xl border-l-2 border-l-red-500/50">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Süresi Geçenler</span>
                  <p className="text-2xl sm:text-3xl font-bold text-red-400 mt-1 animate-pulse">{stats.overdue}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/35 border-slate-800/90 rounded-2xl border-l-2 border-l-emerald-500/50">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">İade Edilenler</span>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">{stats.returned}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter card */}
            <Card className="bg-slate-950/75 border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <Search className="text-slate-400 w-5 h-5 shrink-0" />
                <Input
                  type="text"
                  placeholder="Malzeme adı veya teslim alan birime göre filtreleyin..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-900/60 border-white/10 text-slate-100 text-sm focus:border-cyan-500/50 focus:ring-cyan-500/50 h-11 rounded-xl"
                />
              </CardContent>
            </Card>

            {/* Main Assignments Grid */}
            <Card className="bg-slate-950/75 border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-950/40 border-b border-white/10 p-5 flex justify-between items-center flex-row">
                <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>Resmi Geçici Zimmet Kayıtları</span>
                </CardTitle>
                <button 
                  onClick={loadAssignments}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-white/5"
                  title="Yenile"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-slate-500 font-mono text-xs">Geçici zimmet kayıtları yükleniyor...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm min-w-[950px]">
                      <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 font-mono">
                        <tr>
                          <th className="px-5 py-3.5 text-left font-semibold">MALZEME ADI</th>
                          <th className="px-5 py-3.5 text-left font-semibold">ZİMMETLENEN YER (ALICI)</th>
                          <th className="px-5 py-3.5 text-center font-semibold w-36">TESLİM TARİHİ</th>
                          <th className="px-5 py-3.5 text-center font-semibold w-36">İADE TARİHİ</th>
                          <th className="px-5 py-3.5 text-center font-semibold w-40">DURUM</th>
                          <th className="px-5 py-3.5 text-center font-semibold w-64">İŞLEMLER</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {filteredAssignments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500 italic font-mono text-xs">
                              Gösterilecek geçici zimmet kaydı bulunmamaktadır.
                            </td>
                          </tr>
                        ) : (
                          filteredAssignments.map((item) => {
                            const isOverdue = item.durum === 'GECIKTI'
                            const isActive = item.durum === 'AKTIF'
                            const isReturned = item.durum === 'IADE_EDILDI'
                            
                            return (
                              <tr key={item.id} className="hover:bg-white/5 transition-colors duration-150">
                                
                                {/* Malzeme Adı */}
                                <td className="px-5 py-4 font-bold text-slate-200">
                                  <div className="flex items-center gap-2">
                                    {isOverdue && (
                                      <span className="animate-pulse bg-red-500/15 text-red-400 border border-red-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-black shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                                        🚨 GECİKTİ
                                      </span>
                                    )}
                                    <span>{item.materialName}</span>
                                  </div>
                                </td>

                                {/* Zimmetlenen Yer */}
                                <td className="px-5 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-slate-300 font-bold">{item.birim_adi}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">
                                      {item.teslim_edilen_tip === 'PERSONEL' ? 'Personel' : 
                                       item.teslim_edilen_tip === 'ARAC' ? 'Araç' : 'Dış Birim'}
                                    </span>
                                  </div>
                                </td>

                                {/* Teslim Tarihi */}
                                <td className="px-5 py-4 text-center font-mono text-xs text-slate-300 align-middle">
                                  {new Date(item.teslim_tarihi).toLocaleDateString("tr-TR")}
                                </td>

                                {/* İade Tarihi */}
                                <td className={`px-5 py-4 text-center font-mono text-xs align-middle ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                                  {new Date(item.tahmini_iade_tarihi).toLocaleDateString("tr-TR")}
                                </td>

                                {/* Durum */}
                                <td className="px-5 py-4 text-center align-middle">
                                  <Badge 
                                    className={`font-black font-mono text-[9px] px-2.5 py-1 rounded-md ${
                                      isReturned 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                                        : isOverdue 
                                          ? 'bg-red-500/10 text-red-400 border border-red-500/25' 
                                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                                    }`}
                                  >
                                    {isReturned ? 'İADE ALINDI' : isActive ? 'ZİMMETTE' : 'SÜRESİ GEÇTİ'}
                                  </Badge>
                                </td>

                                {/* İşlemler */}
                                <td className="px-5 py-4 text-center align-middle">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => setActivePrintAssignment(item)}
                                      className="h-10 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all min-h-[44px]"
                                      title="Resmi Teslim Formunu Yazdır"
                                    >
                                      <Printer className="w-4 h-4 text-orange-400" />
                                      Formu Yazdır
                                    </button>
                                    {!isReturned && (
                                      <button
                                        onClick={() => handleReturnItem(item)}
                                        className="h-10 px-3 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all min-h-[44px]"
                                        title="Zimmeti Sonlandır, İade Al"
                                      >
                                        <Inbox className="w-4 h-4 text-emerald-400" />
                                        İade Al
                                      </button>
                                    )}
                                  </div>
                                </td>

                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* --- Hidden Assignment Control Print Template (Cloned dynamically for printing) --- */}
            {activePrintAssignment && (
              <div id="print-area-assignment-control" style={{ display: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', color: 'black', backgroundColor: 'white', padding: '0px' }}>
                  <style dangerouslySetInnerHTML={{__html: `
                    @page {
                      size: A4 landscape;
                      margin: 5mm;
                    }
                    @media print {
                      .print-area-container {
                        padding: 8mm !important;
                        margin: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        box-sizing: border-box !important;
                      }
                    }
                  `}} />
                  
                  <div style={{ width: '100%', border: '4px solid black', padding: '15px', borderRadius: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '140mm', minHeight: '140mm', maxHeight: '140mm', justifyContent: 'space-between', fontFamily: 'sans-serif' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid black', paddingBottom: '10px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src="/logo-belediye.png" style={{ width: '60px', height: '60px', objectFit: 'contain' }} alt="Belediye Logo" />
                        <div>
                          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>SİVAS BELEDİYESİ</h1>
                          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>İTFAİYE MÜDÜRLÜĞÜ</h2>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, border: '2px solid black', padding: '6px 15px', borderRadius: '10px', letterSpacing: '1px' }}>MALZEME TESLİM FORMU</h2>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '2px' }}>
                        <div style={{ background: 'white', padding: '2px', border: '2px solid black', display: 'inline-block' }}>
                          <QRCodeSVG value={`${window.location.origin}/zimmet/${activePrintAssignment.uuid}`} size={60} level="H" />
                        </div>
                        <span style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>UUID: {activePrintAssignment.uuid}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px', flex: 1, marginBottom: '10px', minHeight: '0' }}>
                      
                      {/* Left Column Box */}
                      <div style={{ gridColumn: 'span 4', borderRight: '3px solid black', paddingRight: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '5px' }}>
                        <div style={{ border: '2px solid black', padding: '6px 10px', borderRadius: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>TESLİM EDİLEN BİRİM / TİP</h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>
                            {activePrintAssignment.teslim_edilen_tip === 'PERSONEL' ? 'PERSONEL' : 
                             activePrintAssignment.teslim_edilen_tip === 'ARAC' ? 'ARAÇ' : 'DIŞ BİRİM'}
                          </p>
                        </div>
                        <div style={{ border: '2px solid black', padding: '6px 10px', borderRadius: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>TESLİM ALAN</h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>{activePrintAssignment.birim_adi}</p>
                        </div>
                        <div style={{ border: '2px solid black', padding: '6px 10px', borderRadius: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>TELEFON</h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>{activePrintAssignment.telefon || '....................................'}</p>
                        </div>
                      </div>

                      {/* Right Table */}
                      <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', minHeight: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', tableLayout: 'fixed' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '35px' }}>S.NO</th>
                              <th style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'left' }}>MALZEMENİN CİNSİ</th>
                              <th style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>MİKTARI</th>
                              <th style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '85px' }}>ÇIKIŞ TARİHİ</th>
                              <th style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '85px' }}>DÖNÜŞ TARİHİ</th>
                              <th style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '85px' }}>HASAR DURUMU</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace' }}>1</td>
                              <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePrintAssignment.materialName}</td>
                              <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{activePrintAssignment.quantity || 1}</td>
                              <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace' }}>{new Date(activePrintAssignment.teslim_tarihi).toLocaleDateString("tr-TR")}</td>
                              <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace' }}>{new Date(activePrintAssignment.tahmini_iade_tarihi).toLocaleDateString("tr-TR")}</td>
                              <td style={{ border: '2px solid black', padding: '6px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold' }}>{activePrintAssignment.durum_aciklamasi || 'Hasarsız'}</td>
                            </tr>
                            {[2, 3, 4, 5].map(sno => (
                              <tr key={sno}>
                                <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace', color: '#ccc' }}>{sno}</td>
                                <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>..................................................</td>
                                <td style={{ border: '2px solid black', padding: '6px', fontSize: '11px', textAlign: 'center', color: '#ccc' }}>......</td>
                                <td style={{ border: '2px solid black', padding: '6px', fontSize: '10px', textAlign: 'center', color: '#ccc' }}>...../...../20.....</td>
                                <td style={{ border: '2px solid black', padding: '6px', fontSize: '10px', textAlign: 'center', color: '#ccc' }}>...../...../20.....</td>
                                <td style={{ border: '2px solid black', padding: '6px', fontSize: '10px', textAlign: 'center', color: '#ccc' }}>................</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>

                    {/* Footer Signatures */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center', paddingTop: '8px', borderTop: '3px solid black' }}>
                      <div>
                        <h4 style={{ margin: '0 0 20px 0', fontSize: '10px', fontWeight: 'bold' }}>TESLİM EDEN BİRİM / AMİR</h4>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold' }}>İmza / Kaşe</p>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 20px 0', fontSize: '10px', fontWeight: 'bold' }}>TESLİM ALAN PERSONEL</h4>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold' }}>İmza</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 15px 0', fontSize: '9px', fontWeight: 'bold', color: '#555' }}>Malzeme Tamir İçin Çıkış Yapılmışsa Ücreti:</p>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 'black' }}>
                          {activePrintAssignment.ucret ? `${activePrintAssignment.ucret} TL` : '....................................... TL'}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Hardware Safe Area Spacer Shield */}
        <div 
          className="w-full block md:hidden pointer-events-none clear-both h-28" 
          aria-hidden="true" 
        />

      </div>
    </PageGuard>
  )
}
