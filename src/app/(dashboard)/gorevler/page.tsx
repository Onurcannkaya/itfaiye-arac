"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useAuthStore } from "@/lib/authStore"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { CheckSquare, ClipboardList, ChevronDown, ChevronUp, Plus, X, Loader2, Save, CheckCircle2, XCircle } from "lucide-react"

const DURUM_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  tamamlandi: { label: "Tamamlandı", variant: "success" },
  devam_ediyor: { label: "Devam Ediyor", variant: "warning" },
  beklemede: { label: "Beklemede", variant: "default" },
  iptal: { label: "İptal", variant: "danger" },
}

interface ChecklistItem {
  id: string
  soru: string
  tip: "boolean" | "numeric" | "text" | "image"
  zorunlu: boolean
  deger?: any
}

interface TaskItem {
  id: string
  plaka: string
  tip: string
  checklist: ChecklistItem[]
  durum: string
  notlar?: string
  atanan: string
  tarih: string
  tamamlanma_tarihi?: string
}

export default function GorevlerPage() {
  const { user } = useAuthStore()
  const isAdminOrEditor = user?.rol === "Admin" || user?.rol === "Editor" || user?.rol === "Shift_Leader"
  
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  // New task form state
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [newPlaka, setNewPlaka] = useState("")
  const [newAtanan, setNewAtanan] = useState("")
  const [newNotlar, setNewNotlar] = useState("")
  const [vehicles, setVehicles] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [formSaving, setFormSaving] = useState(false)

  // Filling Task State
  const [fillingTaskId, setFillingTaskId] = useState<string | null>(null)
  const [filledValues, setFilledValues] = useState<Record<string, any>>({})

  const fetchTasksAndTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const [tasksRes, templatesRes, vRes, pRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('task_templates').select('*').eq('aktif', true),
        supabase.from('vehicles').select('plaka'),
        supabase.from('personnel').select('sicil_no, ad, soyad').eq('aktif', true),
      ])

      if (tasksRes.data) setTasks(tasksRes.data)
      if (templatesRes.data) setTemplates(templatesRes.data)
      if (vRes.data) setVehicles(vRes.data)
      if (pRes.data) setPersonnel(pRes.data)

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasksAndTemplates() }, [fetchTasksAndTemplates])

  const toggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
    setFillingTaskId(null)
  }

  // CREATE TASK
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaka || !newAtanan || !selectedTemplateId) return
    setFormSaving(true)

    const tpl = templates.find(t => t.id === selectedTemplateId)
    if (!tpl) return

    // Convert template questions to checklist items
    const checklist: ChecklistItem[] = tpl.sorular.map((s: any) => ({
      id: s.id,
      soru: s.soru,
      tip: s.tip,
      zorunlu: s.zorunlu,
      deger: null
    }))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').insert({
        plaka: newPlaka,
        tip: tpl.baslik, // Use template title as task tip
        checklist,
        durum: 'beklemede',
        notlar: newNotlar || null,
        atanan: newAtanan,
        created_by: user?.sicilNo || null,
      })

      if (error) throw error
      
      await fetchTasksAndTemplates()
      setShowForm(false)
      setSelectedTemplateId("")
      setNewPlaka("")
      setNewAtanan("")
      setNewNotlar("")
    } catch (err) {
      console.error("Görev oluşturma hatası:", err)
      alert("Görev oluşturulamadı.")
    } finally {
      setFormSaving(false)
    }
  }

  // FILL TASK
  const startFilling = (task: TaskItem) => {
    setFillingTaskId(task.id)
    const initial: Record<string, any> = {}
    task.checklist.forEach(c => {
      initial[c.id] = c.deger ?? (c.tip === 'boolean' ? false : "")
    })
    setFilledValues(initial)
  }

  const handleFillSubmit = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Check required fields
    for (const c of task.checklist) {
      if (c.zorunlu) {
        if (c.tip === 'boolean' && filledValues[c.id] !== true) {
           // Maybe boolean required means it must be TRUE? Usually yes for checklists.
           // If they just need to answer yes/no, maybe boolean required isn't standard, but let's just warn if null.
           if (filledValues[c.id] == null) {
              alert(`Zorunlu alan: ${c.soru}`)
              return
           }
        }
        if ((c.tip === 'text' || c.tip === 'numeric') && !filledValues[c.id]) {
           alert(`Zorunlu alan eksik: ${c.soru}`)
           return
        }
      }
    }

    const updatedChecklist = task.checklist.map(c => ({
      ...c,
      deger: filledValues[c.id]
    }))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').update({
        checklist: updatedChecklist,
        durum: 'tamamlandi',
        tamamlanma_tarihi: new Date().toISOString()
      }).eq('id', taskId)

      if (error) throw error
      setFillingTaskId(null)
      fetchTasksAndTemplates()
    } catch (err) {
      console.error(err)
      alert("Hata oluştu.")
    }
  }

  const pending = tasks.filter(t => t.durum !== "tamamlandi" && t.durum !== "iptal")
  const completed = tasks.filter(t => t.durum === "tamamlandi" || t.durum === "iptal")

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Görevler & Devir-Teslim</h1>
          <p className="text-muted-foreground mt-1 text-sm">Dinamik formlara dayalı araç kontrol ve teslim işlemleri.</p>
        </div>
        {isAdminOrEditor && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "İptal" : "Yeni Görev Ata"}
          </Button>
        )}
      </div>

      {showForm && isAdminOrEditor && (
        <Card className="border-cyan-500/20 bg-cyan-500/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-cyan-500 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Yeni Görev / Check-list Tanımla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Şablon Seçin</label>
                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Şablon Seçiniz</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.baslik} ({t.periyot})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Hedef Araç</label>
                <select value={newPlaka} onChange={e => setNewPlaka(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Araç Seçin</option>
                  {vehicles.map(v => <option key={v.plaka} value={v.plaka}>{v.plaka}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Atanan Personel</label>
                <select value={newAtanan} onChange={e => setNewAtanan(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Personel Seçin</option>
                  {personnel.map(p => <option key={p.sicil_no} value={p.sicil_no}>{p.ad} {p.soyad} ({p.sicil_no})</option>)}
                </select>
              </div>
              <Button type="submit" disabled={formSaving} className="bg-cyan-600 hover:bg-cyan-700 h-10">
                {formSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Görev Oluştur
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
          Aktif Görevler ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.map(task => {
            const isOpen = expandedId === task.id
            const isFilling = fillingTaskId === task.id
            
            // Calc progress roughly based on boolean checks if any
            const bools = task.checklist.filter(c => c.tip === 'boolean')
            const checkedCount = bools.filter(c => c.deger === true).length
            const totalCount = bools.length
            const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

            return (
              <Card key={task.id} className="border-l-4 border-l-warning">
                <button onClick={() => toggle(task.id)} className="w-full text-left focus:outline-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{task.tip} — <span className="text-primary">{task.plaka}</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Atanan: {task.atanan} · {new Date(task.tarih).toLocaleDateString("tr-TR")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="warning">Beklemede</Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardContent>
                </button>
                
                {isOpen && (
                  <CardContent className="pt-0 px-4 pb-4 border-t pt-4">
                    {!isFilling ? (
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                           <p className="text-xs font-semibold text-muted-foreground uppercase">Kontrol Listesi Önizleme:</p>
                           {task.checklist.map((c, i) => (
                             <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                               • {c.soru} <Badge variant="outline" className="scale-75 origin-left">{c.tip}</Badge>
                             </div>
                           ))}
                        </div>
                        <Button onClick={() => startFilling(task)} className="w-full">
                          Görevi Gerçekleştir / Doldur
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-5 bg-background border-2 p-5 rounded-xl shadow-inner">
                        <h3 className="font-bold text-base border-b pb-3">Kontrol Formu</h3>
                        {task.checklist.map(c => (
                          <div key={c.id} className="space-y-3">
                            <p className="text-sm font-semibold flex items-center gap-2">
                              {c.soru} 
                              {c.zorunlu && <span className="text-danger text-[11px] font-bold border border-danger/30 rounded px-1.5 py-0.5">Zorunlu</span>}
                            </p>
                            
                            {c.tip === 'boolean' && (
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setFilledValues({...filledValues, [c.id]: true})}
                                  className={`flex items-center justify-center gap-3 min-h-[56px] rounded-xl border-2 font-semibold text-sm transition-all active:scale-[0.97] ${
                                    filledValues[c.id] === true
                                      ? 'bg-success/15 border-success text-success shadow-sm'
                                      : 'border-border hover:border-success/40 hover:bg-success/5 text-muted-foreground'
                                  }`}
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                  Evet / Tamam
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFilledValues({...filledValues, [c.id]: false})}
                                  className={`flex items-center justify-center gap-3 min-h-[56px] rounded-xl border-2 font-semibold text-sm transition-all active:scale-[0.97] ${
                                    filledValues[c.id] === false
                                      ? 'bg-danger/15 border-danger text-danger shadow-sm'
                                      : 'border-border hover:border-danger/40 hover:bg-danger/5 text-muted-foreground'
                                  }`}
                                >
                                  <XCircle className="w-5 h-5" />
                                  Hayır / Hatalı
                                </button>
                              </div>
                            )}

                            {c.tip === 'numeric' && (
                              <Input type="number" inputMode="numeric" placeholder="Sayısal değer girin..." value={filledValues[c.id] || ''} onChange={e => setFilledValues({...filledValues, [c.id]: e.target.value})} className="max-w-sm" />
                            )}

                            {c.tip === 'text' && (
                              <Input type="text" placeholder="Açıklama veya not girin..." value={filledValues[c.id] || ''} onChange={e => setFilledValues({...filledValues, [c.id]: e.target.value})} />
                            )}

                            {c.tip === 'image' && (
                              <ImageUpload 
                                fieldId={`task_${task.id}_${c.id}`} 
                                value={filledValues[c.id] || null} 
                                onUploaded={(path) => setFilledValues({...filledValues, [c.id]: path})} 
                                onRemoved={() => {
                                  const newValues = {...filledValues};
                                  delete newValues[c.id];
                                  setFilledValues(newValues);
                                }} 
                              />
                            )}
                          </div>
                        ))}
                        
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-5 border-t">
                           <Button variant="ghost" onClick={() => setFillingTaskId(null)}>İptal</Button>
                           <Button size="lg" onClick={() => handleFillSubmit(task.id)} className="bg-success hover:bg-success/90">
                             <Save className="w-5 h-5 mr-2" /> Görevi Tamamla
                           </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
          {pending.length === 0 && <p className="text-muted-foreground text-sm">Aktif görev bulunmuyor.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-success" />
          Tamamlanan Görevler ({completed.length})
        </h2>
        <div className="space-y-3">
          {completed.map(task => {
            const isOpen = expandedId === task.id
            return (
              <Card key={task.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <button onClick={() => toggle(task.id)} className="w-full text-left">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{task.tip} — <span className="text-primary">{task.plaka}</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.atanan} · {new Date(task.tarih).toLocaleDateString("tr-TR")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Tamamlandı</Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardContent>
                </button>
                {isOpen && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="bg-muted/20 p-4 rounded-lg space-y-3 border mt-2">
                      {task.checklist.map(c => (
                        <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b last:border-0 pb-2 last:pb-0 gap-1">
                          <span className="text-sm font-medium">{c.soru}</span>
                          <span className="text-sm">
                            {c.tip === 'boolean' ? (
                               c.deger ? <Badge variant="success">Evet</Badge> : <Badge variant="danger">Hayır</Badge>
                            ) : (
                               <span className="font-mono bg-background px-2 py-1 border rounded text-xs">{c.deger || '-'}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
