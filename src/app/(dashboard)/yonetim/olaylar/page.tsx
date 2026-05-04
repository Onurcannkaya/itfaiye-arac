"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { AlertCircle, FileText, CheckCircle2, Clock, MapPin, Loader2, Plus, ArrowLeft, Search, Flame, Droplets, Activity } from "lucide-react"

type Incident = any; // TODO
type Personnel = any; // TODO
type Vehicle = any; // TODO

export default function OlaylarPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [personnelList, setPersonnelList] = useState<Personnel[]>([])
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    olay_turu: "Yangın",
    ihbar_saati: "",
    cikis_saati: "",
    varis_saati: "",
    donus_saati: "",
    mahalle: "",
    adres: "",
    aciklama: "",
    kullanilan_su_ton: "",
    kullanilan_kopuk_litre: "",
    kullanilan_kkt_kg: "",
    hasar_durumu: "Yok"
  })
  
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])

  const [personnelSearch, setPersonnelSearch] = useState("")
  const [vehicleSearch, setVehicleSearch] = useState("")

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()
    
    try {
      // 1. Insert Incident
      const incidentPayload = {
        ...formData,
        kullanilan_su_ton: Number(formData.kullanilan_su_ton) || 0,
        kullanilan_kopuk_litre: Number(formData.kullanilan_kopuk_litre) || 0,
        kullanilan_kkt_kg: Number(formData.kullanilan_kkt_kg) || 0,
      }
      
      const { data: incData, error: incErr } = await supabase
        .from('incidents')
        .insert(incidentPayload)
        .select()
        .single()
        
      if (incErr) throw incErr
      
      const incidentId = incData.id

      // 2. Insert Personnel Pivot
      if (selectedPersonnel.length > 0) {
        const personnelPayload = selectedPersonnel.map(sicil_no => ({
          incident_id: incidentId,
          sicil_no: sicil_no,
          gorev: "Müdahale Personeli" // Default
        }))
        await supabase.from('incident_personnel').insert(personnelPayload)
      }

      // 3. Insert Vehicle Pivot
      if (selectedVehicles.length > 0) {
        const vehiclesPayload = selectedVehicles.map(plaka => ({
          incident_id: incidentId,
          plaka: plaka,
          gorev_turu: "Müdahale Aracı" // Default
        }))
        await supabase.from('incident_vehicles').insert(vehiclesPayload)
      }

      // Reset and reload
      setIsAdding(false)
      setFormData({
        olay_turu: "Yangın", ihbar_saati: "", cikis_saati: "", varis_saati: "", donus_saati: "",
        mahalle: "", adres: "", aciklama: "", kullanilan_su_ton: "", kullanilan_kopuk_litre: "",
        kullanilan_kkt_kg: "", hasar_durumu: "Yok"
      })
      setSelectedPersonnel([])
      setSelectedVehicles([])
      fetchData()

    } catch (error) {
      console.error(error)
      alert("Kayıt sırasında bir hata oluştu.")
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
    return <div className="p-8 text-center animate-pulse text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor...</div>
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vaka & Olay Raporları</h1>
          <p className="text-muted-foreground text-sm">İstasyon dışı müdahale ve vaka kayıtları</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Vaka Ekle
          </Button>
        )}
      </div>

      {isAdding ? (
        // ======================= ADD FORM =======================
        <Card className="border-border">
          <CardHeader className="border-b bg-surface flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Vaka Giriş Formu
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              İptal
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Olay Türü & Hasar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Olay Türü *</label>
                  <select 
                    name="olay_turu" 
                    value={formData.olay_turu} 
                    onChange={handleInputChange}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
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
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Hasar Durumu</label>
                  <select 
                    name="hasar_durumu" 
                    value={formData.hasar_durumu} 
                    onChange={handleInputChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Yok">Yok</option>
                    <option value="Maddi Hasarlı">Maddi Hasarlı</option>
                    <option value="Yaralanmalı">Yaralanmalı</option>
                    <option value="Can Kayıplı">Can Kayıplı</option>
                  </select>
                </div>
              </div>

              {/* Zaman Çizelgesi */}
              <div className="space-y-4 border p-4 rounded-xl bg-surface/50">
                <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /> Zaman Çizelgesi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Lokasyon */}
              <div className="space-y-4 border p-4 rounded-xl bg-surface/50">
                <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> Olay Yeri</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Mahalle</label>
                    <Input type="text" name="mahalle" placeholder="Örn: Alibaba" value={formData.mahalle} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Açık Adres</label>
                    <Input type="text" name="adres" placeholder="Sokak, Cadde, Bina No..." value={formData.adres} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Açıklama / Müdahale Detayı</label>
                  <textarea 
                    name="aciklama" 
                    rows={3}
                    placeholder="Olayın nasıl gerçekleştiği ve nasıl müdahale edildiği..." 
                    value={formData.aciklama} 
                    onChange={handleInputChange} 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Sarfiyat */}
              {(formData.olay_turu === 'Yangın' || formData.olay_turu === 'Trafik Kazası') && (
                <div className="space-y-4 border p-4 rounded-xl bg-danger/5 border-danger/10">
                  <h3 className="font-semibold text-danger flex items-center gap-2"><Flame className="w-4 h-4" /> Sarfiyat Miktarları</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500" /> Kullanılan Su (Ton)</label>
                      <Input type="number" min="0" step="0.1" name="kullanilan_su_ton" value={formData.kullanilan_su_ton} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3 text-warning" /> Kullanılan Köpük (Litre)</label>
                      <Input type="number" min="0" step="0.1" name="kullanilan_kopuk_litre" value={formData.kullanilan_kopuk_litre} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Kullanılan KKT (Kg)</label>
                      <Input type="number" min="0" step="0.1" name="kullanilan_kkt_kg" value={formData.kullanilan_kkt_kg} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              )}

              {/* Müdahale Ekibi (Multi-select) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Araçlar */}
                <div className="border rounded-xl flex flex-col h-[300px]">
                  <div className="p-3 bg-surface border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">Müdahale Eden Araçlar</span>
                    <Badge variant="outline">{selectedVehicles.length} Seçili</Badge>
                  </div>
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Araç Ara..." className="h-8 pl-8 text-xs" value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredVehicles.map(v => {
                      const isSelected = selectedVehicles.includes(v.plaka)
                      return (
                        <div 
                          key={v.plaka} 
                          onClick={() => toggleVehicle(v.plaka)}
                          className={`p-2 text-sm rounded-lg cursor-pointer flex items-center justify-between border ${isSelected ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-background hover:bg-surface border-transparent'}`}
                        >
                          <span>{v.plaka} <span className="text-xs opacity-60 ml-1">({v.arac_tipi || 'Araç'})</span></span>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Personel */}
                <div className="border rounded-xl flex flex-col h-[300px]">
                  <div className="p-3 bg-surface border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">Müdahale Eden Personel</span>
                    <Badge variant="outline">{selectedPersonnel.length} Seçili</Badge>
                  </div>
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Personel Ara..." className="h-8 pl-8 text-xs" value={personnelSearch} onChange={e => setPersonnelSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredPersonnel.map(p => {
                      const isSelected = selectedPersonnel.includes(p.sicil_no)
                      return (
                        <div 
                          key={p.sicil_no} 
                          onClick={() => togglePersonnel(p.sicil_no)}
                          className={`p-2 text-sm rounded-lg cursor-pointer flex items-center justify-between border ${isSelected ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-background hover:bg-surface border-transparent'}`}
                        >
                          <span>{p.ad} {p.soyad} <span className="text-xs opacity-60 ml-1">({p.unvan})</span></span>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : 'Vaka Raporunu Kaydet'}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col gap-2 items-end sm:min-w-[150px]">
                    <Button variant="outline" size="sm" className="w-full">
                      Detayları Gör
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
