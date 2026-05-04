"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Loader2, Wrench, Plus, UploadCloud, Camera, Image as ImageIcon, Search, Banknote, Gauge } from "lucide-react"

type Maintenance = any;
type Vehicle = any;
type Personnel = any;

const ISLEM_TURLERI = ['Periyodik Bakım', 'Arıza/Tamir', 'Yağ Değişimi', 'Lastik', 'Kaza/Hasar', 'Diğer']

export default function AracBakimPage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Storage
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    plaka: "",
    islem_turu: "Arıza/Tamir",
    kilometre: "",
    aciklama: "",
    maliyet: "",
    kaydi_acan_sicil_no: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const [mainRes, vehRes, perRes] = await Promise.all([
        supabase.from('vehicle_maintenances').select('*').order('tarih', { ascending: false }),
        supabase.from('vehicles').select('*').order('plaka', { ascending: true }),
        supabase.from('personnel').select('*').eq('aktif', true).order('ad', { ascending: true })
      ])
      if (mainRes.data) setMaintenances(mainRes.data)
      if (vehRes.data) setVehicles(vehRes.data)
      if (perRes.data) setPersonnel(perRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      // Show local preview immediately
      setPreviewUrl(URL.createObjectURL(selectedFile))
    }
  }

  const uploadImage = async (selectedFile: File): Promise<string | null> => {
    setUploading(true)
    const supabase = createClient()
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `arizalar/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('vehicle_evidence')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('vehicle_evidence').getPublicUrl(filePath)
      return data.publicUrl
    } catch (error) {
      console.error('Error uploading image: ', error)
      alert('Fotoğraf yüklenirken hata oluştu! Storage ayarlarınızı (RLS ve Bucket) kontrol edin.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plaka) {
      alert("Lütfen araç plakası seçin.")
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    
    try {
      let finalPhotoUrl = null

      // If file exists, upload to Supabase Storage first
      if (file) {
        finalPhotoUrl = await uploadImage(file)
        if (!finalPhotoUrl) {
          setSubmitting(false)
          return // Stop submission if image upload failed
        }
      }

      const payload = {
        ...formData,
        kilometre: Number(formData.kilometre) || 0,
        maliyet: Number(formData.maliyet) || 0,
        fotograf_url: finalPhotoUrl
      }
      
      const { error } = await supabase.from('vehicle_maintenances').insert(payload)
        
      if (error) throw error

      setIsAdding(false)
      setFile(null)
      setPreviewUrl(null)
      setFormData({
        plaka: "", islem_turu: "Arıza/Tamir", kilometre: "", aciklama: "", maliyet: "", kaydi_acan_sicil_no: ""
      })
      fetchData()
    } catch (error) {
      console.error(error)
      alert("Kayıt sırasında hata oluştu. Lütfen veritabanı migration dosyasını (016) çalıştırdığınızdan emin olun.")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (durum: string) => {
    switch (durum) {
      case 'Tamamlandı': return <Badge className="bg-success hover:bg-success/90">Tamamlandı</Badge>
      case 'Serviste': return <Badge className="bg-warning hover:bg-warning/90">Serviste</Badge>
      default: return <Badge variant="outline" className="bg-muted">Bekliyor</Badge>
    }
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor...</div>
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Araç Arıza ve Bakım</h1>
          <p className="text-muted-foreground text-sm">Arıza bildirimleri, servis süreçleri ve onarım maliyetleri</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Arıza/Bakım Kaydı Ekle
          </Button>
        )}
      </div>

      {isAdding ? (
        <Card className="border-border animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="bg-surface/30 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" /> Yeni Kayıt Formu</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>İptal</Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">İşlem Yapılan Araç *</label>
                  <select name="plaka" value={formData.plaka} onChange={handleInputChange} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Araç Seçiniz...</option>
                    {vehicles.map(v => <option key={v.plaka} value={v.plaka}>{v.plaka} - {v.marka} {v.arac_tipi}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">İşlem Türü *</label>
                  <select name="islem_turu" value={formData.islem_turu} onChange={handleInputChange} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {ISLEM_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-surface/30">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2"><Gauge className="w-4 h-4 text-muted-foreground" /> Aracın Güncel Kilometresi</label>
                  <Input type="number" name="kilometre" placeholder="Örn: 125000" value={formData.kilometre} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2"><Banknote className="w-4 h-4 text-muted-foreground" /> Fatura / Maliyet (₺)</label>
                  <Input type="number" step="0.01" min="0" name="maliyet" placeholder="Örn: 4500" value={formData.maliyet} onChange={handleInputChange} />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">Arıza/Yapılan İşlem Detayı</label>
                  <textarea name="aciklama" rows={3} placeholder="Araç sol ön lastik patlamış, stepne takılmıştır..." value={formData.aciklama} onChange={handleInputChange} required className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">Kaydı Açan / Arızayı Bildiren Personel</label>
                  <select name="kaydi_acan_sicil_no" value={formData.kaydi_acan_sicil_no} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Personel Seçiniz...</option>
                    {personnel.map(p => <option key={p.sicil_no} value={p.sicil_no}>{p.ad} {p.soyad} ({p.unvan})</option>)}
                  </select>
                </div>
              </div>

              {/* FOTOĞRAF YÜKLEME ALANI */}
              <div className="p-4 border border-dashed border-primary/40 bg-primary/5 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">Fotoğraflı Kanıt (Arıza / Hasar Durumu)</h3>
                    <p className="text-xs text-muted-foreground">Kamera ile çekin veya galeriden seçin</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group cursor-pointer border-2 border-primary/20 hover:border-primary/50 transition-colors rounded-xl bg-background w-full sm:w-64 h-40 flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="Arıza Önizleme" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Fotoğraf Yüklemek İçin Tıklayın</span>
                      </div>
                    )}
                    {/* Capture="environment" triggers rear camera on mobile */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {previewUrl && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setFile(null); setPreviewUrl(null); }}>
                      Fotoğrafı Kaldır
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={submitting || uploading}>
                  {submitting || uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {uploading ? 'Fotoğraf Yükleniyor...' : 'Kaydediliyor...'}</> : 'Kaydı Oluştur'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maintenances.length === 0 ? (
            <div className="col-span-full text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-surface/50">
              Henüz girilmiş bir araç arıza veya bakım kaydı bulunmamaktadır.
            </div>
          ) : (
            maintenances.map(m => (
              <Card key={m.id} className="hover:border-primary/50 transition-all hover:shadow-md overflow-hidden flex flex-col">
                {m.fotograf_url && (
                  <div className="w-full h-48 bg-muted relative border-b">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.fotograf_url} alt="Arıza" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white">
                      <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-none">{m.islem_turu}</Badge>
                    </div>
                  </div>
                )}
                
                <CardContent className={`p-5 flex-1 flex flex-col ${!m.fotograf_url ? 'pt-5' : 'pt-4'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg bg-surface px-3 py-1 rounded-md border tracking-wider">{m.plaka}</span>
                    {getStatusBadge(m.durum)}
                  </div>
                  
                  {!m.fotograf_url && (
                    <Badge variant="outline" className="w-fit mb-3">{m.islem_turu}</Badge>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                    {m.aciklama}
                  </p>

                  <div className="space-y-2 mt-auto text-xs font-mono bg-surface p-3 rounded-xl border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tarih</span>
                      <span>{new Date(m.tarih).toLocaleDateString('tr-TR')}</span>
                    </div>
                    {m.kilometre && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Kilometre</span>
                        <span>{m.kilometre.toLocaleString('tr-TR')} KM</span>
                      </div>
                    )}
                    {m.maliyet > 0 && (
                      <div className="flex justify-between items-center pt-2 mt-2 border-t font-semibold text-sm">
                        <span>Maliyet</span>
                        <span className="text-danger">{m.maliyet.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    )}
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
