"use client"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { Clock, User, CheckCircle2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

interface AuditTimelineProps {
  plaka: string
  compartmentKey: string
}

// Supabase'den dönen kayıt tipi
interface InventoryCheckRecord {
  id: string
  plaka: string
  compartment_key: string
  checked_by: string
  checked_by_name: string
  results: { malzeme: string; durum: string; note?: string }[]
  notes?: string
  created_at: string
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 1) return `${diffDays} gün önce`
  if (diffDays === 1) return "Dün"
  if (diffHours > 0) return `${diffHours} saat önce`
  return "Az önce"
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AuditTimeline({ plaka, compartmentKey }: AuditTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logs, setLogs] = useState<InventoryCheckRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Supabase'den envanter sayım geçmişini çek
  useEffect(() => {
    async function fetchCheckHistory() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ plaka, compartment: compartmentKey })
        const response = await fetch(`/api/inventory-checks?${params}`)
        const result = await response.json()

        if (response.ok && result.data) {
          setLogs(result.data)
        } else {
          setLogs([])
        }
      } catch (err) {
        console.error("[AuditTimeline] Veri çekme hatası:", err)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    if (plaka && compartmentKey) {
      fetchCheckHistory()
    }
  }, [plaka, compartmentKey])

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
        Kontrol geçmişi yükleniyor...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-xl bg-muted/5">
        <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground/50" />
        Bu bölme için henüz kontrol kaydı bulunmuyor.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_2px_rgba(34,211,238,0.4)]" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Kontrol Geçmişi
        </h4>
        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-mono">{logs.length} kayıt</span>
      </div>

      {/* Timeline line */}
      <div className="absolute left-[11px] top-[52px] bottom-4 w-px bg-gradient-to-b from-cyan-500/40 via-border/30 to-transparent" />

      {/* Entries */}
      <div className="space-y-3 pl-1">
        {logs.map((log, index) => {
          const isExpanded = expandedId === log.id
          const issues = log.results.filter((r) => r.durum !== "Tam")
          const isLatest = index === 0

          return (
            <div key={log.id} className="relative flex gap-3">
              {/* Dot */}
              <div className="relative z-10 mt-1.5 shrink-0">
                <div
                  className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                    isLatest
                      ? "border-cyan-400 bg-cyan-400/20 shadow-[0_0_8px_2px_rgba(34,211,238,0.3)]"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isLatest ? "bg-cyan-400" : "bg-muted-foreground/40"}`} />
                </div>
              </div>

              {/* Content Card */}
              <div
                className={`flex-1 rounded-xl border transition-all overflow-hidden ${
                  isLatest
                    ? "border-cyan-500/20 bg-cyan-500/[0.03] shadow-sm"
                    : "border-border/30 bg-surface/50 hover:bg-surface/80"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold truncate">{log.checked_by_name}</span>
                        {isLatest && (
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Son
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatTime(log.created_at)}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="font-medium">{formatRelativeTime(log.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {issues.length > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          {issues.length} sorun
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Tam
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border/20 pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                    {log.results.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs py-1"
                      >
                        {r.durum === "Tam" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        ) : r.durum === "Arızalı" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium ${r.durum !== "Tam" ? "text-foreground" : "text-muted-foreground"}`}>
                            {r.malzeme}
                          </span>
                          {r.durum !== "Tam" && (
                            <span className="ml-1.5 text-danger font-semibold">({r.durum})</span>
                          )}
                          {r.note && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic">{r.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {log.notes && (
                      <div className="mt-2 p-2 bg-warning/5 border border-warning/15 rounded-lg text-[11px] text-warning">
                        <strong>Not:</strong> {log.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
