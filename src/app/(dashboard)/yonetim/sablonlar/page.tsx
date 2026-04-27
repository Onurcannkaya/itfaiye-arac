"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Plus, Trash2, ListChecks, CheckSquare, Type, Hash, Loader2, RefreshCcw, Camera } from "lucide-react"

export default function SablonlarPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Builder state
  const [isBuilding, setIsBuilding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [baslik, setBaslik] = useState("")
  const [tip, setTip] = useState("devir_teslim")
  const [periyot, setPeriyot] = useState("gunluk")
  const [sorular, setSorular] = useState<{ id: string, soru: string, tip: string, zorunlu: boolean }[]>([
    { id: crypto.randomUUID(), soru: "", tip: "boolean", zorunlu: true }
  ])

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false })
    if (data) setTemplates(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleAddSoru = () => {
    setSorular([...sorular, { id: crypto.randomUUID(), soru: "", tip: "boolean", zorunlu: true }])
  }

  const handleSoruChange = (id: string, field: string, value: any) => {
    setSorular(sorular.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleRemoveSoru = (id: string) => {
    setSorular(sorular.filter(s => s.id !== id))
  }

  const handleSave = async () => {
    if (!baslik.trim() || sorular.some(s => !s.soru.trim())) {
      alert("Lütfen başlık ve tüm soru alanlarını doldurun.")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get sicil_no from personnel
    let sicil_no = null
    if (user) {
      const { data } = await supabase.from('personnel').select('sicil_no').eq('id', user.id).single()
      if (data) sicil_no = data.sicil_no
    }

    const { error } = await supabase.from('task_templates').insert({
      baslik,
      tip,
      periyot,
      sorular,
      olusturan_sicil: sicil_no
    })

    setSaving(false)
    if (error) {
      console.error(error)
      alert("Şablon kaydedilirken hata oluştu.")
    } else {
      setIsBuilding(false)
      setBaslik("")
      setSorular([{ id: crypto.randomUUID(), soru: "", tip: "boolean", zorunlu: true }])
      fetchTemplates()
    }
  }

  const toggleAktif = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('task_templates').update({ aktif: !current }).eq('id', id)
    fetchTemplates()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Görev Şablonları</h1>
          <p className="text-muted-foreground text-sm mt-1">Dinamik devir-teslim ve kontrol formlarını yönetin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchTemplates} disabled={loading}><RefreshCcw className="w-4 h-4 mr-2" /> Yenile</Button>
          <Button onClick={() => setIsBuilding(!isBuilding)}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Şablon
          </Button>
        </div>
      </div>

      {isBuilding && (
        <Card className="border-cyan-500/30 shadow-md">
          <CardHeader className="bg-cyan-500/5 pb-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2 text-cyan-600">
              <ListChecks className="w-5 h-5" /> Şablon Oluşturucu
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Şablon Başlığı</label>
                <Input value={baslik} onChange={e => setBaslik(e.target.value)} placeholder="Örn: Kılavuz Araç Günlük Kontrol" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Görev Tipi</label>
                <select value={tip} onChange={e => setTip(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="devir_teslim">Devir Teslim</option>
                  <option value="gunluk_kontrol">Günlük Kontrol</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Periyot</label>
                <select value={periyot} onChange={e => setPeriyot(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="gunluk">Günlük</option>
                  <option value="haftalik">Haftalık</option>
                  <option value="aylik">Aylık</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Kontrol Maddeleri (Sorular)</h3>
              {sorular.map((s, idx) => (
                <div key={s.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 border rounded-lg bg-muted/20">
                  <span className="font-mono text-muted-foreground font-bold w-6">{idx + 1}.</span>
                  
                  <Input 
                    className="flex-1"
                    placeholder="Kontrol edilecek madde veya soru..." 
                    value={s.soru} 
                    onChange={e => handleSoruChange(s.id, 'soru', e.target.value)} 
                  />
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select 
                      value={s.tip} 
                      onChange={e => handleSoruChange(s.id, 'tip', e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 outline-none"
                    >
                      <option value="boolean">Checkbox (Evet/Hayır)</option>
                      <option value="numeric">Sayısal (Örn: Kilometre)</option>
                      <option value="text">Metin (Not/Açıklama)</option>
                      <option value="image">Fotoğraf Çekimi</option>
                    </select>

                    <label className="flex items-center gap-2 text-sm cursor-pointer border p-2 h-10 rounded-md whitespace-nowrap bg-background">
                      <input type="checkbox" checked={s.zorunlu} onChange={e => handleSoruChange(s.id, 'zorunlu', e.target.checked)} />
                      Zorunlu
                    </label>

                    {sorular.length > 1 && (
                      <Button variant="danger" size="icon" onClick={() => handleRemoveSoru(s.id)} className="h-10 w-10 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={handleAddSoru} className="border-dashed w-full">
                <Plus className="w-4 h-4 mr-2" /> Yeni Soru Ekle
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsBuilding(false)}>İptal</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ListChecks className="w-4 h-4 mr-2" />}
                Şablonu Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(t => (
            <Card key={t.id} className={t.aktif ? "border-l-4 border-l-success" : "opacity-70 border-l-4 border-l-muted"}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{t.baslik}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{t.tip}</Badge>
                      <Badge variant="outline">{t.periyot}</Badge>
                      <Badge variant={t.aktif ? "success" : "outline"}>{t.aktif ? "Aktif" : "Pasif"}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleAktif(t.id, t.aktif)}>
                    {t.aktif ? "Devre Dışı Bırak" : "Aktifleştir"}
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">{t.sorular.length} Adet Kontrol Maddesi:</p>
                  {t.sorular.slice(0, 3).map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {s.tip === 'boolean' && <CheckSquare className="w-4 h-4 text-success" />}
                      {s.tip === 'numeric' && <Hash className="w-4 h-4 text-warning" />}
                      {s.tip === 'text' && <Type className="w-4 h-4 text-blue-400" />}
                      {s.tip === 'image' && <Camera className="w-4 h-4 text-purple-400" />}
                      <span className="truncate">{s.soru}</span>
                      {s.zorunlu && <span className="text-[10px] text-danger border border-danger/30 rounded px-1">Zorunlu</span>}
                    </div>
                  ))}
                  {t.sorular.length > 3 && (
                    <p className="text-xs text-muted-foreground italic mt-2">+ {t.sorular.length - 3} madde daha...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
             <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
               Henüz hiç şablon oluşturulmamış.
             </div>
          )}
        </div>
      )}
    </div>
  )
}
