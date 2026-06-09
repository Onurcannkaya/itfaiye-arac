"use client"

import { useState, useEffect, useMemo } from "react"
import jsPDF from "jspdf"
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
  UserCheck,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Ban,
  Edit
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

interface BlacklistInstitution {
  id: string;
  kurum_adi: string;
  vergi_no_or_tc: string;
  gerekce?: string;
  yasaklama_tarihi: string;
  aktif_durum: boolean;
  created_at: string;
}

interface ExternalEducation {
  id: string;
  kurum_id?: string | null;
  kurum_adi?: string;
  kurum_tipi?: string;
  egitim_turu?: string;
  kisi_sayisi?: number;
  planlanan_tarih: string;
  saat_slot: string;
  egitimci_personel_ids: string[];
  durum: string;
  created_at?: string;
}

function formatDateLocal(dateString: string) {
  const d = new Date(dateString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

const CALENDAR_SLOTS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 10:30",
  "10:30 - 11:15",
  "11:15 - 12:00",
  "12:00 - 13:30",
  "13:30 - 15:00",
  "15:00 - 15:30",
  "15:30 - 16:30",
  "16:30 - 16:45",
  "16:45 - 17:30",
  "17:30 - 18:30",
  "18:30 - 20:00",
  "20:00 - 21:00"
]

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

  // 3-SubTab States
  const [subTab, setSubTab] = useState<'applications' | 'calendar' | 'blacklist'>('applications')

  // Blacklist Management State
  const [blacklistList, setBlacklistList] = useState<BlacklistInstitution[]>([])
  const [isSavingBlacklist, setIsSavingBlacklist] = useState(false)
  const [blacklistForm, setBlacklistForm] = useState({
    kurum_adi: '',
    vergi_no_or_tc: '',
    gerekce: ''
  })

  // Hourly Activity Calendar State
  const [educations, setEducations] = useState<ExternalEducation[]>([])
  const [personnelList, setPersonnelList] = useState<any[]>([])
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => {
    const d = new Date()
    return getMonday(d)
  })

  const daysOfWeek = useMemo<Date[]>(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekDate)
      day.setDate(currentWeekDate.getDate() + i)
      days.push(day)
    }
    return days
  }, [currentWeekDate])

  // Program Planning Modal State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false)
  const [isSavingEdu, setIsSavingEdu] = useState(false)
  const [eduForm, setEduForm] = useState({
    id: '',
    kurum_id: '',
    kurum_adi: '',
    kurum_tipi: 'Isyeri',
    egitim_turu: 'Yangın Önleme ve Temel Yangın Eğitimi',
    kisi_sayisi: '20',
    planlanan_tarih: new Date().toISOString().split('T')[0],
    saat_slot: '08:00 - 09:00',
    egitimci_personel_ids: [] as string[],
    durum: 'Beklemede'
  })
  const [blacklistAcknowledged, setBlacklistAcknowledged] = useState(false)

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
    fetchPersonnel()
    fetchBlacklist()
    fetchEducations()
  }, [])

  const fetchPersonnel = async () => {
    try {
      const { data } = await api.from('personnel').select('*')
      if (data && Array.isArray(data)) {
        setPersonnelList(data)
      }
    } catch (err) {
      console.error('Fetch personnel error:', err)
    }
  }

  const fetchBlacklist = async () => {
    try {
      const { data } = await api.from('blacklist_institutions').select('*').order('created_at', { ascending: false })
      if (data && Array.isArray(data)) {
        setBlacklistList(data)
      }
    } catch (err) {
      console.error('Fetch blacklist error:', err)
    }
  }

  const fetchEducations = async () => {
    try {
      const { data } = await api.from('external_educations').select('*')
      if (data && Array.isArray(data)) {
        setEducations(data)
      }
    } catch (err) {
      console.error('Fetch educations error:', err)
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

  // Blacklist Handlers
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blacklistForm.kurum_adi || !blacklistForm.vergi_no_or_tc) {
      alert("Lütfen Kurum Adı ve T.C. / Vergi No alanlarını doldurun.")
      return
    }
    setIsSavingBlacklist(true)
    try {
      const payload = {
        kurum_adi: blacklistForm.kurum_adi,
        vergi_no_or_tc: blacklistForm.vergi_no_or_tc,
        gerekce: blacklistForm.gerekce || '',
        yasaklama_tarihi: new Date().toISOString().split('T')[0],
        aktif_durum: true
      }
      const res = await api.insert('blacklist_institutions', [payload])
      if (res && !res.error) {
        setBlacklistForm({ kurum_adi: '', vergi_no_or_tc: '', gerekce: '' })
        await fetchBlacklist()
      } else {
        alert("Hata: " + (res?.error || "Bilinmeyen hata"))
      }
    } catch (err) {
      console.error(err)
      alert("Sistemsel hata.")
    } finally {
      setIsSavingBlacklist(false)
    }
  }

  const handleToggleBlacklist = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.update('blacklist_institutions', { aktif_durum: !currentStatus }, { id })
      if (res && !res.error) {
        await fetchBlacklist()
      } else {
        alert("Durum güncellenirken hata oluştu: " + (res?.error || 'Bilinmeyen Hata'))
      }
    } catch (err) {
      console.error(err)
      alert("Sistemsel hata.")
    }
  }

  const handleDeleteBlacklist = async (id: string) => {
    if (!window.confirm("Bu kurumu listeden tamamen silmek istiyor musunuz?")) return
    try {
      const res = await api.remove('blacklist_institutions', { id })
      if (res && !res.error) {
        await fetchBlacklist()
      } else {
        alert("Silme hatası: " + (res?.error || 'Bilinmeyen Hata'))
      }
    } catch (err) {
      console.error(err)
      alert("Sistemsel hata.")
    }
  }

  // Check if current institution is blacklisted
  const activeBlacklistedInst = useMemo(() => {
    if (!eduForm.kurum_adi) return null
    if (eduForm.kurum_id) {
      const found = blacklistList.find(x => x.id === eduForm.kurum_id && x.aktif_durum === true)
      if (found) return found
    }
    const queryName = eduForm.kurum_adi.trim().toLowerCase()
    const foundByName = blacklistList.find(x => x.kurum_adi.trim().toLowerCase() === queryName && x.aktif_durum === true)
    return foundByName || null
  }, [eduForm.kurum_adi, eduForm.kurum_id, blacklistList])

  // jsPDF results report printing
  const handlePrintZiyaretRaporu = (edu: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210
    const pageH = 297
    const mL = 15  // margin left
    const mR = 15  // margin right
    const contentW = pageW - mL - mR

    const tr = (str: string) => {
      if (!str) return ""
      const map: Record<string, string> = {
        'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i',
        'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u', 'Ç': 'C', 'ç': 'c'
      }
      return str.replace(/[ŞşĞğİıÖöÜüÇç]/g, ch => map[ch] || ch)
    }

    const dateStr = new Date(edu.planlanan_tarih).toLocaleDateString("tr-TR")
    const trainerNames = getTrainerNames(edu.egitimci_personel_ids || [])

    // Outer border
    doc.setDrawColor(40)
    doc.setLineWidth(0.8)
    doc.rect(mL - 2, 8, contentW + 4, pageH - 16)

    // Heading
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text("T.C. SIVAS BELEDIYE BASKANLIGI", pageW / 2, 20, { align: "center" })
    doc.setFontSize(11)
    doc.text("ITFAIYE MUDURLUGU EGITIM VE TAHKIKAT AMIRLIGI", pageW / 2, 26, { align: "center" })
    doc.setFontSize(12)
    doc.text("DIS KURUM ZIYARET VE EGITIM SONUC RAPORU", pageW / 2, 33, { align: "center" })

    // Separation line
    doc.setLineWidth(0.5)
    doc.line(mL, 37, pageW - mR, 37)

    // Details Table / Form
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(10)
    
    let y = 46
    const drawRow = (label: string, value: string) => {
      doc.setFont("Helvetica", "bold")
      doc.text(tr(label), mL + 2, y)
      doc.setFont("Helvetica", "normal")
      doc.text(": " + tr(value), mL + 45, y)
      y += 8
    }

    drawRow("Rapor Tarihi", dateStr)
    drawRow("Kurum / Isyeri Adi", edu.kurum_adi)
    drawRow("Kurum Tipi", edu.kurum_tipi || "Isyeri")
    drawRow("Egitim Turu", edu.egitim_turu)
    drawRow("Katilimci Sayisi", `${edu.kisi_sayisi} Kisi`)
    drawRow("Saat Dilimi", edu.saat_slot || "Belirtilmedi")
    drawRow("Egitimci Personel", trainerNames)
    drawRow("Faaliyet Durumu", edu.durum)

    y += 4
    doc.setLineWidth(0.3)
    doc.line(mL, y, pageW - mR, y)
    y += 8

    // Rapor Detay Metni / Matbu Açıklama
    doc.setFont("Helvetica", "bold")
    doc.text("DEGERLENDIRME VE SONUC:", mL + 2, y)
    y += 7
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9.5)
    
    const explanationText = 
      "Sivas Belediyesi Itfaiye Mudurlugu Egitim ve Tahkikat Amirligi ekipleri tarafından, yukarıda bilgileri yer alan kurum/isyeri bunyesinde " + 
      "planlanan saat dilimi icerisinde resmi dis egitim faaliyeti icra edilmistir. " + 
      "Egitim kapsamında katılımcılara temel yangın guvenligi, tahliye kuralları ve acil durum eylemleri " + 
      "hakkında teorik ve pratik bilgilendirme saglanmıs olup, tatbikat basarıyla tamamlanmıstır. Isbu rapor " + 
      "kurumsal hafıza kaydı amacıyla duzenlenmis ve imza altına alınmıstır.";
      
    const splitExplanation = doc.splitTextToSize(tr(explanationText), contentW - 4)
    doc.text(splitExplanation, mL + 2, y)
    y += splitExplanation.length * 5 + 15

    // Signature Area
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Raporu Duzenleyen", mL + 10, y)
    doc.text("Itfaiye Muduru", pageW - mR - 40, y)
    
    y += 5
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(9)
    doc.text("Egitimci Personel / Amir", mL + 10, y)
    doc.text("Imza / Muhur", pageW - mR - 40, y)

    // Save PDF
    const filename = `Sivas_Itfaiye_Dis_Egitim_Raporu_${edu.id ? edu.id.substring(0,8) : 'yeni'}.pdf`
    doc.save(filename)
  }

  // Calendar Education Handlers
  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eduForm.kurum_adi) {
      alert("Lütfen Kurum Adı giriniz.")
      return
    }
    if (activeBlacklistedInst && !blacklistAcknowledged) {
      alert("Lütfen kara listedeki kurum için uyarılı kurum bildirimini onaylayınız.")
      return
    }

    setIsSavingEdu(true)
    try {
      const payload = {
        kurum_adi: eduForm.kurum_adi,
        kurum_tipi: eduForm.kurum_tipi,
        egitim_turu: eduForm.egitim_turu,
        kisi_sayisi: Number(eduForm.kisi_sayisi) || 0,
        planlanan_tarih: new Date(eduForm.planlanan_tarih).toISOString(),
        saat_slot: eduForm.saat_slot,
        egitimci_personel_ids: eduForm.egitimci_personel_ids,
        durum: eduForm.durum,
        kurum_id: eduForm.kurum_id || null
      }

      let res
      if (eduForm.id) {
        res = await api.update('external_educations', payload, { id: eduForm.id })
      } else {
        res = await api.insert('external_educations', [payload])
      }

      if (res && !res.error) {
        setIsProgramModalOpen(false)
        await fetchEducations()
      } else {
        alert("Kaydetme hatası: " + (res?.error || "Bilinmeyen hata"))
      }
    } catch (err) {
      console.error(err)
      alert("Sistemsel hata.")
    } finally {
      setIsSavingEdu(false)
    }
  }

  const handleDeleteEducation = async (id: string) => {
    if (!window.confirm("Bu program kaydını silmek istediğinize emin misiniz?")) return
    try {
      const res = await api.remove('external_educations', { id })
      if (res && !res.error) {
        setIsProgramModalOpen(false)
        await fetchEducations()
      } else {
        alert("Silme hatası: " + (res?.error || "Bilinmeyen hata"))
      }
    } catch (err) {
      console.error(err)
      alert("Sistemsel hata.")
    }
  }

  const handlePrevWeek = () => {
    setCurrentWeekDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const handleNextWeek = () => {
    setCurrentWeekDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const handleTodayWeek = () => {
    setCurrentWeekDate(getMonday(new Date()))
  }

  const getDayName = (d: Date) => {
    return d.toLocaleDateString('tr-TR', { weekday: 'long' })
  }

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  const getYYYYMMDD = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getTrainerNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Atanmadı'
    return ids.map(id => {
      const p = personnelList.find(x => x.id === id || x.sicil_no === id)
      return p ? `${p.ad} ${p.soyad}` : 'Personel'
    }).join(', ')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Onaylandı': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
      case 'Tamamlandı': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      case 'İptal': return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'Beklemede':
      default:
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    }
  }

  // Calculated values for KPI Metrics
  const bacaCount = requests.filter(r => r.talep_turu.includes('Baca')).length
  const yanginCount = requests.filter(r => r.talep_turu.includes('Uygunluk') || r.talep_turu.includes('Ruhsat') || r.talep_turu.includes('Yangın Raporu')).length
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

  // ── Dilekçe (Petition) Generator ─────────────────────────────────────
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
    } else if (req.talep_turu.includes('Uygunluk') || req.talep_turu.includes('Ruhsat') || req.talep_turu.includes('Olur')) {
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
    } else if (req.talep_turu.includes('Eğitim')) {
      konuText = 'Yangın Güvenliği Eğitimi Talebi Hk.';
      govdeText = `Aşağıda bilgileri verilen kurum/kuruluşumuz personeline yönelik yangın güvenliği eğitimi verilmesini talep ediyorum. Eğitim programının planlanması ve tarafıma bilgi verilmesini arz ederim.`;
      if (req.isyeri_detaylari) {
        const id = req.isyeri_detaylari;
        teknikBilgi = `
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Eğitim Türü</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.egitim_turu || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Katılımcı Sayısı</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.kisi_sayisi || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Planlanan Tarih</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.egitim_tarihi || '-'}</td></tr>
        `;
      }
    } else if (req.talep_turu.includes('Yangın Raporu')) {
      konuText = 'Yangın Raporu Talebi Hk.';
      govdeText = `Aşağıda detayları belirtilen olay ile ilgili düzenlenen resmi Yangın Raporunun tarafıma verilmesini talep ediyorum. Gereğinin yapılmasını arz ederim.`;
      if (req.isyeri_detaylari) {
        const id = req.isyeri_detaylari;
        teknikBilgi = `
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Yangın Nedeni/Detayı</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.yangin_nedeni || '-'}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #ccc;font-weight:600;">Bina Yapı Tipi</td><td style="padding:6px 12px;border:1px solid #ccc;">${id.bina_tipi || '-'}</td></tr>
        `;
      }
    } else {
      konuText = `${req.talep_turu} Hk.`;
      govdeText = `Aşağıda bilgileri sunulan talebimin değerlendirilmesini saygılarımla arz ederim.`;
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
      // Fallback: download as file
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
      <div className="flex flex-col min-h-screen overflow-y-auto space-y-6 max-w-7xl mx-auto pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8 animate-in fade-in duration-300">
        
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

        {/* 3 Asil Alt Menü Seçimi */}
        <div className="flex border-b border-zinc-800 bg-slate-950/45 p-1.5 rounded-xl gap-2 max-w-xl">
          <button
            type="button"
            onClick={() => setSubTab('applications')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-extrabold transition-all duration-200 ${
              subTab === 'applications'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            📋 Gelen Başvurular
          </button>
          <button
            type="button"
            onClick={() => setSubTab('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-extrabold transition-all duration-200 ${
              subTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            📅 Saatli Teşkilat Programı
          </button>
          <button
            type="button"
            onClick={() => setSubTab('blacklist')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-extrabold transition-all duration-200 ${
              subTab === 'blacklist'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            🚫 Kara Liste Yönetimi
          </button>
        </div>

        {subTab === 'applications' && (
          <>
            {/* 1. Üst Özet KPI Kartları (Glassmorphic) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Eğitim Talepleri */}
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-4 rounded-xl relative overflow-hidden group hover:border-purple-500/20 transition duration-300">
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

            {/* 3. Resmi İş Akışı ve Kurumsal Tablo Düzenlemesi */}
            <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
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
              <CardContent className="p-0">
                {requests.length === 0 ? (
                  <div className="text-center p-12 text-muted-foreground bg-zinc-950/20">
                    Sistemde henüz bir hizmet başvurusu bulunmamaktadır.
                  </div>
                ) : (
                  <>
                    {/* ═══ Desktop Tablo Görünümü (md+) ═══ */}
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
                                    <div className={`p-1.5 rounded-md ${req.talep_turu.includes('Baca') ? 'text-blue-400 bg-blue-500/10' : req.talep_turu.includes('Eğitim') ? 'text-purple-400 bg-purple-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                                      {req.talep_turu.includes('Baca') ? <Brush className="w-3.5 h-3.5" /> : req.talep_turu.includes('Eğitim') ? <GraduationCap className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
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
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${feeObj.color}`}>{feeObj.text}</span>
                                </td>
                                <td className="p-4 align-middle whitespace-nowrap">{getStatusBadge(req.durum)}</td>
                                <td className="p-4 align-middle text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    {isMudur ? (
                                      <>
                                        <Button size="sm" className="bg-cyan-600/90 hover:bg-cyan-500 text-white font-black text-xs px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] border border-cyan-400/20 whitespace-nowrap transition-all duration-200 active:scale-[0.97] ease-[cubic-bezier(0.4,0,0.2,1)]" onClick={() => setSelectedRequest(req)} disabled={updating === req.id}>
                                          {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>🔧 İşlem Yap</>}
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition duration-150 shadow-[0_0_12px_rgba(220,38,38,0.3)] border border-red-500/20 active:scale-[0.97]"
                                          onClick={() => handleDeleteRequest(req.id)}
                                          disabled={updating === req.id}
                                          title="Sil"
                                        >
                                          {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> Sil</>}
                                        </Button>
                                      </>
                                    ) : (
                                      <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition duration-150 border border-slate-700 whitespace-nowrap" onClick={() => setSelectedRequest(req)} disabled={updating === req.id}>
                                        {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>🔍 İncele</>}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ═══ Mobil Kart Görünümü (md altı) ═══ */}
                    <div className="md:hidden p-4 space-y-3">
                      {requests.map(req => {
                        const feeObj = getHarcDurumu(req)
                        return (
                          <div key={req.id} className="bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3 shadow-[0_0_12px_rgba(6,182,212,0.06)] transition-all">
                            {/* Başvuran Adı + Durum Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-zinc-100 block text-sm leading-tight">{req.basvuran_ad_soyad}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">TC: {req.basvuran_tc || 'Girilmemeş'}</span>
                                </div>
                              </div>
                              <div className="shrink-0">{getStatusBadge(req.durum)}</div>
                            </div>

                            {/* Hizmet Türü Rozeti */}
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-md ${req.talep_turu.includes('Baca') ? 'text-blue-400 bg-blue-500/10' : req.talep_turu.includes('Eğitim') ? 'text-purple-400 bg-purple-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                                {req.talep_turu.includes('Baca') ? <Brush className="w-3.5 h-3.5" /> : req.talep_turu.includes('Eğitim') ? <GraduationCap className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              </div>
                              <span className="font-semibold text-zinc-300 text-sm">{req.talep_turu}</span>
                            </div>

                            {/* Tarih + Harç bilgileri */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-zinc-900/40 rounded-xl p-2.5 border border-zinc-800/40">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Tarih</span>
                                <span className="text-xs text-zinc-300 font-medium flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-zinc-600" />
                                  {new Date(req.basvuru_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="bg-zinc-900/40 rounded-xl p-2.5 border border-zinc-800/40">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Harç</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${feeObj.color}`}>{feeObj.text}</span>
                              </div>
                            </div>

                            {/* Görevli Ekip */}
                            <div className="text-xs">
                              <span className="text-zinc-500 font-bold">Görevli Ekip: </span>
                              <span className={(!req.atanan_ekip && (req.durum === 'BEKLEMEDE' || req.durum === 'Bekliyor')) ? 'text-zinc-600 italic' : 'text-zinc-300 font-semibold'}>
                                {getGorevliEkip(req)}
                              </span>
                            </div>

                            {/* Aksiyon Butonu */}
                            {isMudur ? (
                              <div className="flex gap-2">
                                <Button 
                                  className="flex-1 bg-cyan-600/90 hover:bg-cyan-500 text-white font-black text-xs min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] border border-cyan-400/20 transition-all duration-200 active:scale-[0.97] ease-[cubic-bezier(0.4,0,0.2,1)]"
                                  onClick={() => setSelectedRequest(req)}
                                  disabled={updating === req.id}
                                >
                                  {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>🔧 İşlem Yap</>}
                                </Button>
                                <Button
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs min-h-[44px] px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition duration-150 shadow-[0_0_12px_rgba(220,38,38,0.3)] border border-red-500/20 active:scale-[0.97]"
                                  onClick={() => handleDeleteRequest(req.id)}
                                  disabled={updating === req.id}
                                  title="Sil"
                                >
                                  {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition duration-150 border border-slate-700"
                                onClick={() => setSelectedRequest(req)}
                                disabled={updating === req.id}
                              >
                                {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>🔍 İncele</>}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {subTab === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Controls & Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-zinc-300 hover:text-white"
                  onClick={handlePrevWeek}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Önceki Hafta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-zinc-300 hover:text-white font-bold"
                  onClick={handleTodayWeek}
                >
                  Bu Hafta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-zinc-300 hover:text-white"
                  onClick={handleNextWeek}
                >
                  Sonraki Hafta <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="text-zinc-200 font-extrabold text-sm sm:text-base">
                📅 {formatDateLabel(daysOfWeek[0])} - {formatDateLabel(daysOfWeek[6])} {daysOfWeek[0].getFullYear()}
              </div>
              <div>
                {isMudur && (
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 h-9 rounded-xl flex items-center gap-1.5 shadow-lg"
                    onClick={() => {
                      setEduForm({
                        id: '',
                        kurum_id: '',
                        kurum_adi: '',
                        kurum_tipi: 'Isyeri',
                        egitim_turu: 'Yangın Önleme ve Temel Yangın Eğitimi',
                        kisi_sayisi: '20',
                        planlanan_tarih: getYYYYMMDD(new Date()),
                        saat_slot: '08:00 - 09:00',
                        egitimci_personel_ids: [],
                        durum: 'Beklemede'
                      })
                      setBlacklistAcknowledged(false)
                      setIsProgramModalOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4" /> Yeni Program Planla
                  </Button>
                )}
              </div>
            </div>

            {/* Weekly Calendar Matrix */}
            <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[1200px] border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-400 font-bold text-xs uppercase tracking-wider h-14">
                      <th className="p-3 text-center border-r border-zinc-900/60 w-36">Saat Dilimi</th>
                      {daysOfWeek.map((day, idx) => {
                        const isToday = getYYYYMMDD(day) === getYYYYMMDD(new Date())
                        return (
                          <th key={idx} className={`p-3 text-center border-r border-zinc-900/60 ${isToday ? 'bg-indigo-950/25 text-indigo-400 font-black' : ''}`}>
                            <div className="text-[11px] font-bold opacity-75">{getDayName(day)}</div>
                            <div className="text-sm font-black mt-0.5">{formatDateLabel(day)}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {CALENDAR_SLOTS.map(slot => (
                      <tr key={slot} className="hover:bg-zinc-900/10 transition duration-150 h-24">
                        <td className="p-3 font-mono text-xs font-bold text-zinc-400 text-center bg-zinc-950/30 border-r border-zinc-900/60 align-middle">
                          {slot}
                        </td>
                        {daysOfWeek.map((day, idx) => {
                          const dateStr = getYYYYMMDD(day)
                          const cellEvents = educations.filter(edu => {
                            return formatDateLocal(evtDateString(edu.planlanan_tarih)) === dateStr && edu.saat_slot === slot
                          })
                          function evtDateString(ds: any) {
                            return ds || ''
                          }
                          const isToday = dateStr === getYYYYMMDD(new Date())

                          return (
                            <td
                              key={idx}
                              className={`p-2 border-r border-zinc-900/60 vertical-align-top relative group transition duration-150 align-top ${isToday ? 'bg-indigo-950/10' : ''}`}
                            >
                              <div className="flex flex-col gap-1.5 h-full min-h-[4rem]">
                                {cellEvents.map(evt => (
                                  <div
                                    key={evt.id}
                                    onClick={() => {
                                      setEduForm({
                                        id: evt.id,
                                        kurum_id: evt.kurum_id || '',
                                        kurum_adi: evt.kurum_adi || '',
                                        kurum_tipi: evt.kurum_tipi || 'Isyeri',
                                        egitim_turu: evt.egitim_turu || '',
                                        kisi_sayisi: String(evt.kisi_sayisi || 0),
                                        planlanan_tarih: formatDateLocal(evt.planlanan_tarih),
                                        saat_slot: evt.saat_slot,
                                        egitimci_personel_ids: evt.egitimci_personel_ids || [],
                                        durum: evt.durum
                                      })
                                      setBlacklistAcknowledged(false)
                                      setIsProgramModalOpen(true)
                                    }}
                                    className={`p-2 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02] ${getStatusColor(evt.durum)}`}
                                  >
                                    <div className="font-black text-xs line-clamp-1">{evt.kurum_adi}</div>
                                    <div className="text-[10px] font-bold opacity-80 mt-0.5 line-clamp-1">{evt.egitim_turu}</div>
                                    <div className="flex items-center justify-between mt-1 text-[9px] font-semibold opacity-75">
                                      <span>👥 {evt.kisi_sayisi} Kişi</span>
                                      <span className="font-mono bg-zinc-950/40 px-1 py-0.5 rounded text-[8px] max-w-[80px] truncate">
                                        {evt.egitimci_personel_ids && evt.egitimci_personel_ids.length > 0 ? getTrainerNames(evt.egitimci_personel_ids).split(',')[0] : 'Atanmadı'}
                                      </span>
                                    </div>
                                  </div>
                                ))}

                                {cellEvents.length === 0 && isMudur && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEduForm({
                                        id: '',
                                        kurum_id: '',
                                        kurum_adi: '',
                                        kurum_tipi: 'Isyeri',
                                        egitim_turu: 'Yangın Önleme ve Temel Yangın Eğitimi',
                                        kisi_sayisi: '20',
                                        planlanan_tarih: dateStr,
                                        saat_slot: slot,
                                        egitimci_personel_ids: [],
                                        durum: 'Beklemede'
                                      })
                                      setBlacklistAcknowledged(false)
                                      setIsProgramModalOpen(true)
                                    }}
                                    className="w-full h-full min-h-[4rem] rounded-xl border border-dashed border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4 text-indigo-400" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {subTab === 'blacklist' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kurum Engelleme Formu */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-6 rounded-2xl">
                <CardHeader className="p-0 pb-4 border-b border-zinc-800/60 mb-4">
                  <CardTitle className="text-base font-black text-indigo-100 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-red-500" /> KURUM ENGELLEME FORMU
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">İdari veya gerekçelerle başvuru hakkı askıya alınacak kurumlar</p>
                </CardHeader>
                
                {isMudur ? (
                  <form onSubmit={handleAddBlacklist} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Kurum Adı / Unvanı <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold"
                        placeholder="Örn: Öz Sivas Tekstil Ltd."
                        value={blacklistForm.kurum_adi}
                        onChange={(e) => setBlacklistForm(prev => ({ ...prev, kurum_adi: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">T.C. Kimlik / Vergi No <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-mono font-medium"
                        placeholder="10 veya 11 Haneli Numara"
                        value={blacklistForm.vergi_no_or_tc}
                        onChange={(e) => setBlacklistForm(prev => ({ ...prev, vergi_no_or_tc: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Yasaklama Gerekçesi</label>
                      <textarea
                        rows={3}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium resize-none"
                        placeholder="Yasaklama kararının idari gerekçesi..."
                        value={blacklistForm.gerekce}
                        onChange={(e) => setBlacklistForm(prev => ({ ...prev, gerekce: e.target.value }))}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSavingBlacklist}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 transition"
                    >
                      {isSavingBlacklist ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Engelleniyor...
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4" /> Kara Listeye Ekle
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 text-xs text-zinc-400 text-center">
                    Kurum engelleme ve kara liste yönetimi sadece Müdür seviyesinde yapılabilir.
                  </div>
                )}
              </Card>
            </div>

            {/* Kara Listedeki Kurumlar Listesi */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/10 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-black tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                        <Ban className="w-5 h-5 text-red-500 animate-pulse" /> ENGELLENEN KURUMLAR VERİ GRİDİ
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Sistemde başvuruları anlık bloke edilen aktif kara liste kayıtları</p>
                    </div>
                    <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-500 px-2.5 py-1 rounded-md">
                      ENGEL KAYITLARI: {blacklistList.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {blacklistList.length === 0 ? (
                    <div className="text-center p-12 text-muted-foreground bg-zinc-950/20">
                      Sistemde engellenmiş herhangi bir kurum bulunmamaktadır.
                    </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full min-w-[700px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                            <th className="p-4 text-left">Kurum Adı</th>
                            <th className="p-4 text-left">T.C. / Vergi No</th>
                            <th className="p-4 text-left">Yasaklama Gerekçesi</th>
                            <th className="p-4 text-left">Tarih</th>
                            <th className="p-4 text-center">Durum</th>
                            {isMudur && <th className="p-4 text-right">İşlemler</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {blacklistList.map(item => (
                            <tr key={item.id} className="hover:bg-zinc-900/30 transition duration-150">
                              <td className="p-4 font-bold text-zinc-200 align-middle">{item.kurum_adi}</td>
                              <td className="p-4 font-mono font-bold text-zinc-300 align-middle">{item.vergi_no_or_tc}</td>
                              <td className="p-4 text-zinc-400 font-medium align-middle max-w-xs truncate" title={item.gerekce}>
                                {item.gerekce || '-'}
                              </td>
                              <td className="p-4 text-zinc-500 font-medium align-middle">
                                {new Date(item.yasaklama_tarihi).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="p-4 text-center align-middle">
                                <button
                                  type="button"
                                  disabled={!isMudur}
                                  onClick={() => handleToggleBlacklist(item.id, item.aktif_durum)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition cursor-pointer ${
                                    item.aktif_durum
                                      ? 'bg-red-950/40 text-red-400 border-red-500/30 hover:bg-red-950/60'
                                      : 'bg-zinc-900/80 text-zinc-500 border-zinc-800 hover:bg-zinc-800'
                                  }`}
                                >
                                  {item.aktif_durum ? '🚫 Engelli (Aktif)' : '⚪ Serbest (Pasif)'}
                                </button>
                              </td>
                              {isMudur && (
                                <td className="p-4 text-right align-middle">
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1.5 min-h-0 h-auto rounded-lg shadow-md"
                                    onClick={() => handleDeleteBlacklist(item.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Premium Amir Taktik Operasyon Modalı */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] overflow-y-auto animate-in fade-in duration-200">
            <Card className="w-full max-w-2xl bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 my-auto">
              <CardHeader className="bg-slate-900/40 border-b border-slate-800/80 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black text-indigo-100 uppercase tracking-wider">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    {isMudur ? "AMİR TAKTİK OPERASYON PANELİ" : "BAŞVURU DETAY PANELİ"}
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Takip Kodu / ID: <span className="text-cyan-400">{selectedRequest.takip_kodu || selectedRequest.basvuran_tc || selectedRequest.id}</span>
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
                      <span className="text-zinc-500 block text-xs">T.C. Kimlik No</span>
                      <span className="font-bold text-zinc-300 font-mono">{(selectedRequest.basvuran_tc && !selectedRequest.basvuran_tc.startsWith('SVS-')) ? selectedRequest.basvuran_tc : 'Girilmemiş'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-xs">Takip Kodu</span>
                      <span className="font-bold text-zinc-300 font-mono">{selectedRequest.takip_kodu || (selectedRequest.basvuran_tc?.startsWith('SVS-') ? selectedRequest.basvuran_tc : '') || '-'}</span>
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

                {selectedRequest.talep_turu === 'Yangın Raporu' && selectedRequest.isyeri_detaylari && (
                  <div className="space-y-3 bg-yellow-950/20 p-4 rounded-xl border border-yellow-950/40">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-yellow-400 border-b border-yellow-500/20 pb-1.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Yangın Raporu Başvuru Detayları
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

                {/* 4.5 Dilekçe İndirme Butonu */}
                <div className="pt-3 border-t border-slate-800/50">
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 min-h-[44px] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 border border-indigo-500/30 transition-all duration-200 active:scale-[0.97]"
                    onClick={() => generateDilekce(selectedRequest)}
                  >
                    <Download className="w-4 h-4" />
                    Dilekçe Olarak İndir
                  </Button>
                </div>

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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] overflow-y-auto">
            <Card className="w-full max-w-2xl bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 my-auto">
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

        {/* Yeni Program Planla / Düzenle Modalı */}
        {isProgramModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] overflow-y-auto">
            <Card className="w-full max-w-2xl bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 my-auto">
              <CardHeader className="bg-zinc-900/40 border-b border-zinc-800/80 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black text-indigo-100">
                    <Calendar className="w-5 h-5 text-indigo-400" /> {eduForm.id ? 'PROGRAM DETAY & DÜZENLEME PANELİ' : 'YENİ TEŞKİLAT PROGRAMI PLANLA'}
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">Sivas Belediyesi İtfaiye Müdürlüğü Dış Eğitim ve Tatbikat Planlayıcı</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setIsProgramModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              <form onSubmit={handleSaveEducation}>
                <CardContent className="p-6 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-thin">
                  
                  {/* Neon Warning Banner */}
                  {activeBlacklistedInst && (
                    <div className="space-y-4 my-2">
                      <div className="border border-red-500/50 bg-red-950/35 text-red-200 p-4 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-pulse flex flex-col gap-2">
                        <span className="font-bold text-sm sm:text-base block">
                          ⚠️ KARA LİSTE: {new Date(activeBlacklistedInst.yasaklama_tarihi).toLocaleDateString('tr-TR')} tarihinde hazırlık yapılmasına rağmen kurum tarafından son dakika iptal edilmiştir! Gerekçe: {activeBlacklistedInst.gerekce}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 bg-red-950/15 border border-red-500/20 p-3.5 rounded-xl">
                        <input
                          type="checkbox"
                          id="blacklist-acknowledge"
                          checked={blacklistAcknowledged}
                          onChange={(e) => setBlacklistAcknowledged(e.target.checked)}
                          className="w-4 h-4 rounded border-red-500/40 text-red-600 focus:ring-red-500/50 bg-zinc-900 cursor-pointer"
                        />
                        <label htmlFor="blacklist-acknowledge" className="text-xs sm:text-sm font-semibold text-red-300 cursor-pointer select-none">
                          Uyarılı Kurum Bildirimini Okudum ve Onaylıyorum
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Kurum Adı */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 block">Eğitim Verilecek Kurum / İşyeri <span className="text-red-500">*</span></label>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          disabled={!isMudur}
                          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold disabled:opacity-50"
                          placeholder="Örn: Organize Sanayi Bölgesi A.Ş. veya okul adı"
                          value={eduForm.kurum_adi}
                          onChange={(e) => setEduForm(prev => ({ ...prev, kurum_adi: e.target.value }))}
                        />
                        <select
                          disabled={!isMudur}
                          className="w-48 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold disabled:opacity-50"
                          value={eduForm.kurum_id || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            const match = blacklistList.find(x => x.id === val)
                            setEduForm(prev => ({
                              ...prev,
                              kurum_id: val,
                              kurum_adi: match ? match.kurum_adi : prev.kurum_adi
                            }))
                          }}
                        >
                          <option value="">Kayıtlı Kurum Seç...</option>
                          {blacklistList.filter(x => !x.aktif_durum).map(x => (
                            <option key={x.id} value={x.id}>{x.kurum_adi}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Kurum Tipi */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 block">Kurum Tipi <span className="text-red-500">*</span></label>
                      <select
                        disabled={!isMudur}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold disabled:opacity-50"
                        value={eduForm.kurum_tipi}
                        onChange={(e) => setEduForm(prev => ({ ...prev, kurum_tipi: e.target.value }))}
                      >
                        <option value="Isyeri">İşyeri</option>
                        <option value="Okul">Okul</option>
                        <option value="Kamu Kurumu">Kamu Kurumu</option>
                        <option value="Itfaiye Ziyaret">İtfaiye Ziyaret</option>
                        <option value="Ev-Site">Ev-Site</option>
                        <option value="Ekip Egitimi">Ekip Eğitimi</option>
                      </select>
                    </div>

                    {/* Eğitim Türü */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Eğitim / Tatbikat Türü</label>
                      <select
                        disabled={!isMudur}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold disabled:opacity-50"
                        value={eduForm.egitim_turu}
                        onChange={(e) => setEduForm(prev => ({ ...prev, egitim_turu: e.target.value }))}
                      >
                        <option value="Yangın Önleme ve Temel Yangın Eğitimi">Yangın Önleme ve Temel Yangın Eğitimi</option>
                        <option value="SCBA Maske ve Temiz Hava Cihazı Eğitimi">SCBA Maske ve Temiz Hava Cihazı Eğitimi</option>
                        <option value="Arama Kurtarma ve Tahliye Tatbikatı">Arama Kurtarma ve Tahliye Tatbikatı</option>
                        <option value="Endüstriyel Yangın Güvenliği Eğitimi">Endüstriyel Yangın Güvenliği Eğitimi</option>
                        <option value="Dahili Teşkilat Eğitimi / Tatbikatı">Dahili Teşkilat Eğitimi / Tatbikatı</option>
                      </select>
                    </div>

                    {/* Kişi Sayısı */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Katılımcı / Kişi Sayısı</label>
                      <input
                        type="number"
                        min={1}
                        disabled={!isMudur}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-medium disabled:opacity-50"
                        value={eduForm.kisi_sayisi}
                        onChange={(e) => setEduForm(prev => ({ ...prev, kisi_sayisi: e.target.value }))}
                      />
                    </div>

                    {/* Tarih */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Planlanan Tarih</label>
                      <input
                        type="date"
                        disabled={!isMudur}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition font-semibold disabled:opacity-50"
                        value={eduForm.planlanan_tarih}
                        onChange={(e) => setEduForm(prev => ({ ...prev, planlanan_tarih: e.target.value }))}
                      />
                    </div>

                    {/* Saat Dilimi */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">Saat Dilimi</label>
                      <select
                        disabled={!isMudur}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold disabled:opacity-50"
                        value={eduForm.saat_slot}
                        onChange={(e) => setEduForm(prev => ({ ...prev, saat_slot: e.target.value }))}
                      >
                        {CALENDAR_SLOTS.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>

                    {/* Durum */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 block">Program Onay Durumu</label>
                      <select
                        disabled={!isMudur}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-semibold disabled:opacity-50"
                        value={eduForm.durum}
                        onChange={(e) => setEduForm(prev => ({ ...prev, durum: e.target.value }))}
                      >
                        <option value="Beklemede">Beklemede (Onay Bekliyor)</option>
                        <option value="Onaylandı">Onaylandı (Takvime Eklendi)</option>
                        <option value="Tamamlandı">Tamamlandı (Eğitim Tamamlandı)</option>
                        <option value="İptal">İptal Edildi</option>
                      </select>
                    </div>

                    {/* Eğitimci Personel Çoklu Seçim (Grid Checkbox list) */}
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Görevli Eğitimci Personel(ler) <span className="text-zinc-500">(Çoklu Seçim)</span></label>
                      
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 scrollbar-thin">
                        {personnelList.map(p => {
                          const isChecked = eduForm.egitimci_personel_ids.includes(p.id)
                          return (
                            <label key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-900 cursor-pointer select-none transition">
                              <input
                                type="checkbox"
                                disabled={!isMudur}
                                className="rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 disabled:opacity-50"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEduForm(prev => ({
                                      ...prev,
                                      egitimci_personel_ids: [...prev.egitimci_personel_ids, p.id]
                                    }))
                                  } else {
                                    setEduForm(prev => ({
                                      ...prev,
                                      egitimci_personel_ids: prev.egitimci_personel_ids.filter(id => id !== p.id)
                                    }))
                                  }
                                }}
                              />
                              <div className="text-xs font-semibold text-zinc-200">
                                {p.ad} {p.soyad} <span className="text-[10px] text-zinc-500">({p.unvan || 'Er'})</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                  </div>

                </CardContent>

                <div className="bg-zinc-900/40 border-t border-zinc-800/80 p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {eduForm.id && isMudur && (
                      <Button
                        type="button"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                        onClick={() => handleDeleteEducation(eduForm.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Programı Sil
                      </Button>
                    )}
                    {eduForm.id && (
                      <Button
                        type="button"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                        onClick={() => handlePrintZiyaretRaporu(eduForm)}
                      >
                        <FileText className="w-4 h-4" /> Ziyaret ve Sonuç Raporu Bas
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/60 font-semibold px-4 py-2 rounded-xl text-xs"
                      onClick={() => setIsProgramModalOpen(false)}
                    >
                      Vazgeç
                    </Button>
                    {isMudur && (
                      <Button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition"
                        disabled={isSavingEdu || (activeBlacklistedInst !== null && !blacklistAcknowledged)}
                      >
                        {isSavingEdu ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" /> Programı Kaydet
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
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
