"use client"

import { useState, useEffect, useMemo } from "react"
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
  User, 
  Phone, 
  Brush,
  ShieldCheck,
  CreditCard,
  Calendar,
  X,
  FilePlus,
  AlertTriangle,
  Trash2,
  Plus,
  Search,
} from "lucide-react"

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
    yangin_nedeni?: string;
    bina_tipi?: string;
  };
  durum: string;
  created_at: string;
  updated_at?: string;
  islem_yapan_amir?: string;
  atanan_ekip?: string;
  islem_tarihi?: string;
  red_gerekcesi?: string;
  takip_kodu?: string;
}

export default function HizmetlerPage() {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<CitizenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

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
  })

  // Filter out any Training (Eğitim) requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // Must not contain "Eğitim" in talep_turu
      const isTraining = r.talep_turu.toLowerCase().includes("eğitim") || r.talep_turu.toLowerCase().includes("egitim")
      if (isTraining) return false

      if (searchTerm.trim() !== '') {
        const s = searchTerm.toLowerCase()
        return (
          r.basvuran_ad_soyad.toLowerCase().includes(s) ||
          (r.basvuran_tc || '').toLowerCase().includes(s) ||
          r.talep_turu.toLowerCase().includes(s) ||
          r.adres.toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [requests, searchTerm])

  // Detect Müdür / Admin / Amir role
  const isMudur = user?.rol === 'Admin' || user?.unvan === 'Müdür' || user?.unvan === 'Amir' || user?.rol?.toLowerCase() === 'admin' || user?.unvan?.toLowerCase() === 'müdür' || user?.unvan?.toLowerCase() === 'amir'

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

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleTacticalAction = async (
    id: string, 
    newStatus: 'ONAYLANDI' | 'REDDEDİLDİ' | 'EKİP_ATANDI',
    extra?: { crew?: string; reason?: string }
  ) => {
    setUpdating(id)
    try {
      const amirStr = user ? `${user.ad} ${user.soyad} (${user.sicilNo || 'Amir'})` : 'Bilinmeyen Amir'
      const res = await fetch('/api/hizmet-onay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          durum: newStatus,
          islem_yapan_amir: amirStr,
          atanan_ekip: extra?.crew || null,
          red_gerekcesi: extra?.reason || null
        })
      });
      const data = await res.json();
      
      if (data.success) {
        await fetchRequests();
        setSelectedRequest(prev => {
          if (prev && prev.id === id) {
            return {
              ...prev,
              durum: newStatus,
              islem_yapan_amir: amirStr,
              atanan_ekip: extra?.crew || undefined,
              red_gerekcesi: extra?.reason || undefined,
              islem_tarihi: new Date().toISOString()
            };
          }
          return prev;
        });

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

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm("Bu başvuruyu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return
    }
    setUpdating(id)
    try {
      const res = await fetch(`/api/hizmet-onay?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setRequests(prev => prev.filter(r => r.id !== id))
        if (selectedRequest?.id === id) {
          setSelectedRequest(null)
        }
      } else {
        alert('Silme işlemi başarısız: ' + (data.error || 'Bilinmeyen Hata'))
      }
    } catch (err) {
      console.error('Delete request error:', err)
      alert('Silme işlemi sırasında sistemsel bir hata oluştu.')
    } finally {
      setUpdating(null)
    }
  }

  // Calculated values for KPI Metrics (excluding training)
  const bacaCount = useMemo(() => requests.filter(r => r.talep_turu.includes('Baca')).length, [requests])
  const yanginCount = useMemo(() => requests.filter(r => r.talep_turu.includes('Uygunluk') || r.talep_turu.includes('Ruhsat') || r.talep_turu.includes('Yangın Raporu')).length, [requests])
  
  // Total simulated revenue based on approved applications
  const revenue = useMemo(() => {
    return requests
      .filter(r => {
        const d = r.durum ? r.durum.toUpperCase() : '';
        return d === 'ONAYLANDI';
      })
      .reduce((sum, r) => {
        if (r.talep_turu.includes('Baca')) return sum + 650
        return sum + 2450 // İtfaiye Uygunluk Raporu / Ruhsat
      }, 0)
  }, [requests])

  // Assigned Crew mapping
  const getGorevliEkip = (req: CitizenRequest) => {
    if (req.atanan_ekip) return req.atanan_ekip;
    const d = req.durum ? req.durum.toUpperCase() : 'BEKLEMEDE';
    if (d === 'BEKLEMEDE' || d === 'BEKLIYOR') return 'Atanmadı'
    if (req.talep_turu.includes('Baca')) return 'B-Grubu Baca Ekibi'
    return '1. Grup Denetim Ekibi'
  }

  // Fees and payment statuses
  const getHarcDurumu = (req: CitizenRequest) => {
    let fee = 2450
    if (req.talep_turu.includes('Baca')) fee = 650

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
        return <Badge className="bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)] font-bold px-2.5 py-1 rounded-lg">Onaylandı</Badge>
      case 'EKİP ATANDI': 
      case 'EKİP_ATANDI':
        return <Badge className="bg-blue-950/40 border border-blue-500/30 text-blue-400 font-bold px-2.5 py-1 rounded-lg">Ekip Atandı</Badge>
      case 'REDDEDİLDİ':
        return <Badge className="bg-red-950/30 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.05)] font-bold px-2.5 py-1 rounded-lg">Reddedildi</Badge>
      case 'BEKLIYOR':
      case 'BEKLEMEDE':
      default: 
        return <Badge className="bg-amber-950/30 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.05)] font-bold px-2.5 py-1 rounded-lg">Bekliyor</Badge>
    }
  }

  // Dilekçe Generator
  const generateDilekce = (req: CitizenRequest) => {
    const tarih = new Date(req.basvuru_tarihi).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const now = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    let konuText = '';
    let govdeText = '';
    let teknikBilgi = '';

    if (req.talep_turu.includes('Baca')) {
      konuText = 'Baca Temizliği Hizmet Talebi Hk.';
      govdeText = `Aşağıda bilgileri verilen adresimde bulunan binanın baca temizliğinin yapılmasını talep ediyorum. Gerekli harç bedelinin tarafıma bildirilmesi halinde ödemeyi yapmayı kabul ve taahhüt ederim.`;
      if (req.baca_detaylari) {
        const bd = req.baca_detaylari;
        teknikBilgi = `
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Kat Sayısı</td><td style="padding:6px 12px;border:1px solid #ccc;">${bd.kat_sayisi || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Daire Sayısı</td><td style="padding:6px 12px;border:1px solid #ccc;">${bd.daire_sayisi || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Yakıt Tipi</td><td style="padding:6px 12px;border:1px solid #ccc;">${bd.yakit_tipi || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Baca Tipi</td><td style="padding:6px 12px;border:1px solid #ccc;">${bd.baca_tipi || '-'}</td></tr>
        `;
      }
    } else {
      konuText = 'İtfaiye Uygunluk (Olur) Raporu Talebi Hk.';
      govdeText = `Aşağıda bilgileri verilen işyerimiz için İtfaiye Uygunluk (Olur) Raporu düzenlenmesini talep ediyorum. Ruhsat işlemleri kapsamında gerekli denetimlerin yapılmasını ve raporun tarafıma teslim edilmesini arz ederim.`;
      if (req.isyeri_detaylari) {
        const id = req.isyeri_detaylari;
        teknikBilgi = `
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Faaliyet Konusu</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.faaliyet_konusu || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Kapalı Alan (m²)</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.alan_m2 || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Yangın Dolabı</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.yangin_dolabi || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Acil Çıkış</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.acil_cikis || '-'}</td></tr>
        `;
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Dilekçe - ${req.basvuran_ad_soyad} - ${req.talep_turu}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm 25mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', 'Noto Serif', serif;
      font-size: 13pt;
      line-height: 1.7;
      color: #1a1a1a;
      padding: 60px 50px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px double #333; padding-bottom: 20px; }
    .header h1 { font-size: 16pt; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
    .header h2 { font-size: 13pt; font-weight: 700; color: #444; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 11pt; }
    .meta-row .left { text-align: left; }
    .meta-row .right { text-align: right; }
    .konu { margin-bottom: 25px; }
    .konu strong { font-size: 12pt; text-decoration: underline; }
    .govde { text-align: justify; text-indent: 40px; margin-bottom: 30px; }
    .bilgi-tablosu { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11pt; }
    .bilgi-tablosu th { background: #f0f0f0; padding: 8px 12px; border: 1px solid #ccc; text-align: left; font-weight: 700; }
    .bilgi-tablosu td { padding: 6px 12px; border: 1px solid #ccc; }
    .section-title { font-size: 11pt; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .imza { margin-top: 60px; text-align: right; }
    .imza p { margin-bottom: 4px; }
    .imza .ad { font-weight: 700; font-size: 13pt; }
    .ek-bilgi { margin-top: 50px; font-size: 10pt; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:20px;">
    <button onclick="window.print()" style="padding:12px 32px;font-size:14px;font-weight:700;background:#1e40af;color:white;border:none;border-radius:8px;cursor:pointer;">🖨️ Yazdır / PDF Olarak Kaydet</button>
  </div>

  <div class="header">
    <h1>T.C. SİVAS BELEDİYESİ</h1>
    <h2>İtfaiye Müdürlüğü'ne</h2>
  </div>

  <div class="meta-row">
    <div class="left">
      <strong>Takip Kodu:</strong> ${req.takip_kodu || req.basvuran_tc || req.id}<br/>
      <strong>Başvuru Tarihi:</strong> ${tarih}
    </div>
    <div class="right">
      <strong>Belge Tarihi:</strong> ${now}
    </div>
  </div>

  <div class="konu">
    <strong>Konu:</strong> ${konuText}
  </div>

  <div class="govde">
    <p>${govdeText}</p>
    <p style="margin-top:10px;">Gereğini saygılarımla arz ederim.</p>
  </div>

  <p class="section-title">Başvuran Bilgileri</p>
  <table class="bilgi-tablosu">
    <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;width:200px;">Ad Soyad</td><td style="padding:6px 12px;border:1px solid #ccc;">${req.basvuran_ad_soyad}</td></tr>
    <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Takip Kodu</td><td style="padding:6px 12px;border:1px solid #ccc;">${req.takip_kodu || req.basvuran_tc || req.id}</td></tr>
    <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">T.C. Kimlik No</td><td style="padding:6px 12px;border:1px solid #ccc;">${(req.basvuran_tc && !req.basvuran_tc.startsWith('SVS-')) ? req.basvuran_tc : 'Girilmemiş'}</td></tr>
    <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">İrtibat Telefonu</td><td style="padding:6px 12px;border:1px solid #ccc;">${req.irtibat_tel}</td></tr>
    <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Hizmet Adresi</td><td style="padding:6px 12px;border:1px solid #ccc;">${req.adres}</td></tr>
    <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Hizmet Türü</td><td style="padding:6px 12px;border:1px solid #ccc;">${req.talep_turu}</td></tr>
  </table>

  ${teknikBilgi ? `
  <p class="section-title">Teknik Detaylar</p>
  <table class="bilgi-tablosu">
    ${teknikBilgi}
  </table>
  ` : ''}

  <div class="imza">
    <p>${tarih}</p>
    <p class="ad">${req.basvuran_ad_soyad}</p>
    <p style="font-size:10pt;color:#666;">İmza</p>
  </div>

  <div class="ek-bilgi">
    <strong>Not:</strong> Bu dilekçe, Sivas Belediyesi İtfaiye Müdürlüğü Bilgi Yönetim Sistemi üzerinden
    otomatik olarak oluşturulmuştur. Başvuru kaydı veritabanında saklanmaktadır.
    <br/><strong>Sistem Kayıt ID:</strong> ${req.id} &nbsp;|&nbsp; <strong>Oluşturma:</strong> ${new Date(req.created_at || req.basvuru_tarihi).toLocaleString('tr-TR')}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dilekce_${req.basvuran_ad_soyad.replace(/\s+/g, '_')}_${req.talep_turu.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

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
      <div className="flex flex-col min-h-screen space-y-6 max-w-7xl mx-auto pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8 animate-in fade-in duration-300">
        
        {/* Sayfa Başlığı */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Vatandaş Hizmetleri ve Başvuru Yönetimi</h1>
            <p className="text-muted-foreground text-sm mt-1">Sivas İtfaiyesi Baca Temizliği ve İtfaiye Uygunluk Raporu Resmi İş Akışı</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Baca Temizliği */}
          <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-4 rounded-xl relative overflow-hidden group hover:border-blue-500/20 transition duration-300">
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
          <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-4 rounded-xl relative overflow-hidden group hover:border-yellow-500/20 transition duration-300">
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

          {/* Vezne / Tahsilat */}
          <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-4 rounded-xl relative overflow-hidden group hover:border-emerald-500/20 transition duration-300">
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

        {/* Arama Barı */}
        <div className="flex items-center bg-slate-950/75 border border-slate-800/60 rounded-xl px-3.5 py-2">
          <Search className="w-4 h-4 text-zinc-400 mr-2" />
          <input
            type="text"
            className="bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-500 text-sm w-full"
            placeholder="Başvuran adı, TC no, adres veya hizmet türüne göre arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 3. Başvurular Veri Gridi */}
        <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/10 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> AKTİF BAŞVURULAR VERİ GRİDİ
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Veritabanından anlık çekilen resmi vatandaş hizmet kayıtları</p>
              </div>
              <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-500 px-2.5 py-1 rounded-md">
                FİLTRELENMİŞ KAYIT: {filteredRequests.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRequests.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground bg-zinc-950/20">
                Sistemde uygun bir hizmet başvurusu bulunmamaktadır.
              </div>
            ) : (
              <>
                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                        <th className="p-4 text-left">Başvuran / Kurum Adı</th>
                        <th className="p-4 text-left">Hizmet Türü</th>
                        <th className="p-4 text-left">Başvuru Tarihi</th>
                        <th className="p-4 text-left">Görevli Ekip</th>
                        <th className="p-4 text-left">Harç Durumu</th>
                        <th className="p-4 text-left">İşlem Durumu</th>
                        <th className="p-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {filteredRequests.map(req => {
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
                                  <span className="text-[10px] text-zinc-500 font-mono block">TC: {req.basvuran_tc || 'Girilmemiş'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md ${req.talep_turu.includes('Baca') ? 'text-blue-400 bg-blue-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                                  {req.talep_turu.includes('Baca') ? <Brush className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
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
                              <span className={`px-2.5 py-1 text-[11px] font-black rounded-md border ${feeObj.color}`}>
                                {feeObj.text}
                              </span>
                            </td>
                            <td className="p-4 align-middle whitespace-nowrap">
                              {getStatusBadge(req.durum)}
                            </td>
                            <td className="p-4 align-middle text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-[11px] font-bold text-indigo-400 hover:text-white hover:bg-indigo-600/15"
                                  onClick={() => setSelectedRequest(req)}
                                >
                                  Detay & Karar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-[11px] font-semibold text-zinc-400 hover:text-white"
                                  onClick={() => generateDilekce(req)}
                                >
                                  Dilekçe PDF
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Kart Görünümü */}
                <div className="block md:hidden divide-y divide-zinc-900">
                  {filteredRequests.map(req => {
                    const feeObj = getHarcDurumu(req)
                    return (
                      <div key={req.id} className="p-4 space-y-3 hover:bg-zinc-900/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-200 text-sm block">{req.basvuran_ad_soyad}</span>
                            <span className="text-[10px] text-zinc-500 font-mono block">TC: {req.basvuran_tc || 'Girilmemiş'}</span>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(req.durum)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-zinc-400 bg-zinc-900 px-2 py-1 rounded">
                            {req.talep_turu.includes('Baca') ? <Brush className="w-3 h-3 text-blue-400" /> : <ShieldCheck className="w-3 h-3 text-yellow-400" />}
                            <span>{req.talep_turu}</span>
                          </div>
                          <div className="text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded">
                            {new Date(req.basvuru_tarihi).toLocaleDateString('tr-TR')}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 text-xs">
                          <div className="text-zinc-500 font-semibold">
                            Ekip: <span className="text-zinc-300">{getGorevliEkip(req)}</span>
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded border ${feeObj.color}`}>
                              {feeObj.text}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1.5">
                          <Button
                            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-2 h-9 text-xs rounded-xl"
                            onClick={() => setSelectedRequest(req)}
                          >
                            İncele / Karar
                          </Button>
                          <Button
                            className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-bold px-3 py-2 h-9 text-xs rounded-xl"
                            onClick={() => generateDilekce(req)}
                          >
                            Dilekçe
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detay & Karar Yönetim Modalı */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 my-auto">
              <CardHeader className="bg-zinc-900/40 border-b border-zinc-800/80 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black text-zinc-100">
                    {selectedRequest.talep_turu.includes('Baca') ? <Brush className="w-5 h-5 text-blue-400" /> : <ShieldCheck className="w-5 h-5 text-yellow-400" />}
                    BAŞVURU YÖNETİM & TEKNİK DETAY DETAYI
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">Sivas Belediyesi İtfaiye Müdürlüğü Resmi Karar Değerlendirme Arayüzü</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setSelectedRequest(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Başvuran Vatandaş / Kurum</span>
                    <span className="text-sm font-semibold text-zinc-200 block">{selectedRequest.basvuran_ad_soyad}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">T.C. Kimlik / Vergi No</span>
                    <span className="text-sm font-semibold text-zinc-200 block">{selectedRequest.basvuran_tc || 'Girilmemiş'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">İrtibat Numarası</span>
                    <span className="text-sm font-semibold text-zinc-200 block">{selectedRequest.irtibat_tel}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Başvuru Tarihi</span>
                    <span className="text-sm font-semibold text-zinc-200 block">
                      {new Date(selectedRequest.basvuru_tarihi).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Hizmet Adresi</span>
                    <span className="text-sm font-semibold text-zinc-200 block">{selectedRequest.adres}</span>
                  </div>
                </div>

                {/* Baca Detayları */}
                {selectedRequest.talep_turu.includes('Baca') && selectedRequest.baca_detaylari && (
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider border-b border-blue-500/10 pb-1 flex items-center gap-1.5">
                      <Brush className="w-3.5 h-3.5" /> Teknik Baca Parametreleri
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block">Bina Kat Sayısı:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.baca_detaylari.kat_sayisi || 1} Kat</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Bağımsız Bölüm (Daire) Sayısı:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.baca_detaylari.daire_sayisi || 1} Daire</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Yakıt Tipi:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.baca_detaylari.yakit_tipi || 'Doğalgaz'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Baca Konstrüksiyon Tipi:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.baca_detaylari.baca_tipi || 'Konut Bacası'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* İşyeri Uygunluk Raporu Detayları */}
                {!selectedRequest.talep_turu.includes('Baca') && selectedRequest.isyeri_detaylari && (
                  <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-black text-yellow-400 uppercase tracking-wider border-b border-yellow-500/10 pb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> İşyeri Yangın Güvenlik Detayları
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block">Faaliyet Konusu:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.isyeri_detaylari.faaliyet_konusu || 'Belirtilmemiş'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Kapalı Alan (m²):</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.isyeri_detaylari.alan_m2 || 100} m²</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Yangın Dolabı Durumu:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.isyeri_detaylari.yangin_dolabi || 'Mevcut'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Acil Çıkış İmkanları:</span>
                        <span className="font-bold text-zinc-300">{selectedRequest.isyeri_detaylari.acil_cikis || '1 Adet'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amir İşlem Geçmişi (Karar Trail) */}
                {selectedRequest.islem_yapan_amir && (
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-zinc-500 font-semibold">
                      <span>İŞLEM YAPAN AMİR</span>
                      <span>{selectedRequest.islem_tarihi ? new Date(selectedRequest.islem_tarihi).toLocaleString('tr-TR') : ''}</span>
                    </div>
                    <div className="text-zinc-300 font-bold">
                      {selectedRequest.islem_yapan_amir}
                    </div>
                    {selectedRequest.red_gerekcesi && (
                      <div className="bg-red-950/20 border border-red-500/10 p-2.5 rounded-lg text-red-400 mt-2 font-mono">
                        <span className="font-bold block text-[10px] uppercase text-red-500 mb-0.5">RED GEREKÇESİ:</span>
                        {selectedRequest.red_gerekcesi}
                      </div>
                    )}
                  </div>
                )}

                {/* Tactical Actions Panels */}
                {tacticalMode === 'RED' && (
                  <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-red-400 block">LÜTFEN RESMİ RED GEREKÇESİNİ YAZIN <span className="text-red-500">*</span></label>
                    <textarea
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500 font-semibold"
                      rows={3}
                      placeholder="Tesisat eksiklikleri, harç ödemesi yapılmaması vb. idari/teknik gerekçeler..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 h-8 font-semibold"
                        onClick={() => setTacticalMode('NONE')}
                      >
                        İptal
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-1.5 h-8 font-bold flex items-center gap-1"
                        onClick={() => handleTacticalAction(selectedRequest.id, 'REDDEDİLDİ', { reason: rejectionReason })}
                      >
                        Reddi Tamamla
                      </Button>
                    </div>
                  </div>
                )}

                {tacticalMode === 'EKIP' && (
                  <div className="bg-blue-950/20 border border-blue-500/30 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-blue-400 block">GÖREVLENDİRİLECEK SAHA EKİBİNİ SEÇİN <span className="text-red-500">*</span></label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-semibold"
                      value={selectedCrew}
                      onChange={(e) => setSelectedCrew(e.target.value)}
                    >
                      {selectedRequest.talep_turu.includes('Baca') ? (
                        <>
                          <option value="B-Grubu Baca Ekibi">B-Grubu Baca Ekibi</option>
                          <option value="A-Grubu Baca Temizlik Timi">A-Grubu Baca Temizlik Timi</option>
                        </>
                      ) : (
                        <>
                          <option value="1. Grup Denetim Ekibi">1. Grup Denetim Ekibi</option>
                          <option value="2. Grup Ruhsat Denetçileri">2. Grup Ruhsat Denetçileri</option>
                          <option value="Merkez İstasyonu A Grubu">Merkez İstasyonu A Grubu</option>
                        </>
                      )}
                    </select>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 h-8 font-semibold"
                        onClick={() => setTacticalMode('NONE')}
                      >
                        İptal
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 h-8 font-bold flex items-center gap-1"
                        onClick={() => handleTacticalAction(selectedRequest.id, 'EKİP_ATANDI', { crew: selectedCrew })}
                      >
                        Ekibi Ata
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="bg-zinc-900/40 border-t border-zinc-800/80 p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isMudur && (
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-white hover:bg-red-600/10 text-xs font-bold px-3 py-2 h-9 rounded-xl flex items-center gap-1.5"
                      disabled={updating !== null}
                      onClick={() => handleDeleteRequest(selectedRequest.id)}
                    >
                      <Trash2 className="w-4 h-4" /> Kalıcı Olarak Sil
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/60 font-semibold px-4 py-2 h-9 rounded-xl text-xs"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Kapat
                  </Button>

                  {isMudur && selectedRequest.durum !== 'ONAYLANDI' && selectedRequest.durum !== 'REDDEDİLDİ' && (
                    <>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 h-9 rounded-xl flex items-center gap-1"
                        disabled={updating !== null || tacticalMode === 'RED'}
                        onClick={() => setTacticalMode('RED')}
                      >
                        Reddet
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 h-9 rounded-xl flex items-center gap-1"
                        disabled={updating !== null || tacticalMode === 'EKIP'}
                        onClick={() => setTacticalMode('EKIP')}
                      >
                        Ekip Görevlendir
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 h-9 rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/10"
                        disabled={updating !== null}
                        onClick={() => handleTacticalAction(selectedRequest.id, 'ONAYLANDI')}
                      >
                        {updating === selectedRequest.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Resmen Onayla'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Yeni Başvuru Ekle Modalı */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 my-auto">
              <CardHeader className="bg-zinc-900/40 border-b border-zinc-800/80 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black text-zinc-100">
                    <FilePlus className="w-5 h-5 text-indigo-400" /> YENİ VATANDAŞ BAŞVURUSU KAYDI
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">Sivas Belediyesi İtfaiye Müdürlüğü Vatandaş Hizmet Kaydı</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setIsCreateOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              <form onSubmit={handleCreateRequest}>
                <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hizmet Türü */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 block">Talep Edilen Hizmet Türü <span className="text-red-500">*</span></label>
                      <select
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                        value={newRequestForm.talep_turu}
                        onChange={(e) => setNewRequestForm(prev => ({ ...prev, talep_turu: e.target.value }))}
                      >
                        <option value="Baca Temizliği">Baca Temizliği (Ev/Konut/Sanayi)</option>
                        <option value="İtfaiye Uygunluk Raporu">İtfaiye Uygunluk (Olur) Raporu (Ruhsat Öncesi)</option>
                      </select>
                    </div>

                    {/* Başvuran Ad Soyad */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Başvuran Adı Soyadı <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                        placeholder="Örn: Ahmet Yılmaz"
                        value={newRequestForm.basvuran_ad_soyad}
                        onChange={(e) => setNewRequestForm(prev => ({ ...prev, basvuran_ad_soyad: e.target.value }))}
                      />
                    </div>

                    {/* T.C. Kimlik / Vergi No */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">T.C. Kimlik No / Vergi No</label>
                      <input
                        type="text"
                        maxLength={11}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                        placeholder="11 haneli T.C. veya Vergi No"
                        value={newRequestForm.basvuran_tc}
                        onChange={(e) => setNewRequestForm(prev => ({ ...prev, basvuran_tc: e.target.value }))}
                      />
                    </div>

                    {/* İrtibat Tel */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">İrtibat Telefon Numarası <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                        placeholder="05xx xxx xx xx"
                        value={newRequestForm.irtibat_tel}
                        onChange={(e) => setNewRequestForm(prev => ({ ...prev, irtibat_tel: e.target.value }))}
                      />
                    </div>

                    {/* Adres */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 block">Hizmet Adresi <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                        placeholder="Örn: Esentepe Mah. Şehitler Cad. No:12/4 Merkez/Sivas"
                        value={newRequestForm.adres}
                        onChange={(e) => setNewRequestForm(prev => ({ ...prev, adres: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Baca Detayları Form Katmanı */}
                  {newRequestForm.talep_turu === 'Baca Temizliği' && (
                    <div className="space-y-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                      <h3 className="font-bold text-sm text-blue-400 border-b border-blue-500/20 pb-1.5 flex items-center gap-1.5">
                        <Brush className="w-4 h-4" /> Teknik Baca Detayları
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <label className="text-xs font-bold text-zinc-400 block">Kullanılan Yakıt Tipi</label>
                          <select
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            value={newRequestForm.baca_yakit_tipi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, baca_yakit_tipi: e.target.value }))}
                          >
                            <option value="Doğalgaz">Doğalgaz</option>
                            <option value="Kömür / Odun">Kömür / Odun</option>
                            <option value="Fuel-Oil">Fuel-Oil / Sıvı Yakıt</option>
                            <option value="Elektrik">Elektrik</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">Baca Konstrüksiyon Tipi</label>
                          <select
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                            value={newRequestForm.baca_tipi}
                            onChange={(e) => setNewRequestForm(prev => ({ ...prev, baca_tipi: e.target.value }))}
                          >
                            <option value="Standart Konut Bacası">Standart Konut Bacası</option>
                            <option value="Sanayi / Fabrika Bacası">Sanayi / Fabrika Bacası</option>
                            <option value="Kazan Dairesi Bacası">Kazan Dairesi Bacası</option>
                            <option value="Şömine / Barbekü Bacası">Şömine / Barbekü Bacası</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* İşyeri Detayları Form Katmanı */}
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
