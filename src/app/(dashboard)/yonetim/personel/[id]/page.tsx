"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import jsPDF from "jspdf"
import { QRCodeCanvas } from "qrcode.react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, User, Phone, MapPin, Calendar, Briefcase, FileText, Activity, Shield, ActivitySquare, LogOut, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"

// Types
type Personel = any; // TODO: Better typing

export default function PersonelProfilPage() {
  const params = useParams()
  const router = useRouter()
  const sicil_no = params.id as string

  const [personel, setPersonel] = useState<Personel | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [leaves, setLeaves] = useState<any[]>([])
  const [equipments, setEquipments] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState("ozet")
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<any[] | null>(null)
  const [totalMissions, setTotalMissions] = useState<number>(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [certInfo, setCertInfo] = useState<any | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setStatsLoading(true)
      
      try {
        // Fetch Main Personnel Info
        const { data: pData, error: pErr } = await api
          .from('personnel')
          .select('*')
          .eq('sicil_no', sicil_no)
          .single()
          
        if (pData) setPersonel(pData)

        // Fetch Details
        const { data: dData } = await api.from('personnel_details').select('*').eq('sicil_no', sicil_no).single()
        if (dData) setDetails(dData)

        // Fetch Leaves
        const { data: lData } = await api.from('personnel_leaves').select('*').eq('sicil_no', sicil_no).order('created_at', { ascending: false })
        if (lData) setLeaves(lData)

        // Fetch Equipments
        const { data: eData } = await api.from('personnel_equipment').select('*').eq('sicil_no', sicil_no).order('created_at', { ascending: false })
        if (eData) setEquipments(eData)

        // Fetch Activities
        const { data: aData } = await api.from('personnel_activities').select('*').eq('sicil_no', sicil_no).order('tarih', { ascending: false })
        if (aData) setActivities(aData)

        // Fetch Records
        const { data: rData } = await api.from('personnel_records').select('*').eq('sicil_no', sicil_no).order('tarih', { ascending: false })
        if (rData) setRecords(rData)

        // Fetch Personnel Operations Stats
        const sRes = await fetch(`/api/personnel/stats?personnel_id=${sicil_no}`)
        if (sRes.ok) {
          const sData = await sRes.json()
          if (sData.success) {
            setStats(sData.stats)
            setTotalMissions(sData.total || 0)
          }
        }

        // Fetch Certificate info
        const cRes = await fetch(`/api/personnel/certificate?id=${sicil_no}`)
        if (cRes.ok) {
          const cData = await cRes.json()
          if (cData.success) {
            setCertInfo(cData)
          }
        }

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
        setStatsLoading(false)
      }
    }
    
    if (sicil_no) {
      fetchData()
    }
  }, [sicil_no])

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Profil yükleniyor...</div>
  }

  if (!personel) {
    return <div className="p-8 text-center text-danger">Personel bulunamadı!</div>
  }

  const handlePrintIDCard = () => {
    if (!personel) return

    // Get QR from canvas
    const canvas = document.getElementById("personnel-qr-canvas") as HTMLCanvasElement
    const qrDataUrl = canvas ? canvas.toDataURL("image/png") : ""

    // CR80 Standart Kredi Kartı Ebatları: 54mm x 86mm dikey format
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] })

    const tr = (str: string) => {
      if (!str) return ""
      const map: Record<string, string> = {
        'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i',
        'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u', 'Ç': 'C', 'ç': 'c'
      }
      return str.replace(/[ŞşĞğİıÖöÜüÇç]/g, ch => map[ch] || ch)
    }

    // --- SAYFA 1: KART ÖN YÜZÜ ---
    // Siber-mat koyu arka plan
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, 54, 86, "F")

    // İnce altın sarısı/turuncu çerçeve
    doc.setDrawColor(245, 158, 11)
    doc.setLineWidth(0.8)
    doc.rect(1.5, 1.5, 51, 83)

    // Kurumsal Başlık
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(6.5)
    doc.setTextColor(255, 255, 255)
    doc.text("T.C.", 27, 6, { align: "center" })
    doc.text("SIVAS BELEDIYESI", 27, 9, { align: "center" })
    
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(5.5)
    doc.text("ITFAIYE MUDURLUGU", 27, 12, { align: "center" })

    // Seperatör çizgi
    doc.setDrawColor(245, 158, 11)
    doc.setLineWidth(0.3)
    doc.line(10, 14, 44, 14)

    // Fotoğraf / İnitial Yuvarlağı
    doc.setFillColor(30, 41, 59)
    doc.setDrawColor(245, 158, 11)
    doc.setLineWidth(0.5)
    doc.circle(27, 26, 9, "FD")

    // Ad Soyad Baş Harfleri
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(`${personel.ad.charAt(0)}${personel.soyad.charAt(0)}`, 27, 29, { align: "center" })

    // Personel Kimlik Bilgileri
    doc.setFontSize(8.5)
    doc.text(`${tr(personel.ad.toUpperCase())} ${tr(personel.soyad.toUpperCase())}`, 27, 40, { align: "center" })
    
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(245, 158, 11)
    doc.text(tr(personel.unvan || "Itfaiye Eri"), 27, 44, { align: "center" })

    doc.setFontSize(5.5)
    doc.setTextColor(203, 213, 225)
    doc.text(`Sicil: ${tr(personel.sicil_no)}`, 27, 47.5, { align: "center" })
    doc.text(`Yerleske: ${tr(personel.istasyon || "Merkez")}`, 27, 50.5, { align: "center" })
    doc.text("Kan Grubu: A Rh (+)", 27, 53.5, { align: "center" })

    // Kriptografik QR Kod Entegrasyonu
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", 17, 57, 20, 20)
    }

    // Alt Bilgi
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(4.5)
    doc.setTextColor(100, 116, 139)
    doc.text("DIJITAL PDKS KIMLIK KARTI", 27, 81, { align: "center" })

    // --- SAYFA 2: KART ARKA YÜZÜ ---
    doc.addPage()
    
    // Siber-mat koyu arka plan
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, 54, 86, "F")

    // İnce altın sarısı/turuncu çerçeve
    doc.setDrawColor(245, 158, 11)
    doc.setLineWidth(0.8)
    doc.rect(1.5, 1.5, 51, 83)

    // Acil Durum Bilgileri
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(239, 68, 68)
    doc.text("ACIL DURUM HATLARI", 27, 18, { align: "center" })
    
    doc.setFontSize(6.5)
    doc.setTextColor(255, 255, 255)
    doc.text("YANGIN IHBAR: 112", 27, 23, { align: "center" })
    doc.text("SANTRAL: 0346 221 21 11", 27, 27, { align: "center" })

    // Seperatör
    doc.setDrawColor(245, 158, 11)
    doc.setLineWidth(0.3)
    doc.line(10, 32, 44, 32)

    // Yasal ve Entegrasyon İbareleri
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(5)
    doc.setTextColor(148, 163, 184)
    const backText = "Bu kart Sivas Itfaiye Mudurlugu Dijital PDKS (Personel Devam Kontrol Sistemi) altyapisina entegredir. Kart sahibi gorevli personeldir."
    const splitBack = doc.splitTextToSize(backText, 40)
    doc.text(splitBack, 27, 38, { align: "center" })

    doc.setFont("Helvetica", "italic")
    doc.setFontSize(4.5)
    doc.text("Kayip durumunda itfaiye mudurlugune", 27, 54, { align: "center" })
    doc.text("teslim edilmesi rica olunur.", 27, 57, { align: "center" })

    // İlgili Yönetim / Müdür İmzası
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(6)
    doc.setTextColor(255, 255, 255)
    doc.text("Itfaiye Muduru", 27, 70, { align: "center" })
    
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(4.5)
    doc.text("Imza / Muhur", 27, 73, { align: "center" })

    // Save PDF
    const filename = `Sivas_Itfaiye_Kimlik_Karti_${personel.sicil_no}.pdf`
    doc.save(filename)
  }

  const handlePrintCertificate = () => {
    if (!certInfo || !personel) return

    // Create a landscape PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = 297
    const pageH = 210

    const tr = (str: string) => {
      if (!str) return ""
      const map: Record<string, string> = {
        'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i',
        'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u', 'Ç': 'C', 'ç': 'c'
      }
      return str.replace(/[ŞşĞğİıÖöÜüÇç]/g, ch => map[ch] || ch)
    }

    // 1. Certificate Borders (Premium double frame)
    // Outer border (Gold/Bronze color)
    doc.setDrawColor(218, 165, 32) // Goldenrod
    doc.setLineWidth(1.5)
    doc.rect(10, 10, pageW - 20, pageH - 20)

    // Inner border
    doc.setDrawColor(30, 41, 59) // Slate-900
    doc.setLineWidth(0.5)
    doc.rect(12, 12, pageW - 24, pageH - 24)

    // Corner decorative mini-rectangles
    doc.setDrawColor(218, 165, 32)
    doc.setFillColor(218, 165, 32)
    doc.rect(11, 11, 4, 4, "FD")
    doc.rect(pageW - 15, 11, 4, 4, "FD")
    doc.rect(11, pageH - 15, 4, 4, "FD")
    doc.rect(pageW - 15, pageH - 15, 4, 4, "FD")

    // 2. Sivas Fire Department Branding
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(30, 41, 59)
    doc.text("T.C.", pageW / 2, 28, { align: "center" })
    doc.text("SIVAS BELEDIYE BASKANLIGI", pageW / 2, 35, { align: "center" })
    
    doc.setFontSize(13)
    doc.setFont("Helvetica", "normal")
    doc.text("ITFAIYE MUDURLUGU EGITIM VE TAHKIKAT AMIRLIGI", pageW / 2, 42, { align: "center" })

    // Decorative horizontal division lines
    doc.setDrawColor(218, 165, 32)
    doc.setLineWidth(0.6)
    doc.line(pageW / 2 - 40, 46, pageW / 2 + 40, 46)

    // 3. Main Title
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(26)
    doc.setTextColor(190, 24, 24) // Crimson Red
    doc.text("USTUN HIZMET VE EGITICI SERTIFIKASI", pageW / 2, 62, { align: "center" })

    // 4. Certificate Body Text
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(14)
    doc.setTextColor(51, 65, 85) // Slate-700
    doc.text("Sivas Belediyesi Itfaiye Mudurlugu bunyesinde gorev yapan;", pageW / 2, 78, { align: "center" })

    // Personnel Name & Unvan
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text(`${tr(personel.ad.toUpperCase())} ${tr(personel.soyad.toUpperCase())}`, pageW / 2, 92, { align: "center" })
    
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(13)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text(`Sicil No: ${tr(personel.sicil_no)}   |   Unvan: ${tr(personel.unvan || "Itfaiye Eri")}`, pageW / 2, 100, { align: "center" })

    // Text about education hours
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(13)
    doc.setTextColor(51, 65, 85)
    
    const bodyText = 
      `Teftis ve egitim kuralları cercevesinde, Sivas ili sınırları icerisindeki dis kurumlara ` +
      `yonelik icra edilen tamamlanmıs resmi faaliyetlerde toplam ${certInfo.total_hours} saat egitim verdigi ` +
      `tespit edilmis ve Mudurlugumuzce belirlenen 40 saatlik kurumsal barajı basarıyla asarak bu sertifikayı ` +
      `almaya hak kazanmıstır.`;
    
    const splitText = doc.splitTextToSize(tr(bodyText), pageW - 80)
    doc.text(splitText, pageW / 2, 116, { align: "center" })

    // Text on dedication
    doc.setFont("Helvetica", "italic")
    doc.setFontSize(11)
    doc.text("Gosterdigi ustun egitimci performansı, disiplin ve kurumsal katkılarından dolayı tesekkur ederiz.", pageW / 2, 140, { align: "center" })

    // 5. Signatures
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text("Egitim Sube Amiri", 50, 162, { align: "center" })
    doc.text("Itfaiye Muduru", pageW - 50, 162, { align: "center" })

    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text("Imza / Muhur", 50, 167, { align: "center" })
    doc.text("Imza / Muhur", pageW - 50, 167, { align: "center" })

    // Date at bottom center
    const currentDate = new Date().toLocaleDateString("tr-TR")
    doc.setFontSize(10)
    doc.text(`Duzenleme Tarihi: ${currentDate}`, pageW / 2, 192, { align: "center" })

    // Save PDF
    const filename = `Sivas_Itfaiye_Egitici_Sertifikasi_${personel.sicil_no}.pdf`
    doc.save(filename)
  }

  const tabs = [
    { id: 'ozet', label: 'Özet', icon: User },
    { id: 'iletisim', label: 'İletişim', icon: Phone },
    { id: 'izinler', label: 'İzinler', icon: Calendar },
    { id: 'zimmet', label: 'Zimmet (Ekipman)', icon: Shield },
    { id: 'hizmet', label: 'Hizmet Dökümü', icon: Briefcase },
    { id: 'faaliyet', label: 'Faaliyetler', icon: ActivitySquare },
  ]

  return (
    <div className="flex flex-col h-full bg-background min-h-screen pb-12">
      {/* Header */}
      <div className="bg-surface border-b border-border p-4 sm:p-6 sm:pb-0">
        <button 
          onClick={() => router.push('/yonetim/personel')} 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Personel Listesine Dön
        </button>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-2xl sm:text-3xl font-bold shrink-0">
              {personel.ad.charAt(0)}{personel.soyad.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{personel.ad} {personel.soyad}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <Badge variant="outline" className="font-mono bg-surface">{personel.sicil_no}</Badge>
                <span>{personel.unvan}</span>
                <span className="opacity-50">|</span>
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${personel.aktif ? 'bg-success' : 'bg-danger'}`} />
                  {personel.aktif ? 'Sistemde Aktif' : 'Sistemde Pasif'}
                </span>
                <span className="opacity-50">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Günlük Durum:</span>
                  {(() => {
                    const durumLower = (personel.durum || '').toLowerCase();
                    let variant: 'success' | 'danger' | 'warning' | 'outline' = 'success';
                    if (durumLower.includes('izinli') || durumLower.includes('raporlu')) {
                      variant = 'danger';
                    } else if (durumLower.includes('geçici') || durumLower.includes('gecici') || durumLower.includes('dış') || durumLower.includes('dis')) {
                      variant = 'warning';
                    }
                    return (
                      <Badge variant={variant} className="text-[11px] font-semibold px-2 py-0.5">
                        {personel.durum || 'Hazır'}
                      </Badge>
                    );
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Print/Certificate Area */}
          <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0 bg-slate-950/20 border border-slate-800/40 p-3 rounded-2xl backdrop-blur-md shadow-md">
            {certInfo && (
              <div className="text-xs font-semibold text-zinc-400">
                Eğitim Verme Saati: <span className={`font-black ${certInfo.eligible ? "text-emerald-400" : "text-amber-400"}`}>{certInfo.total_hours} / {certInfo.threshold} sa</span>
              </div>
            )}
            <div className="flex flex-row items-center gap-2">
              {/* Hidden Canvas for QR Generation */}
              <div style={{ display: 'none' }}>
                <QRCodeCanvas
                  id="personnel-qr-canvas"
                  value={`SIVAS-PDKS-ID: ${personel.sicil_no} | ${personel.ad} ${personel.soyad}`}
                  size={150}
                  level="H"
                />
              </div>
              <Button
                onClick={handlePrintIDCard}
                className="text-xs font-bold px-4 py-2 h-9 rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md font-extrabold shadow-blue-500/20"
              >
                🪪 Dijital Kimlik Kartı Üret
              </Button>
              {certInfo && (
                <Button
                  disabled={!certInfo.eligible}
                  onClick={handlePrintCertificate}
                  className={`text-xs font-bold px-4 py-2 h-9 rounded-xl flex items-center gap-1.5 transition-all shadow-md ${
                    certInfo.eligible 
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold shadow-amber-500/20" 
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                  }`}
                >
                  🎓 Resmi Sertifika Bas
                </Button>
              )}
            </div>
            {certInfo && !certInfo.eligible && (
              <span className="text-[10px] text-zinc-500 font-medium">Sertifika için {Math.max(0, certInfo.threshold - certInfo.total_hours).toFixed(1)} saat daha eğitim vermeli.</span>
            )}
          </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar gap-1 border-b border-border/50">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
        
        {/* ÖZET SEKMESİ */}
        {activeTab === 'ozet' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sicil No</p>
                      <p className="font-medium">{personel.sicil_no}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rol</p>
                      <p className="font-medium">{personel.rol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <p className="font-medium">{personel.posta || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kan Grubu</p>
                      <p className="font-medium text-danger">{details?.kan_grubu || 'Belirtilmemiş'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">İşe Başlama Tarihi</p>
                      <p className="font-medium">{details?.ise_baslama_tarihi ? new Date(details.ise_baslama_tarihi).toLocaleDateString('tr-TR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Doğum Tarihi</p>
                      <p className="font-medium">{details?.dogum_tarihi ? new Date(details.dogum_tarihi).toLocaleDateString('tr-TR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Günlük Nöbet Durumu</p>
                      <p className="font-medium text-cyan-400">{personel.durum || 'Hazır'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sistem Yetkileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                      <span>Sadece Görüntüler</span>
                    </div>
                    <Badge variant={personel.view_only ? "success" : "outline"}>{personel.view_only ? 'Evet' : 'Hayır'}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                      <span>Envanter Onaylayabilir</span>
                    </div>
                    <Badge variant={personel.can_approve ? "success" : "outline"}>{personel.can_approve ? 'Evet' : 'Hayır'}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <span>Barkod Basabilir</span>
                    </div>
                    <Badge variant={personel.can_print ? "success" : "outline"}>{personel.can_print ? 'Evet' : 'Hayır'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-950/40 backdrop-blur-md border border-slate-800 text-slate-100 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-slate-800/60 pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-cyan-400">
                  <ActivitySquare className="w-5 h-5 text-cyan-400" />
                  Operasyonel Görev Dağılım Radarı
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[320px]">
                {statsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <Clock className="w-5 h-5 animate-spin" /> İstatistikler yükleniyor...
                  </div>
                ) : totalMissions === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 border border-dashed border-slate-800/60 rounded-xl space-y-2">
                    <AlertTriangle className="w-10 h-10 text-amber-500/80 animate-pulse" />
                    <h3 className="font-semibold text-slate-200">Kayıtlı Vaka Görevi Bulunmuyor</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Bu personelin son dönemde katıldığı herhangi bir aktif itfaiye/kurtarma operasyonu veya dış lojistik görevi kayda geçmemiştir.
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats || []}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#475569' }} />
                        <Radar
                          name="Görev Sayısı"
                          dataKey="value"
                          stroke="#06b6d4"
                          fill="#06b6d4"
                          fillOpacity={0.2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="text-center text-xs text-slate-400 mt-2">
                      Toplam Görev Sayısı: <span className="text-cyan-400 font-bold">{totalMissions}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* İLETİŞİM SEKMESİ */}
        {activeTab === 'iletisim' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">İletişim & Acil Durum Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-muted-foreground border-b pb-2">Kişisel İletişim</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium text-lg">{details?.telefon || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Açık Adres</p>
                    <p className="font-medium">{details?.adres || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4 bg-danger/5 border border-danger/20 p-4 rounded-xl">
                  <h3 className="font-semibold text-danger border-b border-danger/20 pb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Acil Durumda Ulaşılacak Kişi
                  </h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Kişi Adı Soyadı</p>
                    <p className="font-medium">{details?.acil_durum_kisi_ad || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon Numarası</p>
                    <p className="font-medium">{details?.acil_durum_kisi_telefon || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* İZİNLER SEKMESİ */}
        {activeTab === 'izinler' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">İzin Kayıtları</h2>
              <Button>Yeni İzin Talebi</Button>
            </div>
            
            {leaves.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                Kayıtlı izin bulunmamaktadır.
              </div>
            ) : (
              <div className="space-y-4">
                {leaves.map(leave => (
                  <div key={leave.id} className="p-4 border rounded-xl bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={leave.durum === 'Onaylandı' ? 'success' : leave.durum === 'Reddedildi' ? 'danger' : 'warning'}>
                          {leave.durum}
                        </Badge>
                        <span className="font-semibold">{leave.izin_turu}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {new Date(leave.baslangic_tarihi).toLocaleDateString('tr-TR')} - {new Date(leave.bitis_tarihi).toLocaleDateString('tr-TR')}
                      </div>
                      <p className="text-sm mt-1">{leave.aciklama}</p>
                    </div>
                    {leave.belge_url && (
                      <a href={leave.belge_url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                        <FileText className="w-4 h-4" /> Rapor / Belge Eki
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ZİMMET SEKMESİ */}
        {activeTab === 'zimmet' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Zimmetli Ekipmanlar</h2>
              <Button>Zimmet Ekle</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipments.length === 0 ? (
                <div className="col-span-full text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                  Zimmetli ekipman bulunmamaktadır.
                </div>
              ) : (
                equipments.map(eq => (
                  <Card key={eq.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{eq.ekipman_adi}</h3>
                          <p className="text-xs text-muted-foreground font-mono">Seri No: {eq.seri_no || '-'}</p>
                        </div>
                        <Badge variant={eq.durum === 'Aktif' ? 'success' : 'outline'}>{eq.durum}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                        <div>
                          <p className="text-muted-foreground text-xs">Veriliş Tarihi</p>
                          <p>{new Date(eq.verilis_tarihi).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Miad Tarihi</p>
                          <p className={eq.miad_tarihi && new Date(eq.miad_tarihi) < new Date() ? 'text-danger font-semibold' : ''}>
                            {eq.miad_tarihi ? new Date(eq.miad_tarihi).toLocaleDateString('tr-TR') : '-'}
                          </p>
                        </div>
                        {eq.beden && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground text-xs">Beden / Ölçü</p>
                            <p>{eq.beden}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* FAALİYET VE HİZMET */}
        {activeTab === 'hizmet' && (
          <Card>
            <CardHeader>
              <CardTitle>Hizmet Dökümü & Kayıtlar</CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                  Kayıt bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {records.map(rec => (
                    <div key={rec.id} className="flex gap-4 p-3 border-b last:border-0">
                      <div className="w-24 shrink-0 text-sm text-muted-foreground pt-1">
                        {new Date(rec.tarih).toLocaleDateString('tr-TR')}
                      </div>
                      <div>
                        <Badge className="mb-1" variant="outline">{rec.kayit_turu}</Badge>
                        <p className="text-sm">{rec.aciklama}</p>
                        {rec.belge_no && <p className="text-xs text-muted-foreground mt-1">Belge No: {rec.belge_no}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'faaliyet' && (
          <Card>
            <CardHeader>
              <CardTitle>Eğitim & Operasyon Faaliyetleri</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                  Faaliyet kaydı bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map(act => (
                    <div key={act.id} className="flex items-center gap-4 p-3 border rounded-lg bg-surface">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ActivitySquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{act.faaliyet_turu}</h4>
                        <p className="text-sm text-muted-foreground">{act.aciklama}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{new Date(act.tarih).toLocaleDateString('tr-TR')}</p>
                        <p className="text-xs text-muted-foreground">{act.sure_dakika} dk</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
