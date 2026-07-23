"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/authStore"
import {
  Mic, Square, Upload, Trash2, Loader2, CheckCircle2, AlertTriangle,
  Radio, User, Flame,
} from "lucide-react"

interface Recording {
  id: string
  incident_id?: string | null
  olay_bilgi?: string | null
  sicil_no: string
  personel_ad: string
  audio_url: string
  kaynak: "MIKROFON" | "YUKLEME"
  sure_sn?: number | null
  aciklama?: string | null
  created_at: string
}
interface Person { sicil_no: string; ad: string; soyad: string; unvan?: string }
interface Incident { id: string; olay_turu?: string; mahalle?: string; adres?: string; status?: string }

const GENEL = "__genel__"

export function RadioRecordingsPanel() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [personnel, setPersonnel] = useState<Person[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // form seçimleri
  const [selIncident, setSelIncident] = useState<string>(GENEL) // GENEL = olaysız
  const [selSicil, setSelSicil] = useState<string>("")
  const [aciklama, setAciklama] = useState("")

  // kayıt durumu
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; url: string; sure: number; kaynak: "MIKROFON" | "YUKLEME"; ext: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const mediaRec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, p, i] = await Promise.all([
        api.from("radio_recordings").select("*").order("created_at", { ascending: false }),
        api.from("personnel").select("sicil_no,ad,soyad,unvan").eq("aktif", true),
        api.from("incidents").select("id,olay_turu,mahalle,adres,status"),
      ])
      setRecordings(Array.isArray(r.data) ? r.data : [])
      setPersonnel(Array.isArray(p.data) ? (p.data as Person[]).sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, "tr")) : [])
      const inc = Array.isArray(i.data) ? (i.data as Incident[]) : []
      setIncidents(inc.filter((x) => ["aktif", "active", "devam ediyor", "müdahale"].includes((x.status || "").toLowerCase())))
    } catch {
      showToast("Kayıtlar yüklenemedi", false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (user?.sicilNo && !selSicil) setSelSicil(user.sicilNo) }, [user?.sicilNo, selSicil])
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  // ── Mikrofon kaydı ──
  const startRec = async () => {
    if (pendingBlob) { URL.revokeObjectURL(pendingBlob.url); setPendingBlob(null) }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })
        const url = URL.createObjectURL(blob)
        const ext = (mr.mimeType || "audio/webm").includes("mp4") ? ".mp4" : ".webm"
        setPendingBlob({ blob, url, sure: elapsed, kaynak: "MIKROFON", ext })
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      mediaRec.current = mr
      setElapsed(0); setRecording(true)
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      showToast("Mikrofon erişimi reddedildi", false)
    }
  }
  const stopRec = () => {
    mediaRec.current?.stop()
    if (timer.current) clearInterval(timer.current)
    setRecording(false)
  }

  // ── Dosya yükleme (harici) ──
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (pendingBlob) URL.revokeObjectURL(pendingBlob.url)
    const url = URL.createObjectURL(f)
    const ext = (f.name.match(/\.[a-z0-9]+$/i)?.[0]) || ".mp3"
    // süreyi audio metadata'dan al
    const a = new Audio(url)
    a.onloadedmetadata = () => {
      setPendingBlob({ blob: f, url, sure: Math.round(a.duration) || 0, kaynak: "YUKLEME", ext })
    }
    a.onerror = () => setPendingBlob({ blob: f, url, sure: 0, kaynak: "YUKLEME", ext })
    e.target.value = ""
  }

  const iptalPending = () => {
    if (pendingBlob) URL.revokeObjectURL(pendingBlob.url)
    setPendingBlob(null); setElapsed(0)
  }

  const save = async () => {
    if (!pendingBlob) return
    if (!selSicil) { showToast("Konuşan personeli seçin", false); return }
    setSaving(true)
    try {
      const per = personnel.find((p) => p.sicil_no === selSicil)
      const inc = selIncident !== GENEL ? incidents.find((i) => i.id === selIncident) : null
      const file = new File([pendingBlob.blob], `telsiz_${Date.now()}${pendingBlob.ext}`, { type: pendingBlob.blob.type || "audio/webm" })
      const { url, error: upErr } = await api.upload(file, "telsiz-ses")
      if (upErr || !url) throw new Error(upErr || "Yükleme başarısız")
      const { error } = await api.insert("radio_recordings", {
        incident_id: inc ? inc.id : null,
        olay_bilgi: inc ? `${inc.olay_turu || "Vaka"} - ${inc.mahalle || inc.adres || ""}` : null,
        sicil_no: selSicil,
        personel_ad: per ? `${per.ad} ${per.soyad}` : selSicil,
        audio_url: url,
        kaynak: pendingBlob.kaynak,
        sure_sn: pendingBlob.sure || null,
        aciklama: aciklama || null,
      })
      if (error) throw new Error(error)
      showToast("Ses kaydı eklendi")
      iptalPending(); setAciklama("")
      load()
    } catch (e: any) {
      showToast("Kaydedilemedi: " + (e.message || e), false)
    } finally { setSaving(false) }
  }

  const sil = async (r: Recording) => {
    if (!confirm("Bu ses kaydı silinsin mi?")) return
    const { error } = await api.remove("radio_recordings", { id: r.id })
    if (error) showToast("Silinemedi: " + error, false)
    else { showToast("Kayıt silindi"); load() }
  }

  const fmtSure = (s?: number | null) => {
    if (!s) return ""
    const m = Math.floor(s / 60), ss = s % 60
    return `${m}:${String(ss).padStart(2, "0")}`
  }
  const fmtTarih = (s: string) => new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

  // liste filtresi: seçili olaya göre
  const [filterIncident, setFilterIncident] = useState<string>("__hepsi__")
  const filtered = useMemo(() => {
    if (filterIncident === "__hepsi__") return recordings
    if (filterIncident === GENEL) return recordings.filter((r) => !r.incident_id)
    return recordings.filter((r) => r.incident_id === filterIncident)
  }, [recordings, filterIncident])

  return (
    <div className="flex flex-col gap-[calc(var(--fd-sp)*2)]">
      {/* Yeni kayıt bölümü */}
      <div className="rounded-[var(--fd-r)] border border-[var(--fd-border)] bg-[var(--fd-surface)] shadow-[var(--fd-shadow-sm)] p-[calc(var(--fd-sp)*2)]">
        <div className="text-[calc(var(--fd-fs)*0.72)] font-bold uppercase tracking-wider text-[var(--fd-text3)] mb-[calc(var(--fd-sp)*1.75)]">Yeni Ses Kaydı</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[calc(var(--fd-sp)*1.5)] mb-[calc(var(--fd-sp)*1.75)]">
          <Field label="Konuşan Personel">
            <select className={inputCls} value={selSicil} onChange={(e) => setSelSicil(e.target.value)}>
              <option value="">Seçiniz…</option>
              {personnel.map((p) => <option key={p.sicil_no} value={p.sicil_no}>{p.ad} {p.soyad}{p.unvan ? ` — ${p.unvan}` : ""}</option>)}
            </select>
          </Field>
          <Field label="Olay (opsiyonel)">
            <select className={inputCls} value={selIncident} onChange={(e) => setSelIncident(e.target.value)}>
              <option value={GENEL}>Genel (olaysız)</option>
              {incidents.map((i) => <option key={i.id} value={i.id}>{i.olay_turu || "Vaka"} — {i.mahalle || i.adres || i.id.slice(0, 8)}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Açıklama (opsiyonel)"><input className={inputCls} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Örn: İntikal anonsu" /></Field>

        {/* Kayıt/yükleme kontrolleri */}
        <div className="flex flex-wrap items-center gap-2 mt-[calc(var(--fd-sp)*1.75)]">
          {!recording ? (
            <button onClick={startRec} disabled={!!pendingBlob} className="flex items-center gap-2 px-[calc(var(--fd-sp)*2.25)] py-[calc(var(--fd-sp)*1.25)] rounded-[var(--fd-r-sm)] bg-[var(--fd-accent)] text-white font-bold text-[calc(var(--fd-fs)*0.88)] disabled:opacity-50">
              <Mic size={16} strokeWidth={2} /> Kaydı Başlat
            </button>
          ) : (
            <button onClick={stopRec} className="flex items-center gap-2 px-[calc(var(--fd-sp)*2.25)] py-[calc(var(--fd-sp)*1.25)] rounded-[var(--fd-r-sm)] bg-[var(--fd-danger)] text-white font-bold text-[calc(var(--fd-fs)*0.88)] animate-pulse">
              <Square size={16} strokeWidth={2} /> Durdur · {fmtSure(elapsed) || "0:00"}
            </button>
          )}

          <label className="flex items-center gap-2 px-[calc(var(--fd-sp)*2)] py-[calc(var(--fd-sp)*1.25)] rounded-[var(--fd-r-sm)] border border-[var(--fd-border-strong)] text-[var(--fd-text)] font-semibold text-[calc(var(--fd-fs)*0.85)] cursor-pointer hover:bg-[var(--fd-surface2)]">
            <Upload size={15} strokeWidth={2} /> Dosya Yükle
            <input type="file" accept="audio/*" className="hidden" onChange={onFile} disabled={recording} />
          </label>
        </div>

        {/* Bekleyen kayıt önizleme + kaydet */}
        {pendingBlob && (
          <div className="mt-[calc(var(--fd-sp)*1.75)] flex flex-col gap-2 rounded-[var(--fd-r-sm)] border border-[var(--fd-border)] bg-[var(--fd-surface2)] p-[calc(var(--fd-sp)*1.5)]">
            <div className="flex items-center gap-2 text-[calc(var(--fd-fs)*0.78)] text-[var(--fd-text2)]">
              <Radio size={14} /> Önizleme ({pendingBlob.kaynak === "MIKROFON" ? "mikrofon" : "yükleme"}{pendingBlob.sure ? ` · ${fmtSure(pendingBlob.sure)}` : ""})
            </div>
            <audio controls src={pendingBlob.url} className="w-full h-9" />
            <div className="flex gap-2 justify-end">
              <button onClick={iptalPending} className="px-3 py-1.5 rounded-[var(--fd-r-sm)] text-[var(--fd-text2)] text-[calc(var(--fd-fs)*0.82)] font-semibold hover:bg-[var(--fd-surface3)]">İptal</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--fd-r-sm)] bg-[var(--fd-success)] text-white text-[calc(var(--fd-fs)*0.82)] font-bold disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} Kaydı Ekle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtre + liste */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[calc(var(--fd-fs)*0.72)] font-bold uppercase tracking-wider text-[var(--fd-text3)]">Kayıtlar</span>
        <select className={`${inputCls} w-auto`} value={filterIncident} onChange={(e) => setFilterIncident(e.target.value)}>
          <option value="__hepsi__">Tüm kayıtlar</option>
          <option value={GENEL}>Genel (olaysız)</option>
          {incidents.map((i) => <option key={i.id} value={i.id}>{i.olay_turu || "Vaka"} — {i.mahalle || i.id.slice(0, 8)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--fd-text3)]"><Loader2 className="animate-spin mr-2" size={18} /> Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-[var(--fd-text3)]">
          <Radio size={32} strokeWidth={1.5} className="opacity-40" />
          <span className="text-[calc(var(--fd-fs)*0.85)]">Bu seçim için ses kaydı yok.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-[var(--fd-r)] border border-[var(--fd-border)] bg-[var(--fd-surface)] shadow-[var(--fd-shadow-sm)] p-[calc(var(--fd-sp)*1.75)]">
              <div className="flex items-start gap-2 mb-2">
                <span className="flex items-center gap-1.5 text-[calc(var(--fd-fs)*0.88)] font-semibold min-w-0">
                  <User size={14} className="text-[var(--fd-text3)] shrink-0" /> <span className="truncate">{r.personel_ad}</span>
                </span>
                <span className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[calc(var(--fd-fs)*0.72)] text-[var(--fd-text3)]">{fmtTarih(r.created_at)}</span>
                  <button onClick={() => sil(r)} title="Sil" className="w-7 h-7 grid place-items-center rounded-[var(--fd-r-sm)] text-[var(--fd-danger)] hover:bg-[var(--fd-surface2)]"><Trash2 size={14} /></button>
                </span>
              </div>
              {(r.olay_bilgi || r.aciklama) && (
                <div className="flex items-center gap-1.5 text-[calc(var(--fd-fs)*0.76)] text-[var(--fd-text2)] mb-2">
                  {r.olay_bilgi && <span className="inline-flex items-center gap-1"><Flame size={12} className="text-[var(--fd-danger)]" /> {r.olay_bilgi}</span>}
                  {r.aciklama && <span className="text-[var(--fd-text3)]">· {r.aciklama}</span>}
                </div>
              )}
              <audio controls src={r.audio_url} className="w-full h-9" preload="none" />
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-3 rounded-[var(--fd-r)] shadow-[var(--fd-shadow-lg)] text-white text-[calc(var(--fd-fs)*0.88)] font-semibold ${toast.ok ? "bg-[var(--fd-success)]" : "bg-[var(--fd-danger)]"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {toast.msg}
        </div>
      )}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 rounded-[var(--fd-r-sm)] border border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text)] text-[calc(var(--fd-fs)*0.88)] focus:border-[var(--fd-accent)] focus:outline-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[calc(var(--fd-fs)*0.7)] font-bold uppercase tracking-wider text-[var(--fd-text3)]">{label}</span>
      {children}
    </label>
  )
}
