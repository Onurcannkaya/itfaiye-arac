"use client"
import { useState } from "react"
import { mockTaskLogs } from "@/lib/data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { CheckSquare, Square, ClipboardList, AlertTriangle, PackageSearch, FileText, ChevronDown, ChevronUp } from "lucide-react"

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

export default function GorevlerPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const pending = mockTaskLogs.filter(t => t.durum !== "tamamlandi" && t.durum !== "iptal")
  const completed = mockTaskLogs.filter(t => t.durum === "tamamlandi" || t.durum === "iptal")

  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Görevler & Devir-Teslim</h1>
        <p className="text-muted-foreground mt-1 text-sm">Nöbet değişimi checklist'leri, arıza bildirimleri ve envanter sayımları.</p>
      </div>

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
            const progress = Math.round((checkedCount / totalCount) * 100)
            const durumInfo = DURUM_BADGE[task.durum]
            return (
              <Card key={task.id} className="border-l-4 border-l-warning">
                <button onClick={() => toggle(task.id)} className="w-full text-left">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/10 rounded-lg text-warning">{TASK_TIP_ICON[task.tip]}</div>
                        <div>
                          <p className="font-semibold text-sm">{TASK_TIP_LABEL[task.tip]} — {task.plaka}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.atanan} · {new Date(task.tarih).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={durumInfo.variant}>{durumInfo.label}</Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {/* Progress bar */}
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
            const durumInfo = DURUM_BADGE[task.durum]
            return (
              <Card key={task.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <button onClick={() => toggle(task.id)} className="w-full text-left">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-lg text-success">{TASK_TIP_ICON[task.tip]}</div>
                        <div>
                          <p className="font-semibold text-sm">{TASK_TIP_LABEL[task.tip]} — {task.plaka}</p>
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
