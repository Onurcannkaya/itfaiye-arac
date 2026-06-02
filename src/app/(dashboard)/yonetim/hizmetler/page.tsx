"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAuthStore } from "@/lib/authStore"
import PageGuard from "@/components/PageGuard"
import { 
  Loader2, 
  FileText, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Info,
  Brush,
  ShieldCheck,
  GraduationCap,
  CreditCard,
  Building,
  Calendar,
  HelpCircle,
  X,
  FilePlus,
  AlertTriangle,
  Send,
  UserCheck
} from "lucide-react"

// Strict TypeScript structure for Sivas Fire Department Citizen Service requests
interface CitizenRequest {
  id: string;
  talep_turu: string;
  basvuru_tarihi: string;
  basvuran_tc: string;
  basvuran_ad_soyad: string;
  irtibat_tel: string;
  adres: string;
  baca_detaylari?: {
    kat_sayisi?: number;
    daire_sayisi?: number;
    yakit_tipi?: string;
    baca_tipi?: string;
  };
  isyeri_detaylari?: {
    faaliyet_konusu?: string;
    alan_m2?: number;
    yangin_dolabi?: string;
    acil_cikis?: string;
    kisi_sayisi?: number;
    egitim_tarihi?: string;
    egitim_turu?: string;
  };
  durum: string;
  created_at: string;
  updated_at?: string;
  islem_yapan_amir?: string;
  atanan_ekip?: string;
  islem_tarihi?: string;
  red_gerekcesi?: string;
}

export default function HizmetlerPage() {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<CitizenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Details & Action Modal State
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)
  
  // Tactical action states inside modal
  const [tacticalMode, setTacticalMode] = useState<'NONE' | 'RED' | 'EKIP'>('NONE')
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedCrew, setSelectedCrew] = useState('Merkez İstasyonu A Grubu')

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newRequestForm, setNewRequestForm] = useState({
    talep_turu: 'Baca Temizliği',
    basvuran_ad_soyad: '',
    basvuran_tc: '',
    irtibat_tel: '',
    adres: '',
    // Baca detayları
    baca_kat_sayisi: '1',
    baca_daire_sayisi: '1',
    baca_yakit_tipi: 'Doğalgaz',
    baca_tipi: 'Standart Konut Bacası',
    // İşyeri detayları
    isyeri_faaliyet_konusu: '',
    isyeri_alan_m2: '100',
    isyeri_yangin_dolabi: 'Mevcut',
    isyeri_acil_cikis: '1 Adet',
    // Eğitim detayları
    egitim_tarihi: new Date().toISOString().split('T')[0],
    egitim_kisi_sayisi: '30',
    egitim_turu: 'Yangın Önleme ve Temel Yangın Eğitimi'
  })

  // Detect Müdür / Admin role
  const isMudur = user?.rol === 'Admin' || user?.unvan === 'Müdür' || user?.rol?.toLowerCase() === 'admin' || user?.unvan?.toLowerCase() === 'müdür'

  // Reset tactical menu when selectedRequest changes
  useEffect(() => {
    setTacticalMode('NONE')
    setRejectionReason('')
    setSelectedCrew('Merkez İstasyonu A Grubu')
  }, [selectedRequest])

  const resetForm = () => {
    setNewRequestForm({
      talep_turu: 'Baca Temizliği',
      basvuran_ad_soyad: '',
      basvuran_tc: '',
      irtibat_tel: '',
      adres: '',
      baca_kat_sayisi: '1',
      baca_daire_sayisi: '1',
      baca_yakit_tipi: 'Doğalgaz',
      baca_tipi: 'Standart Konut Bacası',
      isyeri_faaliyet_konusu: '',
      isyeri_alan_m2: '100',
      isyeri_yangin_dolabi: 'Mevcut',
      isyeri_acil_cikis: '1 Adet',
      egitim_tarihi: new Date().toISOString().split('T')[0],
      egitim_kisi_sayisi: '30',
      egitim_turu: 'Yangın Önleme ve Temel Yangın Eğitimi'
    })
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRequestForm.basvuran_ad_soyad || !newRequestForm.irtibat_tel || !newRequestForm.adres) {
      alert("Lütfen Ad Soyad, İrtibat Telefonu ve Adres alanlarını doldurun.")
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        talep_turu: newRequestForm.talep_turu,
        basvuru_tarihi: new Date().toISOString(),
        basvuran_tc: newRequestForm.basvuran_tc || '11111111111',
        basvuran_ad_soyad: newRequestForm.basvuran_ad_soyad,
        irtibat_tel: newRequestForm.irtibat_tel,
        adres: newRequestForm.adres,
        durum: 'BEKLEMEDE' as const,
        baca_detaylari: newRequestForm.talep_turu === 'Baca Temizliği' ? {
          kat_sayisi: Number(newRequestForm.baca_kat_sayisi) || 1,
          daire_sayisi: Number(newRequestForm.baca_daire_sayisi) || 1,
          yakit_tipi: newRequestForm.baca_yakit_tipi,
          baca_tipi: newRequestForm.baca_tipi
        } : undefined,
        isyeri_detaylari: newRequestForm.talep_turu === 'İtfaiye Uygunluk Raporu' ? {
          faaliyet_konusu: newRequestForm.isyeri_faaliyet_konusu || 'Genel Ticari Faaliyet',
          alan_m2: Number(newRequestForm.isyeri_alan_m2) || 100,
          yangin_dolabi: newRequestForm.isyeri_yangin_dolabi,
          acil_cikis: newRequestForm.isyeri_acil_cikis
        } : newRequestForm.talep_turu === 'Eğitim Talebi' ? {
          egitim_tarihi: newRequestForm.egitim_tarihi,
          kisi_sayisi: Number(newRequestForm.egitim_kisi_sayisi) || 30,
          egitim_turu: newRequestForm.egitim_turu
        } : undefined
      }

      const seedResult = await api.insert('citizen_requests', [payload])
      if (seedResult && !seedResult.error) {
        setIsCreateOpen(false)
        resetForm()
        await fetchRequests()
      } else {
        alert("Başvuru eklenirken bir veritabanı hatası oluştu: " + (seedResult?.error || 'Bilinmeyen Hata'))
      }
    } catch (err) {
      console.error('Create request error:', err)
      alert("Sistemsel bir hata oluştu.")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hizmet-yonetimi')
      const json = await res.json()
      if (json.success && json.requests) {
        setRequests(json.requests as CitizenRequest[])
      } else {
        console.error('Fetch requests error:', json.error)
      }
    } catch (err) {
      console.error('Fetch requests error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle tactical amir action via the new transaction-safe api route
  const handleTacticalAction = async (
    id: string, 
    newStatus: 'ONAYLANDI' | 'REDDEDİLDİ' | 'EKİP_ATANDI',
    extra?: { crew?: string; reason?: string }
  ) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/hizmet-onay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          durum: newStatus,
          islem_yapan_amir: user ? `${user.ad} ${user.soyad} (${user.sicilNo})` : 'Bilinmeyen Amir',
          atanan_ekip: extra?.crew || null,
          red_gerekcesi: extra?.reason || null
        })
      });
      const data = await res.json();
      
      if (data.success) {
        // 1. Refetch completely to update all dashboard statistics & counters
        await fetchRequests();
        
        // 2. Synchronize selectedRequest to immediately mirror updates inside modal
        setSelectedRequest(prev => {
          if (prev && prev.id === id) {
            return {
              ...prev,
              durum: newStatus,
              islem_yapan_amir: user ? `${user.ad} ${user.soyad} (${user.sicilNo})` : 'Bilinmeyen Amir',
              atanan_ekip: extra?.crew || undefined,
              red_gerekcesi: extra?.reason || undefined,
              islem_tarihi: new Date().toISOString()
            };
          }
          return prev;
        });

        // 3. Reset sub-actions
        setTacticalMode('NONE');
        setRejectionReason('');
      } else {
        alert('İşlem başarısız: ' + (data.error || 'Bilinmeyen Hata'));
      }
    } catch (err) {
      console.error('Tactical action error:', err)
      alert('Sistem bağlantı hatası oluştu.')
    } finally {
      setUpdating(null)
    }
  }

  // Calculated values for KPI Metrics
  const bacaCount = requests.filter(r => r.talep_turu.includes('Baca')).length
  const yanginCount = requests.filter(r => r.talep_turu.includes('Uygunluk') || r.talep_turu.includes('Ruhsat')).length
  const egitimCount = requests.filter(r => r.talep_turu.includes('Eğitim')).length
  
  // Total simulated revenue based on approved applications
  const revenue = requests
    .filter(r => {
      const d = r.durum ? r.durum.toUpperCase() : '';
      return d === 'ONAYLANDI' || d === 'ONAYLANDI';
    })
    .reduce((sum, r) => {
      if (r.talep_turu.includes('Baca')) return sum + 650
      if (r.talep_turu.includes('Eğitim')) return sum + 1200
      return sum + 2450 // İtfaiye Uygunluk Raporu / Ruhsat
    }, 0)

  // Assigned Crew mapping
  const getGorevliEkip = (req: CitizenRequest) => {
    if (req.atanan_ekip) return req.atanan_ekip;
    const d = req.durum ? req.durum.toUpperCase() : 'BEKLEMEDE';
    if (d === 'BEKLEMEDE' || d === 'BEKLIYOR') return 'Atanmadı'
    if (req.talep_turu.includes('Baca')) return 'B-Grubu Baca Ekibi'
    if (req.talep_turu.includes('Eğitim')) return 'Eğitim & Önleme Şefliği'
    return '1. Grup Denetim Ekibi'
  }

  // Fees and payment statuses
  const getHarcDurumu = (req: CitizenRequest) => {
    let fee = 2450
    if (req.talep_turu.includes('Baca')) fee = 650
    else if (req.talep_turu.includes('Eğitim')) fee = 1200

    const d = req.durum ? req.durum.toUpperCase() : 'BEKLEMEDE';
    if (d === 'BEKLEMEDE' || d === 'BEKLIYOR') {
      return { text: `Hesaplanmadı (₺${fee})`, color: 'text-slate-400 bg-slate-900/40 border-white/5' }
    }
    if (d === 'EKİP ATANDI' || d === 'EKİP_ATANDI') {
      return { text: `Hesaplandı (₺${fee})`, color: 'text-blue-400 bg-blue-950/40 border-blue-500/30' }
    }
    if (d === 'ONAYLANDI') {
      return { text: `Ödendi (₺${fee})`, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' }
    }
    if (d === 'REDDEDİLDİ') {
      return { text: `Red/İptal`, color: 'text-red-400 bg-red-950/40 border-red-500/30' }
    }
    return { text: `Muaf`, color: 'text-slate-400 bg-slate-900/40' }
  }

  // Tactical badge render mapping
  const getStatusBadge = (durum: string) => {
    const d = durum ? durum.toUpperCase() : 'BEKLEMEDE';
    switch (d) {
      case 'ONAYLANDI': 
        return <Badge className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold px-2.5 py-1 rounded-lg">Onaylandı</Badge>
      case 'EKİP ATANDI': 
      case 'EKİP_ATANDI':
        return <Badge className="bg-blue-950/40 border border-blue-500/30 text-blue-400 font-bold px-2.5 py-1 rounded-lg">Ekip Atandı</Badge>
      case 'REDDEDİLDİ':
        return <Badge className="bg-red-950/40 border border-red-500/30 text-red-400 font-bold px-2.5 py-1 rounded-lg">Reddedildi</Badge>
      case 'BEKLIYOR':
      case 'BEKLEMEDE':
      default: 
        return <Badge className="bg-slate-800 border border-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded-lg">Bekliyor</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse flex items-center justify-center gap-2 min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" /> 
        <span className="text-muted-foreground font-semibold">Vatandaş Hizmetleri Yükleniyor...</span>
      </div>
    )
  }

  return (
    <PageGuard pageId="hizmet_basvurulari">
      <div className="flex flex-col min-h-screen overflow-y-auto space-y-6 max-w-7xl mx-auto pb-24 animate-in fade-in duration-300">
        
        {/* Sayfa Başlığı */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Vatandaş Hizmetleri ve Başvuru Yönetimi</h1>
            <p className="text-muted-foreground text-sm mt-1">Sivas İtfaiyesi Baca Temizliği, İtfaiye Uygunluk Raporu ve Eğitim Talepleri Resmi İş Akışı</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 h-9 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 hover:scale-[1.02] transition duration-150 shrink-0"
              onClick={() => setIsCreateOpen(true)}
            >
              <FilePlus className="w-4 h-4" /> Yeni Başvuru Ekle
            </Button>
            {isMudur ? (
              <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black px-3 py-1 text-xs">
                Müdür Yetki Modu
              </Badge>
            ) : (
              <Badge className="bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold px-3 py-1 text-xs">
                Salt Okunur (Read-Only)
              </Badge>
            )}
          </div>
        </div>

        {/* 1. Üst Özet KPI Kartları (Glassmorphic) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Baca Temizliği */}
          <Card className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-blue-500/20 transition duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:scale-110 transition duration-500">
              <Brush className="w-24 h-24" />
            </div>
            <CardContent className="p-0 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Baca Temizliği</span>
                <h3 className="text-2xl font-black text-blue-400">{bacaCount} Başvuru</h3>
                <p className="text-[10px] text-zinc-500">Sivas geneli konut/ticari baca talepleri</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <Brush className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Yangın Önlem / Ruhsat */}
          <Card className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-yellow-500/20 transition duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-yellow-500 group-hover:scale-110 transition duration-500">
              <ShieldCheck className="w-24 h-24" />
            </div>
            <CardContent className="p-0 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Yangın Önlem / Ruhsat</span>
                <h3 className="text-2xl font-black text-yellow-400">{yanginCount} Rapor</h3>
                <p className="text-[10px] text-zinc-500">İtfaiye uygunluk ve ruhsat onay süreci</p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Eğitim Talepleri */}
          <Card className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-purple-500/20 transition duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-purple-500 group-hover:scale-110 transition duration-500">
              <GraduationCap className="w-24 h-24" />
            </div>
            <CardContent className="p-0 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Eğitim Talepleri</span>
                <h3 className="text-2xl font-black text-purple-400">{egitimCount} Talep</h3>
                <p className="text-[10px] text-zinc-500">Kurumsal ve okul afet bilinç eğitimleri</p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                <GraduationCap className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Vezne / Tahsilat */}
          <Card className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-emerald-500/20 transition duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:scale-110 transition duration-500">
              <CreditCard className="w-24 h-24" />
            </div>
            <CardContent className="p-0 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Vezne / Tahsilat</span>
                <h3 className="text-2xl font-black text-emerald-400">₺{revenue.toLocaleString('tr-TR')}</h3>
                <p className="text-[10px] text-zinc-500">Onaylanan başvurulardan tahsil edilen harç</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Resmi İş Akışı ve Kurumsal Tablo Düzenlemesi */}
        <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/10 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> AKTİF BAŞVURULAR VERİ GRİDİ
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Veritabanından anlık çekilen resmi vatandaş/kurum hizmet kayıtları</p>
              </div>
              <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-500 px-2.5 py-1 rounded-md">
                TOPLAM KAYIT: {requests.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto scrollbar-thin">
            {requests.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground bg-zinc-950/20">
                Sistemde henüz bir hizmet başvurusu bulunmamaktadır.
              </div>
            ) : (
              <table className="w-full min-w-[1000px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                    <th className="p-4 text-left">Başvuran / Kurum Adı</th>
                    <th className="p-4 text-left">Hizmet Türü</th>
                    <th className="p-4 text-left">Başvuru Tarihi</th>
                    <th className="p-4 text-left">Görevli Ekip</th>
                    <th className="p-4 text-left">Harç Durumu</th>
                    <th className="p-4 text-left">İşlem Durumu</th>
                    <th className="p-4 text-right">İşlemler / Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {requests.map(req => {
                    const feeObj = getHarcDurumu(req)
                    return (
                      <tr key={req.id} className="hover:bg-zinc-900/30 transition duration-150 group">
                        <td className="p-4 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:scale-105 transition shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-200 block text-sm line-clamp-1">{req.basvuran_ad_soyad}</span>
                              <span className="text-[10px] text-zinc-500 font-mono block">TC: {req.basvuran_tc || 'Girilmemeş'}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              req.talep_turu.includes('Baca') ? 'text-blue-400 bg-blue-500/10' :
                              req.talep_turu.includes('Eğitim') ? 'text-purple-400 bg-purple-500/10' :
                              'text-yellow-400 bg-yellow-500/10'
                            }`}>
                              {req.talep_turu.includes('Baca') ? <Brush className="w-3.5 h-3.5" /> :
                               req.talep_turu.includes('Eğitim') ? <GraduationCap className="w-3.5 h-3.5" /> :
                               <ShieldCheck className="w-3.5 h-3.5" />}
                            </div>
                            <span className="font-semibold text-zinc-300">{req.talep_turu}</span>
                          </div>
                        </td>

                        <td className="p-4 align-middle text-zinc-400 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                            {new Date(req.basvuru_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        <td className="p-4 align-middle font-bold text-xs text-zinc-400 whitespace-nowrap">
                          <span className={(!req.atanan_ekip && (req.durum === 'BEKLEMEDE' || req.durum === 'Bekliyor')) ? 'text-zinc-600 font-normal italic' : 'text-zinc-300'}>
                            {getGorevliEkip(req)}
                          </span>
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${feeObj.color}`}>
                            {feeObj.text}
                          </span>
                        </td>

                        <td className="p-4 align-middle whitespace-nowrap">
                          {getStatusBadge(req.durum)}
                        </td>

                        <td className="p-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isMudur ? (
                              <Button 
                                size="sm" 
                                className="bg-cyan-600/90 hover:bg-cyan-500 text-white font-black text-xs px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition duration-150 border border-cyan-400/20 whitespace-nowrap"
                                onClick={() => setSelectedRequest(req)}
                                disabled={updating === req.id}
                              >
                                {updating === req.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>🔧 İşlem Yap</>
                                )}
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition duration-150 border border-slate-700 whitespace-nowrap"
                                onClick={() => setSelectedRequest(req)}
                                disabled={updating === req.id}
                              >
                                {updating === req.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>🔍 İncele</>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Premium Amir Taktik Operasyon Modalı */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
              <CardHeader className="bg-slate-900/40 border-b border-slate-800/80 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black text-indigo-100 uppercase tracking-wider">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    {isMudur ? "AMİR TAKTİK OPERASYON PANELİ" : "BAŞVURU DETAY PANELİ"}
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Takip Kodu / ID: <span className="text-cyan-400">{selectedRequest.basvuran_tc || selectedRequest.id}</span>
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400 hover:text-white rounded-lg h-9 w-9 p-0 flex items-center justify-center"
                  onClick={() => setSelectedRequest(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin">
                {/* 1. Üst Canlı Durum ve Bilgiler */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Mevcut İşlem Durumu</span>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedRequest.durum)}
                    </div>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Vezne / Harç Durumu</span>
                    <span className="text-xs font-black inline-flex items-center px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-400 bg-emerald-950/20">
                      {getHarcDurumu(selectedRequest).text}
                    </span>
                  </div>
                  {selectedRequest.islem_yapan_amir && (
                    <div className="col-span-1 sm:col-span-2 border-t border-slate-800/40 pt-2 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500 font-medium block">Onaylayan/İşlem Yapan Amir</span>
                        <span className="text-zinc-300 font-bold flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" /> {selectedRequest.islem_yapan_amir}
                        </span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-zinc-500 font-medium block">İşlem Zaman Damgası</span>
                        <span className="text-zinc-300 font-mono font-bold block mt-0.5">
                          {selectedRequest.islem_tarihi ? new Date(selectedRequest.islem_tarihi).toLocaleString('tr-TR') : '-'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Vatandaş Bilgileri */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-zinc-400 border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-400" /> Vatandaş / Başvuran Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-900/20 p-4 rounded-xl border border-slate-900/60">
                    <div>
                      <span className="text-zinc-500 block text-xs">Kimlik / Takip Kodu</span>
                      <span className="font-bold text-zinc-300 font-mono">{selectedRequest.basvuran_tc || '-'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-xs">Ad Soyad / Unvan</span>
                      <span className="font-bold text-zinc-200">{selectedRequest.basvuran_ad_soyad}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-xs">İrtibat Numarası</span>
                      <span className="font-bold text-zinc-300 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" /> {selectedRequest.irtibat_tel}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-xs">Oluşturma Tarihi</span>
                      <span className="font-bold text-zinc-300 font-mono">
                        {new Date(selectedRequest.basvuru_tarihi).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-zinc-500 block text-xs">Müdahale / Hizmet Adresi</span>
                      <span className="font-semibold text-zinc-300 flex items-start gap-1.5 mt-1 leading-relaxed">
                        <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" /> 
                        {selectedRequest.adres}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Teknik JSONB Detayları */}
                {selectedRequest.talep_turu === 'Baca Temizliği' && selectedRequest.baca_detaylari && (
                  <div className="space-y-3 bg-blue-950/20 p-4 rounded-xl border border-blue-950/40">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-blue-400 border-b border-blue-500/20 pb-1.5 flex items-center gap-1.5">
                      <Brush className="w-4 h-4" /> Baca Temizlik Teknik Detayları
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {Object.entries(selectedRequest.baca_detaylari).map(([key, val]) => (
                        <div key={key} className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                          <span className="text-zinc-500 block text-[10px] uppercase tracking-wide font-bold">{key.replace('_', ' ')}</span>
                          <span className="font-bold text-zinc-300 mt-0.5 block">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRequest.talep_turu === 'İtfaiye Uygunluk Raporu' && selectedRequest.isyeri_detaylari && (
                  <div className="space-y-3 bg-yellow-950/20 p-4 rounded-xl border border-yellow-950/40">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-yellow-400 border-b border-yellow-500/20 pb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> İşyeri Yangın Güvenlik Detayları
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {Object.entries(selectedRequest.isyeri_detaylari).map(([key, val]) => (
                        <div key={key} className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                          <span className="text-zinc-500 block text-[10px] uppercase tracking-wide font-bold">{key.replace('_', ' ')}</span>
                          <span className="font-bold text-zinc-300 mt-0.5 block">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRequest.talep_turu === 'Eğitim Talebi' && selectedRequest.isyeri_detaylari && (
                  <div className="space-y-3 bg-purple-950/20 p-4 rounded-xl border border-purple-950/40">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-purple-400 border-b border-purple-500/20 pb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" /> Eğitim ve Tatbikat Organizasyon Detayları
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {Object.entries(selectedRequest.isyeri_detaylari).map(([key, val]) => (
                        <div key={key} className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                          <span className="text-zinc-500 block text-[10px] uppercase tracking-wide font-bold">{key.replace('_', ' ')}</span>
                          <span className="font-bold text-zinc-300 mt-0.5 block">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. İşlem Geçmişi (Eğer atanmış veya reddedilmişse) */}
                {selectedRequest.durum === 'REDDEDİLDİ' && selectedRequest.red_gerekcesi && (
                  <div className="bg-red-950/20 p-4 rounded-xl border border-red-500/20 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <span className="font-bold text-red-400 uppercase tracking-wide text-xs">Talebin Red Gerekçesi</span>
                      <p className="text-zinc-300 leading-relaxed font-medium">{selectedRequest.red_gerekcesi}</p>
                    </div>
                  </div>
                )}

                {selectedRequest.atanan_ekip && (
                  <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-500/20 flex items-start gap-2.5">
                    <UserCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <span className="font-bold text-blue-400 uppercase tracking-wide text-xs">Müdahale Edecek İstasyon / Ekip</span>
                      <p className="text-zinc-300 leading-relaxed font-bold">{selectedRequest.atanan_ekip}</p>
                    </div>
                  </div>
                )}

                {/* 5. Müdür Siber Operasyon Menüsü */}
                {isMudur ? (
                  <div className="space-y-3 pt-5 border-t border-slate-900">
                    <h3 className="font-black text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" /> SİBER OPERASYONEL AKSİYON KONTROLLERİ
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 bg-slate-900/30 p-3.5 rounded-xl border border-slate-800/80">
                      
                      {/* Onayla Button */}
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1 hover:scale-[1.02] transition"
                        onClick={() => handleTacticalAction(selectedRequest.id, 'ONAYLANDI')}
                        disabled={updating === selectedRequest.id}
                      >
                        🟢 ONAYLA
                      </Button>
                      
                      {/* Reddet Trigger Button */}
                      <Button 
                        variant="outline"
                        size="sm" 
                        className={`border-red-900/50 text-red-400 hover:text-white hover:bg-red-950/50 font-bold text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1 ${
                          tacticalMode === 'RED' ? 'bg-red-950/80 text-white' : ''
                        }`}
                        onClick={() => setTacticalMode(prev => prev === 'RED' ? 'NONE' : 'RED')}
                        disabled={updating === selectedRequest.id}
                      >
                        🔴 REDDET
                      </Button>
                      
                      {/* Ekibe Ata Trigger Button */}
                      <Button 
                        variant="outline"
                        size="sm" 
                        className={`border-blue-900/50 text-blue-400 hover:text-white hover:bg-blue-950/50 font-bold text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1 ${
                          tacticalMode === 'EKIP' ? 'bg-blue-950/80 text-white' : ''
                        }`}
                        onClick={() => setTacticalMode(prev => prev === 'EKIP' ? 'NONE' : 'EKIP')}
                        disabled={updating === selectedRequest.id}
                      >
                        🔵 EKİBE ATA
                      </Button>

                      {updating === selectedRequest.id && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold ml-2">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Güncelleniyor...
                        </div>
                      )}
                    </div>

                    {/* Sub-Action: Rejection Form */}
                    {tacticalMode === 'RED' && (
                      <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/10 space-y-3 animate-in slide-in-from-top duration-200">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-wide block">Talebi Red Gerekçesi Giriniz</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            className="flex-1 bg-slate-900 border border-slate-800 text-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 font-medium"
                            placeholder="Gerekçenizi yazın amirim..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold h-9"
                            disabled={!rejectionReason || updating === selectedRequest.id}
                            onClick={() => handleTacticalAction(selectedRequest.id, 'REDDEDİLDİ', { reason: rejectionReason })}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" /> Reddet
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Sub-Action: Crew Assignment Dropdown */}
                    {tacticalMode === 'EKIP' && (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/10 space-y-3 animate-in slide-in-from-top duration-200">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wide block">Görevlendirilecek Aktif İtfaiye İstasyonu / Ekibi</label>
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            className="bg-slate-950 border border-slate-800 text-zinc-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold h-9 min-w-[200px]"
                            value={selectedCrew}
                            onChange={(e) => setSelectedCrew(e.target.value)}
                          >
                            <option value="Merkez İstasyonu A Grubu">Merkez İstasyonu A Grubu</option>
                            <option value="Merkez İstasyonu B Grubu">Merkez İstasyonu B Grubu</option>
                            <option value="Esentepe Müfrezesi A Grubu">Esentepe Müfrezesi A Grubu</option>
                            <option value="Esentepe Müfrezesi B Grubu">Esentepe Müfrezesi B Grubu</option>
                            <option value="Organize Sanayi Müfrezesi">Organize Sanayi Müfrezesi</option>
                          </select>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-9"
                            disabled={updating === selectedRequest.id}
                            onClick={() => handleTacticalAction(selectedRequest.id, 'EKİP_ATANDI', { crew: selectedCrew })}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" /> Atamayı Kesinleştir
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-900 bg-slate-900/10 p-4 rounded-xl flex items-start gap-2.5 border border-slate-800">
                    <HelpCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-zinc-400">Salt Okunur Bilgi Modu</span>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Müdür yetki seviyesi dışındaki personel seviyeleri sadece başvuru detaylarını görüntüleyebilir. 
                        Herhangi bir onaylama, gerekçeli reddetme veya ekip atama yetkiniz bulunmamaktadır.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 my-8">
              <CardHeader className="bg-zinc-900/40 border-b border-zinc-800/80 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black text-indigo-100">
                    <FilePlus className="w-5 h-5 text-indigo-400" /> YENİ BAŞVURU OLUŞTURMA PANELİ
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">Sivas Belediyesi İtfaiye Müdürlüğü Resmi Vatandaş Hizmet Girişi</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400 hover:text-white"
                  onClick={() => {
                    setIsCreateOpen(false)
                    resetForm()
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              <form onSubmit={handleCreateRequest}>
                <CardContent className="p-6 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-thin">
                  {/* Başvuru Türü Seçimi */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Hizmet / Talep Türü <span className="text-red-500">*</span></label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold transition"
                      value={newRequestForm.talep_turu}
                      onChange={(e) => setNewRequestForm(prev => ({ ...prev, talep_turu: e.target.value }))}
                    >
                      <option value="Baca Temizliği">Baca Temizliği (Harç: ₺650)</option>
                      <option value="İtfaiye Uygunluk Raporu">İtfaiye Uygunluk Raporu (Harç: ₺2450)</option>
                      <option value="Eğitim Talebi">Eğitim Talebi (Harç: ₺1200)</option>
                    </select>
                  </div>

                  {/* Genel Vatandaş Bilgileri */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-zinc-200 border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-400" /> Vatandaş / Kurum Genel Bilgileri
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 block">T.C. Kimlik / Vergi No</label>
                        <input
                          type="text"
                          maxLength={11}
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                          placeholder="11 Haneli T.C. veya Vergi No"
                          value={newRequestForm.basvuran_tc}
                          onChange={(e) => setNewRequestForm(prev => ({ ...prev, basvuran_tc: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 block">Ad Soyad / Kurum Adı <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                          placeholder="Örn: Ahmet Yılmaz veya Yıldız A.Ş."
                          value={newRequestForm.basvuran_ad_soyad}
                          onChange={(e) => setNewRequestForm(prev => ({ ...prev, basvuran_ad_soyad: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-zinc-400 block">İrtibat Telefon Numarası <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                          placeholder="Örn: 0555 123 4567"
                          value={newRequestForm.irtibat_tel}
                          onChange={(e) => setNewRequestForm(prev => ({ ...prev, irtibat_tel: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-zinc-400 block">Müdahale / Hizmet Adresi <span className="text-red-500">*</span></label>
                        <textarea
                          required
                          rows={3}
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium resize-none"
                          placeholder="Hizmetin ifa edileceği detaylı adres..."
                          value={newRequestForm.adres}
                          onChange={(e) => setNewRequestForm(prev => ({ ...prev, adres: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dinamik Teknik Bilgiler (Talep Türüne Göre) */}
                  {newRequestForm.talep_turu === 'Baca Temizliği' && (
                    <div className="space-y-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                      <h3 className="font-bold text-sm text-blue-400 border-b border-blue-500/20 pb-1.5 flex items-center gap-1.5">
                        <Brush className="w-4 h-4" /> Baca Temizlik Teknik Detayları
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Bina Kat Sayısı</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                            value={newRequestForm.baca_kat_sayisi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, baca_kat_sayisi: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Daire Sayısı</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                            value={newRequestForm.baca_daire_sayisi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, baca_daire_sayisi: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Yakıt Tipi</label>
                          <select
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            value={newRequestForm.baca_yakit_tipi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, baca_yakit_tipi: e.target.value }))}
                          >
                            <option value="Doğalgaz">Doğalgaz</option>
                            <option value="Kömür / Odun">Kömür / Odun</option>
                            <option value="LPG / Fuel-Oil">LPG / Fuel-Oil</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-3">
                          <label className="text-xs font-bold text-zinc-400 block">Baca Türü / Açıklaması</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                            placeholder="Standart Konut Bacası, Restoran Davlumbaz Bacası vb."
                            value={newRequestForm.baca_tipi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, baca_tipi: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {newRequestForm.talep_turu === 'İtfaiye Uygunluk Raporu' && (
                    <div className="space-y-4 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10">
                      <h3 className="font-bold text-sm text-yellow-400 border-b border-yellow-500/20 pb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> İşyeri Yangın Güvenlik Detayları
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Faaliyet Konusu</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            placeholder="Fırın, İmalathane, Kafe vb."
                            value={newRequestForm.isyeri_faaliyet_konusu}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, isyeri_faaliyet_konusu: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Kapalı Alan (m²)</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                            value={newRequestForm.isyeri_alan_m2}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, isyeri_alan_m2: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Yangın Dolabı Durumu</label>
                          <select
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            value={newRequestForm.isyeri_yangin_dolabi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, isyeri_yangin_dolabi: e.target.value }))}
                          >
                            <option value="Mevcut">Mevcut</option>
                            <option value="Mevcut Değil / Eksik">Mevcut Değil / Eksik</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Acil Çıkış Kapısı Sayısı</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                            placeholder="Örn: 2 Adet Yangın Kapısı"
                            value={newRequestForm.isyeri_acil_cikis}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, isyeri_acil_cikis: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {newRequestForm.talep_turu === 'Eğitim Talebi' && (
                    <div className="space-y-4 bg-purple-500/5 p-4 rounded-xl border border-purple-500/10">
                      <h3 className="font-bold text-sm text-purple-400 border-b border-purple-500/20 pb-1.5 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" /> Eğitim / Tatbikat Teknik Detayları
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Planlanan Eğitim Tarihi</label>
                          <input
                            type="date"
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            value={newRequestForm.egitim_tarihi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, egitim_tarihi: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Tahmini Katılımcı Sayısı</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                            value={newRequestForm.egitim_kisi_sayisi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, egitim_kisi_sayisi: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Eğitim Kapsamı / Türü</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            placeholder="Yangın Tahliye, SCBA vb."
                            value={newRequestForm.egitim_turu}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, egitim_turu: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>

                <div className="bg-zinc-900/40 border-t border-zinc-800/80 p-5 flex items-center justify-end gap-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/60 font-semibold px-4 py-2 rounded-xl text-xs"
                    onClick={() => {
                      setIsCreateOpen(false)
                      resetForm()
                    }}
                  >
                    Vazgeç
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Başvuruyu Kaydet
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </PageGuard>
  )
}
