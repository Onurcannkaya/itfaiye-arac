"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { 
  AlertCircle, FileText, CheckCircle2, Clock, MapPin, 
  Loader2, Plus, ArrowLeft, Search, Flame, Droplets, 
  Activity, ArrowRight, UserPlus, Phone, Home as HomeIcon,
  HeartPulse, Shield, Crosshair, UploadCloud
} from "lucide-react"

type Incident = any;
type Personnel = any;
type Vehicle = any;

const KURUMLAR = ["Polis 112", "Jandarma 112", "Acil Sağlık 112", "Elektrik 186", "Doğalgaz 187", "AFAD", "Orman 177"]
const BINA_TURLERI = ["Betonarme", "Ahşap", "Çelik", "Yığma", "Prefabrik", "Karma", "Belirtilmemiş / Diğer"]
const CIKIS_SEBEPLERI = ["Bilinmiyor", "Elektrik Kontağı", "Baca Kurumu", "Kasıt / Sabotaj", "Açık Ateş / Soba", "Doğalgaz / LPG Sızıntısı", "Sigara İzmariti", "Yıldırım Düşmesi", "Diğer"]

export default function OlaylarPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [personnelList, setPersonnelList] = useState<Personnel[]>([])
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  
  // Form State
  const [formData, setFormData] = useState({
    // Step 1: İhbar
    olay_turu: "Yangın",
    ihbar_saati: "", cikis_saati: "", varis_saati: "", donus_saati: "",
    ihbar_eden_ad_soyad: "", ihbar_eden_tel: "",
    bildirilen_kurumlar: [] as string[],
    
    // Step 2: Adres ve Bina
    mahalle: "", adres: "",
    bina_yapi_malzemesi: "Belirtilmemiş / Diğer",
    yangin_baslangic_yeri: "",
    sigorta_durumu: "",
    
    // Step 3: Müdahale ve Sarfiyat
    kullanilan_su_ton: "", kullanilan_kopuk_litre: "", kullanilan_kkt_kg: "",
    
    // Step 4: Sonuç ve Kayıplar
    cikis_sebebi: "Bilinmiyor",
    hasar_durumu: "Yok",
    olay_teslim_edilen_kisi: "",
    aciklama: "",
    
    // Kayıplar (Sayısal)
    olu_halk: "0", yarali_halk: "0", kurtarilan_halk: "0",
    olu_itfaiye: "0", yarali_itfaiye: "0",
    kurtarilan_hayvan: "0", olen_hayvan: "0"
  })
  
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])

  const [personnelSearch, setPersonnelSearch] = useState("")
  const [vehicleSearch, setVehicleSearch] = useState("")
  
  const [mediaFiles, setMediaFiles] = useState<File[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      const [incRes, perRes, vehRes] = await Promise.all([
        supabase.from('incidents').select('*').order('created_at', { ascending: false }),
        supabase.from('personnel').select('*').eq('aktif', true).order('ad', { ascending: true }),
        supabase.from('vehicles').select('*').order('plaka', { ascending: true })
      ])
      
      if (incRes.data) setIncidents(incRes.data)
      if (perRes.data) setPersonnelList(perRes.data)
      if (vehRes.data) setVehicleList(vehRes.data)
      
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleKurum = (kurum: string) => {
    if (formData.bildirilen_kurumlar.includes(kurum)) {
      setFormData({ ...formData, bildirilen_kurumlar: formData.bildirilen_kurumlar.filter(k => k !== kurum) })
    } else {
      setFormData({ ...formData, bildirilen_kurumlar: [...formData.bildirilen_kurumlar, kurum] })
    }
  }

  const togglePersonnel = (sicil_no: string) => {
    if (selectedPersonnel.includes(sicil_no)) {
      setSelectedPersonnel(selectedPersonnel.filter(id => id !== sicil_no))
    } else {
      setSelectedPersonnel([...selectedPersonnel, sicil_no])
    }
  }

  const toggleVehicle = (plaka: string) => {
    if (selectedVehicles.includes(plaka)) {
      setSelectedVehicles(selectedVehicles.filter(id => id !== plaka))
    } else {
      setSelectedVehicles([...selectedVehicles, plaka])
    }
  }

  const resetForm = () => {
    setIsAdding(false)
    setStep(1)
    setSelectedPersonnel([])
    setSelectedVehicles([])
    setFormData({
      olay_turu: "Yangın", ihbar_saati: "", cikis_saati: "", varis_saati: "", donus_saati: "",
      ihbar_eden_ad_soyad: "", ihbar_eden_tel: "", bildirilen_kurumlar: [],
      mahalle: "", adres: "", bina_yapi_malzemesi: "Belirtilmemiş / Diğer", yangin_baslangic_yeri: "", sigorta_durumu: "",
      kullanilan_su_ton: "", kullanilan_kopuk_litre: "", kullanilan_kkt_kg: "",
      cikis_sebebi: "Bilinmiyor", hasar_durumu: "Yok", olay_teslim_edilen_kisi: "", aciklama: "",
      olu_halk: "0", yarali_halk: "0", kurtarilan_halk: "0",
      olu_itfaiye: "0", yarali_itfaiye: "0", kurtarilan_hayvan: "0", olen_hayvan: "0"
    })
    setMediaFiles([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()
    
    try {
      const payload = {
        ...formData,
        kullanilan_su_ton: Number(formData.kullanilan_su_ton) || 0,
        kullanilan_kopuk_litre: Number(formData.kullanilan_kopuk_litre) || 0,
        kullanilan_kkt_kg: Number(formData.kullanilan_kkt_kg) || 0,
        olu_halk: Number(formData.olu_halk) || 0,
        yarali_halk: Number(formData.yarali_halk) || 0,
        kurtarilan_halk: Number(formData.kurtarilan_halk) || 0,
        olu_itfaiye: Number(formData.olu_itfaiye) || 0,
        yarali_itfaiye: Number(formData.yarali_itfaiye) || 0,
        kurtarilan_hayvan: Number(formData.kurtarilan_hayvan) || 0,
        olen_hayvan: Number(formData.olen_hayvan) || 0,
      }
      
      const { data: incData, error: incErr } = await supabase
        .from('incidents')
        .insert(payload)
        .select()
        .single()
        
      if (incErr) throw incErr
      
      const incidentId = incData.id

      if (selectedPersonnel.length > 0) {
        const pPayload = selectedPersonnel.map(sicil_no => ({ incident_id: incidentId, sicil_no, gorev: "Müdahale Personeli" }))
        await supabase.from('incident_personnel').insert(pPayload)
      }

      if (selectedVehicles.length > 0) {
        const vPayload = selectedVehicles.map(plaka => ({ incident_id: incidentId, plaka, gorev_turu: "Müdahale Aracı" }))
        await supabase.from('incident_vehicles').insert(vPayload)
      }

      // Upload Media Files
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${incidentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('incident_vault')
            .upload(fileName, file)
            
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('incident_vault').getPublicUrl(fileName)
            const fileType = file.type.startsWith('video/') ? 'video' : 'fotoğraf'
            
            await supabase.from('incident_media').insert({
              incident_id: incidentId,
              url: publicUrlData.publicUrl,
              tip: fileType
            })
          } else {
            console.error("Dosya yükleme hatası:", uploadError)
          }
        }
      }

      resetForm()
      fetchData()
    } catch (error) {
      console.error(error)
      alert("Kayıt sırasında bir hata oluştu. Veritabanı tablolarının (014 migration) güncellendiğinden emin olun.")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPersonnel = personnelList.filter(p => 
    (p.ad + " " + p.soyad).toLowerCase().includes(personnelSearch.toLowerCase()) ||
    p.sicil_no.toLowerCase().includes(personnelSearch.toLowerCase())
  )

  const filteredVehicles = vehicleList.filter(v => 
    v.plaka.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.arac_tipi?.toLowerCase().includes(vehicleSearch.toLowerCase())
  )

  if (loading) {
    return <div className="p-8 text-center animate-pulse flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor...</div>
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vaka & Olay Raporları</h1>
          <p className="text-muted-foreground text-sm">Resmi EK-12, EK-16 ve EK-7 İtfaiye Olay Raporu</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Vaka Ekle
          </Button>
        )}
      </div>

      {isAdding ? (
        // ======================= WIZARD (STEPPER) FORM =======================
        <div className="space-y-6">
          
          {/* Stepper Header */}
          <div className="flex items-center justify-between overflow-x-auto hide-scrollbar border-b pb-4 gap-2">
            {[1, 2, 3, 4].map(num => (
              <div 
                key={num} 
                className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                  step === num ? 'bg-primary text-primary-foreground border-primary' : 
                  step > num ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface border-border text-muted-foreground'
                }`}
                onClick={() => setStep(num)}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-background/20 shrink-0">
                  {step > num ? <CheckCircle2 className="w-4 h-4" /> : num}
                </div>
                <span className="text-sm font-medium pr-1">
                  {num === 1 ? 'İhbar & Zaman' : num === 2 ? 'Olay Yeri & Bina' : num === 3 ? 'Ekipler & Sarfiyat' : 'Sonuç & Rapor'}
                </span>
              </div>
            ))}
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader className="bg-surface/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                {step === 1 && <><Phone className="w-5 h-5 text-primary" /> Adım 1: İhbar ve Zaman Bilgileri</>}
                {step === 2 && <><HomeIcon className="w-5 h-5 text-primary" /> Adım 2: Olay Yeri ve Bina Detayları</>}
                {step === 3 && <><Crosshair className="w-5 h-5 text-primary" /> Adım 3: Müdahale, Ekipler ve Sarfiyat</>}
                {step === 4 && <><FileText className="w-5 h-5 text-primary" /> Adım 4: Kayıplar ve Sonuç Raporu</>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit}>
                
                {/* STEP 1 */}
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Olay Türü *</label>
                        <select name="olay_turu" value={formData.olay_turu} onChange={handleInputChange} required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                          <option value="Yangın">Yangın</option>
                          <option value="Trafik Kazası">Trafik Kazası</option>
                          <option value="Kurtarma">Kurtarma</option>
                          <option value="Hayvan Kurtarma">Hayvan Kurtarma</option>
                          <option value="Su Baskını">Su Baskını</option>
                          <option value="Asılsız İhbar">Asılsız İhbar</option>
                          <option value="Eğitim/Tatbikat">Eğitim/Tatbikat</option>
                          <option value="Diğer">Diğer</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-surface/30">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">İhbar Eden Kişi</label>
                        <Input name="ihbar_eden_ad_soyad" placeholder="Ad Soyad" value={formData.ihbar_eden_ad_soyad} onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">İhbar Eden Tel</label>
                        <Input name="ihbar_eden_tel" placeholder="05XX XXX XX XX" value={formData.ihbar_eden_tel} onChange={handleInputChange} />
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">Bilgi Verilen Diğer Kurumlar (Çoklu Seçim)</label>
                        <div className="flex flex-wrap gap-2">
                          {KURUMLAR.map(kurum => {
                            const isSelected = formData.bildirilen_kurumlar.includes(kurum)
                            return (
                              <Badge 
                                key={kurum} 
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer ${isSelected ? 'bg-primary hover:bg-primary/90' : 'hover:bg-muted'}`}
                                onClick={() => toggleKurum(kurum)}
                              >
                                {kurum}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-surface/30">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">İhbar Saati</label>
                        <Input type="datetime-local" name="ihbar_saati" value={formData.ihbar_saati} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">İstasyondan Çıkış</label>
                        <Input type="datetime-local" name="cikis_saati" value={formData.cikis_saati} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Olay Yerine Varış</label>
                        <Input type="datetime-local" name="varis_saati" value={formData.varis_saati} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">İstasyona Dönüş</label>
                        <Input type="datetime-local" name="donus_saati" value={formData.donus_saati} onChange={handleInputChange} required />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Mahalle *</label>
                        <Input name="mahalle" placeholder="Örn: Alibaba" value={formData.mahalle} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold">Açık Adres *</label>
                        <Input name="adres" placeholder="Sokak, Cadde, Bina No..." value={formData.adres} onChange={handleInputChange} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-surface/30">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">Bina Yapı Malzemesi</label>
                        <select name="bina_yapi_malzemesi" value={formData.bina_yapi_malzemesi} onChange={handleInputChange} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                          {BINA_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">Sigorta Durumu</label>
                        <Input name="sigorta_durumu" placeholder="Örn: Sigortalı (Anadolu Sigorta)" value={formData.sigorta_durumu} onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-muted-foreground">Yangın / Olay Başlangıç Yeri</label>
                        <Input name="yangin_baslangic_yeri" placeholder="Örn: 2. Kat Mutfak, Bina Çatısı..." value={formData.yangin_baslangic_yeri} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Araçlar */}
                      <div className="border rounded-xl flex flex-col h-[350px]">
                        <div className="p-3 bg-surface border-b flex items-center justify-between">
                          <span className="font-semibold text-sm">Sevk Edilen Araçlar</span>
                          <Badge variant="outline">{selectedVehicles.length} Seçili</Badge>
                        </div>
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Araç Ara..." className="h-8 pl-8 text-xs" value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {filteredVehicles.map(v => (
                            <div key={v.plaka} onClick={() => toggleVehicle(v.plaka)} className={`p-2 text-sm rounded-lg cursor-pointer flex items-center justify-between border ${selectedVehicles.includes(v.plaka) ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-background hover:bg-surface border-transparent'}`}>
                              <span>{v.plaka} <span className="text-xs opacity-60 ml-1">({v.arac_tipi})</span></span>
                              {selectedVehicles.includes(v.plaka) && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Personel */}
                      <div className="border rounded-xl flex flex-col h-[350px]">
                        <div className="p-3 bg-surface border-b flex items-center justify-between">
                          <span className="font-semibold text-sm">Müdahale Eden Ekipler</span>
                          <Badge variant="outline">{selectedPersonnel.length} Seçili</Badge>
                        </div>
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Personel Ara..." className="h-8 pl-8 text-xs" value={personnelSearch} onChange={e => setPersonnelSearch(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {filteredPersonnel.map(p => (
                            <div key={p.sicil_no} onClick={() => togglePersonnel(p.sicil_no)} className={`p-2 text-sm rounded-lg cursor-pointer flex items-center justify-between border ${selectedPersonnel.includes(p.sicil_no) ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-background hover:bg-surface border-transparent'}`}>
                              <span>{p.ad} {p.soyad} <span className="text-xs opacity-60 ml-1">({p.unvan})</span></span>
                              {selectedPersonnel.includes(p.sicil_no) && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {(formData.olay_turu === 'Yangın' || formData.olay_turu === 'Trafik Kazası') && (
                      <div className="p-4 border border-danger/20 bg-danger/5 rounded-xl">
                        <h3 className="font-semibold text-danger flex items-center gap-2 mb-4"><Flame className="w-4 h-4" /> Sarfiyat Miktarları</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500" /> Su (Ton)</label>
                            <Input type="number" min="0" step="0.1" name="kullanilan_su_ton" value={formData.kullanilan_su_ton} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3 text-warning" /> Köpük (Litre)</label>
                            <Input type="number" min="0" step="0.1" name="kullanilan_kopuk_litre" value={formData.kullanilan_kopuk_litre} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">KKT (Kg)</label>
                            <Input type="number" min="0" step="0.1" name="kullanilan_kkt_kg" value={formData.kullanilan_kkt_kg} onChange={handleInputChange} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Çıkış Sebebi</label>
                        <select name="cikis_sebebi" value={formData.cikis_sebebi} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          {CIKIS_SEBEPLERI.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Hasar Durumu</label>
                        <select name="hasar_durumu" value={formData.hasar_durumu} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="Yok">Yok</option>
                          <option value="Maddi Hasarlı">Maddi Hasarlı</option>
                          <option value="Yaralanmalı">Yaralanmalı</option>
                          <option value="Can Kayıplı">Can Kayıplı</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-xl bg-surface/30">
                      {/* Halk */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Siviller (Halk)</h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><label className="text-[10px] uppercase text-muted-foreground">Ölü</label><Input type="number" min="0" name="olu_halk" value={formData.olu_halk} onChange={handleInputChange} className="text-center" /></div>
                          <div><label className="text-[10px] uppercase text-muted-foreground">Yaralı</label><Input type="number" min="0" name="yarali_halk" value={formData.yarali_halk} onChange={handleInputChange} className="text-center" /></div>
                          <div><label className="text-[10px] uppercase text-muted-foreground">Kurtarılan</label><Input type="number" min="0" name="kurtarilan_halk" value={formData.kurtarilan_halk} onChange={handleInputChange} className="text-center" /></div>
                        </div>
                      </div>
                      {/* İtfaiye */}
                      <div className="space-y-4 border-l pl-6">
                        <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> İtfaiye Personeli</h4>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div><label className="text-[10px] uppercase text-muted-foreground">Ölü</label><Input type="number" min="0" name="olu_itfaiye" value={formData.olu_itfaiye} onChange={handleInputChange} className="text-center" /></div>
                          <div><label className="text-[10px] uppercase text-muted-foreground">Yaralı</label><Input type="number" min="0" name="yarali_itfaiye" value={formData.yarali_itfaiye} onChange={handleInputChange} className="text-center" /></div>
                        </div>
                      </div>
                      {/* Hayvan */}
                      <div className="space-y-4 border-l pl-6">
                        <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2"><HeartPulse className="w-4 h-4" /> Hayvanlar</h4>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div><label className="text-[10px] uppercase text-muted-foreground">Ölen</label><Input type="number" min="0" name="olen_hayvan" value={formData.olen_hayvan} onChange={handleInputChange} className="text-center" /></div>
                          <div><label className="text-[10px] uppercase text-muted-foreground">Kurtarılan</label><Input type="number" min="0" name="kurtarilan_hayvan" value={formData.kurtarilan_hayvan} onChange={handleInputChange} className="text-center" /></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Olay Yeri Kime Teslim Edildi?</label>
                      <Input name="olay_teslim_edilen_kisi" placeholder="Örn: Ev sahibi Ahmet Yılmaz, Polis Memuru..." value={formData.olay_teslim_edilen_kisi} onChange={handleInputChange} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Detaylı Sonuç Raporu / Açıklama</label>
                      <textarea 
                        name="aciklama" rows={4}
                        placeholder="Olayın seyrini ve müdahale şeklini detaylıca yazınız..." 
                        value={formData.aciklama} onChange={handleInputChange} 
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2 p-4 border border-dashed border-primary/50 rounded-xl bg-primary/5">
                      <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <UploadCloud className="w-5 h-5" /> Olay Medya Arşivi (Fotoğraf / Video)
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">Çoklu dosya seçebilirsiniz. Rapor kaydedildiğinde bulut arşive yüklenecektir.</p>
                      <Input 
                        type="file" 
                        multiple 
                        accept="image/*,video/*"
                        onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                        className="bg-background cursor-pointer"
                      />
                      {mediaFiles.length > 0 && (
                        <div className="mt-2 text-sm text-primary font-medium">
                          {mediaFiles.length} dosya seçildi.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Footer Navigation */}
                <div className="flex items-center justify-between mt-8 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => step > 1 ? setStep(step - 1) : resetForm()}>
                    {step > 1 ? 'Önceki Adım' : 'İptal'}
                  </Button>
                  
                  {step < 4 ? (
                    <Button type="button" onClick={() => setStep(step + 1)}>
                      Sonraki Adım <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : 'Resmi Raporu Kaydet'}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        // ======================= LIST VIEW =======================
        <div className="grid grid-cols-1 gap-4">
          {incidents.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-surface/50">
              Henüz girilmiş bir vaka kaydı bulunmamaktadır.
            </div>
          ) : (
            incidents.map(inc => (
              <Card key={inc.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      inc.olay_turu === 'Yangın' ? 'bg-danger/10 text-danger' : 
                      inc.olay_turu === 'Asılsız İhbar' ? 'bg-muted text-muted-foreground' : 
                      'bg-warning/10 text-warning'
                    }`}>
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={inc.olay_turu === 'Asılsız İhbar' ? 'outline' : 'default'} className={inc.olay_turu === 'Yangın' ? 'bg-danger hover:bg-danger/90' : ''}>
                          {inc.olay_turu}
                        </Badge>
                        <span className="font-semibold text-lg">{inc.mahalle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{inc.adres}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> İhbar: {new Date(inc.ihbar_saati).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {inc.cikis_sebebi && <span className="opacity-50">| Sebep: {inc.cikis_sebebi}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col gap-2 items-end sm:min-w-[150px]">
                    <Button variant="outline" size="sm" className="w-full">
                      EK-16 Raporunu Gör
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

    </div>
  )
}
