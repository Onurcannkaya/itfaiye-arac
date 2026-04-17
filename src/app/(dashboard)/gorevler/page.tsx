"use client"
import { useState, useEffect, useCallback } from "react"
import { mockTaskLogs } from "@/lib/data"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useAuthStore } from "@/lib/authStore"
import { CheckSquare, Square, ClipboardList, AlertTriangle, PackageSearch, FileText, ChevronDown, ChevronUp, Plus, X, Loader2, Trash2 } from "lucide-react"

const TASK_TIP_LABEL: Record<string, string> = {
  devir_teslim: "Devir-Teslim",
  gunluk_kontrol: "Günlük Kontrol",
  ariza_bildirimi: "Arıza Bildirimi",
  envanter_sayim: "Envanter Sayımı",
}

const TASK_TIP_ICON: Record<string, React.ReactNode> = {
  devir_teslim: <ClipboardList className="w-4 h-4" />,
  ariza_bildirimi: <AlertTriangle className="w-4 h-4" />,
  envanter_sayim: <PackageSearch className="w-4 h-4" />,
  gunluk_kontrol: <FileText className="w-4 h-4" />,
}

const DURUM_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  tamamlandi: { label: "Tamamlandı", variant: "success" },
  devam_ediyor: { label: "Devam Ediyor", variant: "warning" },
  beklemede: { label: "Beklemede", variant: "default" },
  iptal: { label: "İptal", variant: "danger" },
}

interface TaskItem {
  id: string
  plaka: string
  tip: string
  checklist: { label: string; checked: boolean }[]
  durum: string
  notlar?: string
  atanan: string
  tarih: string
  tamamlanma_tarihi?: string
}

export default function GorevlerPage() {
  const { user } = useAuthStore()
  const isAdminOrEditor = user?.rol === "Admin" || user?.rol === "Editor"
  
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  // New task form state
  const [newTip, setNewTip] = useState("devir_teslim")
  const [newPlaka, setNewPlaka] = useState("")
  const [newAtanan, setNewAtanan] = useState("")
  const [newNotlar, setNewNotlar] = useState("")
  const [newChecklistItems, setNewChecklistItems] = useState<string[]>([""])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [formSaving, setFormSaving] = useState(false)

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (data && data.length > 0) {
        setTasks(data.map((t: any) => ({
          id: t.id,
          plaka: t.plaka,
          tip: t.tip,
          checklist: t.checklist || [],
          durum: t.durum,
          notlar: t.notlar,
          atanan: t.atanan,
          tarih: t.tarih,
          tamamlanma_tarihi: t.tamamlanma_tarihi,
        })))
      } else {
        // Fallback mock data
        setTasks(mockTaskLogs)
      }
    } catch {
      setTasks(mockTaskLogs)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch vehicles & personnel for form dropdowns
  useEffect(() => {
    async function loadDropdowns() {
      const supabase = createClient()
      const [vRes, pRes] = await Promise.all([
        supabase.from('vehicles').select('plaka'),
        supabase.from('personnel').select('sicil_no, ad, soyad').eq('aktif', true),
      ])
      if (vRes.data) setVehicles(vRes.data)
      if (pRes.data) setPersonnel(pRes.data)
    }
    loadDropdowns()
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  // CREATE TASK — Supabase INSERT
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaka || !newAtanan) return
    setFormSaving(true)

    const checklist = newChecklistItems.filter(c => c.trim()).map(label => ({ label, checked: false }))
    if (checklist.length === 0) {
      checklist.push({ label: "Genel kontrol", checked: false })
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').insert({
        plaka: newPlaka,
        tip: newTip,
        checklist,
        durum: 'beklemede',
        notlar: newNotlar || null,
        atanan: newAtanan,
        created_by: user?.sicilNo || null,
      })

      if (error) throw error
      
      await fetchTasks()
      setShowForm(false)
      setNewTip("devir_teslim")
      setNewPlaka("")
      setNewAtanan("")
      setNewNotlar("")
      setNewChecklistItems([""])
    } catch (err) {
      console.error("Görev oluşturma hatası:", err)
      alert("Görev oluşturulamadı. Supabase bağlantısını kontrol edin.")
    } finally {
      setFormSaving(false)
    }
  }

  const pending = tasks.filter(t => t.durum !== "tamamlandi" && t.durum !== "iptal")
  const completed = tasks.filter(t => t.durum === "tamamlandi" || t.durum === "iptal")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Görevler & Devir-Teslim</h1>
          <p className="text-muted-foreground mt-1 text-sm">Nöbet değişimi checklist'leri, arıza bildirimleri ve envanter sayımları.</p>
        </div>
        {isAdminOrEditor && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 shrink-0">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "İptal" : "Yeni Görev Oluştur"}
          </Button>
        )}
      </div>

      {/* NEW TASK FORM */}
      {showForm && isAdminOrEditor && (
        <Card className="border-cyan-500/20 bg-cyan-500/[0.02] animate-in fade-in slide-in-from-top-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-cyan-500 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Yeni Görev Tanımla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Görev Tipi</label>
                  <select value={newTip} onChange={e => setNewTip(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="devir_teslim">Devir-Teslim</option>
                    <option value="gunluk_kontrol">Günlük Kontrol</option>
                    <option value="ariza_bildirimi">Arıza Bildirimi</option>
                    <option value="envanter_sayim">Envanter Sayımı</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Hedef Araç</label>
                  <select value={newPlaka} onChange={e => setNewPlaka(e.target.value)} required
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Araç Seçin</option>
                    {vehicles.map(v => <option key={v.plaka} value={v.plaka}>{v.plaka}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Atanan Personel</label>
                  <select value={newAtanan} onChange={e => setNewAtanan(e.target.value)} required
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Personel Seçin</option>
                    {personnel.map(p => <option key={p.sicil_no} value={p.sicil_no}>{p.ad} {p.soyad} ({p.sicil_no})</option>)}
                  </select>
                </div>
              </div>

              {/* Checklist Builder */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Checklist Maddeleri</label>
                {newChecklistItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Madde ${idx + 1}: Örn: Motor kontrolü yapıldı`}
                      value={item}
                      onChange={e => {
                        const updated = [...newChecklistItems]
                        updated[idx] = e.target.value
                        setNewChecklistItems(updated)
                      }}
                    />
                    {newChecklistItems.length > 1 && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setNewChecklistItems(newChecklistItems.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setNewChecklistItems([...newChecklistItems, ""])} className="gap-1 mt-1">
                  <Plus className="w-3 h-3" /> Madde Ekle
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Notlar (İsteğe Bağlı)</label>
                <Input placeholder="Ek bilgi veya talimatlar..." value={newNotlar} onChange={e => setNewNotlar(e.target.value)} />
              </div>

              <Button type="submit" disabled={formSaving} className="w-full sm:w-auto gap-2 bg-cyan-600 hover:bg-cyan-700">
                {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {formSaving ? "Oluşturuluyor..." : "Görevi Oluştur ve Kaydet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Aktif Görevler */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
          Aktif Görevler ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.map(task => {
            const isOpen = expandedId === task.id
            const checkedCount = task.checklist.filter(c => c.checked).length
            const totalCount = task.checklist.length
            const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
            const durumInfo = DURUM_BADGE[task.durum] || DURUM_BADGE.beklemede
            return (
              <Card key={task.id} className="border-l-4 border-l-warning">
                <button onClick={() => toggle(task.id)} className="w-full text-left">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/10 rounded-lg text-warning">{TASK_TIP_ICON[task.tip]}</div>
                        <div>
                          <p className="font-semibold text-sm">{TASK_TIP_LABEL[task.tip] || task.tip} — {task.plaka}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.atanan} · {new Date(task.tarih).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={durumInfo.variant}>{durumInfo.label}</Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{checkedCount}/{totalCount}</span>
                    </div>
                  </CardContent>
                </button>
                {isOpen && (
                  <CardContent className="pt-0 px-4 sm:px-5 pb-4">
                    <ul className="space-y-2 border-t border-border/30 pt-3">
                      {task.checklist.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 py-1.5">
                          {item.checked
                            ? <CheckSquare className="w-5 h-5 text-success shrink-0" />
                            : <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                          }
                          <span className={`text-sm ${item.checked ? "text-muted-foreground line-through" : "font-medium"}`}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    {task.notlar && (
                      <div className="mt-3 p-3 bg-warning/5 border border-warning/20 rounded-lg text-sm text-warning">
                        <strong>Not:</strong> {task.notlar}
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

      {/* Tamamlanan Görevler */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-success" />
          Tamamlanan Görevler ({completed.length})
        </h2>
        <div className="space-y-3">
          {completed.map(task => {
            const isOpen = expandedId === task.id
            const durumInfo = DURUM_BADGE[task.durum] || DURUM_BADGE.tamamlandi
            return (
              <Card key={task.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <button onClick={() => toggle(task.id)} className="w-full text-left">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-lg text-success">{TASK_TIP_ICON[task.tip]}</div>
                        <div>
                          <p className="font-semibold text-sm">{TASK_TIP_LABEL[task.tip] || task.tip} — {task.plaka}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.atanan} · {new Date(task.tarih).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={durumInfo.variant}>{durumInfo.label}</Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </button>
                {isOpen && (
                  <CardContent className="pt-0 px-4 sm:px-5 pb-4">
                    <ul className="space-y-2 border-t border-border/30 pt-3">
                      {task.checklist.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 py-1.5">
                          {item.checked
                            ? <CheckSquare className="w-5 h-5 text-success shrink-0" />
                            : <Square className="w-5 h-5 text-danger shrink-0" />
                          }
                          <span className={`text-sm ${item.checked ? "text-muted-foreground line-through" : "text-danger font-medium"}`}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    {task.notlar && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        <strong>Not:</strong> {task.notlar}
                      </div>
                    )}
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
