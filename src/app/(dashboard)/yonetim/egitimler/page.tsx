"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Loader2, Calendar, Users, Plus, CheckCircle2, Search, GraduationCap } from "lucide-react"

type Activity = any;
type Personnel = any;

const FAALIYET_TURLERI = ["Eğitim", "Ziyaret", "Tatbikat"]
const ROLLER = ["Eğitmen", "Katılımcı", "Görevli", "Koordinatör", "Denetmen"]

export default function EgitimlerPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [personnelList, setPersonnelList] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [personnelSearch, setPersonnelSearch] = useState("")
  
  // Array of {sicil_no, rol}
  const [selectedPersonnel, setSelectedPersonnel] = useState<{sicil_no: string, rol: string}[]>([])

  const [formData, setFormData] = useState({
    faaliyet_turu: "Eğitim",
    faaliyet_konusu: "",
    baslangic_tarihi: "",
    bitis_tarihi: "",
    toplam_sure_saat: "",
    katilimci_sayisi: "",
    hedef_kitle: "",
    aciklama: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const [actRes, perRes] = await Promise.all([
        supabase.from('activities_and_trainings').select('*').order('baslangic_tarihi', { ascending: false }),
        supabase.from('personnel').select('*').eq('aktif', true).order('ad', { ascending: true })
      ])
      if (actRes.data) setActivities(actRes.data)
      if (perRes.data) setPersonnelList(perRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const togglePersonnel = (sicil_no: string) => {
    const existing = selectedPersonnel.find(p => p.sicil_no === sicil_no)
    if (existing) {
      setSelectedPersonnel(selectedPersonnel.filter(p => p.sicil_no !== sicil_no))
    } else {
      setSelectedPersonnel([...selectedPersonnel, { sicil_no, rol: "Katılımcı" }])
    }
  }

  const updatePersonnelRole = (sicil_no: string, newRole: string) => {
    setSelectedPersonnel(selectedPersonnel.map(p => p.sicil_no === sicil_no ? { ...p, rol: newRole } : p))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()
    
    try {
      const payload = {
        ...formData,
        toplam_sure_saat: Number(formData.toplam_sure_saat) || 0,
        katilimci_sayisi: Number(formData.katilimci_sayisi) || 0,
      }
      
      const { data: actData, error: actErr } = await supabase
        .from('activities_and_trainings')
        .insert(payload)
        .select()
        .single()
        
      if (actErr) throw actErr

      if (selectedPersonnel.length > 0) {
        const pivotPayload = selectedPersonnel.map(p => ({
          activity_id: actData.id,
          sicil_no: p.sicil_no,
          rol: p.rol
        }))
        await supabase.from('personnel_activities').insert(pivotPayload)
      }

      setIsAdding(false)
      setSelectedPersonnel([])
      setFormData({
        faaliyet_turu: "Eğitim", faaliyet_konusu: "", baslangic_tarihi: "", bitis_tarihi: "",
        toplam_sure_saat: "", katilimci_sayisi: "", hedef_kitle: "", aciklama: ""
      })
      fetchData()
    } catch (error) {
      console.error(error)
      alert("Kayıt sırasında hata oluştu.")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPersonnel = personnelList.filter(p => 
    (p.ad + " " + p.soyad).toLowerCase().includes(personnelSearch.toLowerCase()) ||
    p.sicil_no.toLowerCase().includes(personnelSearch.toLowerCase())
  )

  if (loading) {
    return <div className="p-8 text-center animate-pulse flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor...</div>
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Eğitim ve Faaliyetler</h1>
          <p className="text-muted-foreground text-sm">Kurum içi eğitimler, okul ziyaretleri ve tatbikat kayıtları</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Faaliyet Ekle
          </Button>
        )}
      </div>

      {isAdding ? (
        <Card className="border-border">
          <CardHeader className="bg-surface/30 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Yeni Faaliyet / Eğitim Formu</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>İptal</Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Faaliyet Türü *</label>
                  <select name="faaliyet_turu" value={formData.faaliyet_turu} onChange={handleInputChange} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {FAALIYET_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Faaliyet Konusu *</label>
                  <Input name="faaliyet_konusu" placeholder="Örn: Temel Yangın Eğitimi" value={formData.faaliyet_konusu} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-xl bg-surface/30">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Başlangıç Tarihi *</label>
                  <Input type="datetime-local" name="baslangic_tarihi" value={formData.baslangic_tarihi} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Bitiş Tarihi</label>
                  <Input type="datetime-local" name="bitis_tarihi" value={formData.bitis_tarihi} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Toplam Süre (Saat)</label>
                  <Input type="number" step="0.5" min="0" name="toplam_sure_saat" value={formData.toplam_sure_saat} onChange={handleInputChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-surface/30">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Dış Katılımcı / Ziyaretçi Sayısı</label>
                  <Input type="number" min="0" name="katilimci_sayisi" value={formData.katilimci_sayisi} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Hedef Kitle / Kurum Adı</label>
                  <Input name="hedef_kitle" placeholder="Örn: Sivas Lisesi Öğrencileri" value={formData.hedef_kitle} onChange={handleInputChange} />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">Açıklama</label>
                  <textarea name="aciklama" rows={3} placeholder="Faaliyet detayları..." value={formData.aciklama} onChange={handleInputChange} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Personel Atama (Searchable Multi-Select) */}
              <div className="space-y-4 border rounded-xl flex flex-col min-h-[350px]">
                <div className="p-3 bg-surface border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-sm">Personel Atama (Çoklu Seçim)</span>
                  <Badge variant="outline">{selectedPersonnel.length} Personel Seçildi</Badge>
                </div>
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="İsim veya Sicil No ile Ara..." className="h-9 pl-8 text-sm" value={personnelSearch} onChange={e => setPersonnelSearch(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px]">
                  {filteredPersonnel.map(p => {
                    const sel = selectedPersonnel.find(sp => sp.sicil_no === p.sicil_no)
                    const isSelected = !!sel
                    return (
                      <div key={p.sicil_no} className={`p-3 text-sm rounded-lg border transition-all ${isSelected ? 'bg-primary/5 border-primary/40' : 'bg-background hover:bg-surface border-transparent'}`}>
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => togglePersonnel(p.sicil_no)}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <span className={isSelected ? 'font-medium text-primary' : ''}>{p.ad} {p.soyad}</span>
                            <span className="text-xs opacity-50 ml-1">({p.unvan})</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-3 pl-6">
                            <select 
                              value={sel.rol} 
                              onChange={(e) => updatePersonnelRole(p.sicil_no, e.target.value)}
                              className="h-8 w-full max-w-[200px] rounded-md border border-input bg-background px-2 text-xs"
                            >
                              {ROLLER.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : 'Faaliyeti Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activities.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-surface/50">
              Sistemde henüz bir eğitim veya faaliyet kaydı bulunmamaktadır.
            </div>
          ) : (
            activities.map(act => (
              <Card key={act.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      act.faaliyet_turu === 'Tatbikat' ? 'bg-danger/10 text-danger' : 
                      act.faaliyet_turu === 'Eğitim' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-success/10 text-success'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{act.faaliyet_turu}</Badge>
                        <span className="font-semibold text-lg">{act.faaliyet_konusu}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{act.hedef_kitle}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(act.baslangic_tarihi).toLocaleString('tr-TR')}</span>
                        {act.toplam_sure_saat > 0 && <span>Süre: {act.toplam_sure_saat} Saat</span>}
                        {act.katilimci_sayisi > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {act.katilimci_sayisi} Katılımcı</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center shrink-0">
                    <Button variant="outline" size="sm">
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
