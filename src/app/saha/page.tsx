"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/lib/authStore"
import { api, getAuthHeaders } from "@/lib/api"
import { GeofenceButton } from "@/components/layout/GeofenceButton"
import { getTimeUntilNextShift, normalizeStationName } from "@/lib/shiftUtils"
import {
  ScanLine, Wrench, ClipboardCheck, Map as MapIcon, Flame,
  ChevronRight, ChevronLeft, Clock,
} from "lucide-react"

interface ActiveIncident {
  olay_turu?: string
  mahalle?: string
  adres?: string
  status?: string
}

export default function SahaPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [countdown, setCountdown] = useState("--:--:--")
  const [vehicleCount, setVehicleCount] = useState<number | null>(null)
  const [hydrantCount, setHydrantCount] = useState<number | null>(null)
  const [activeIncident, setActiveIncident] = useState<ActiveIncident | null>(null)

  const initials = user ? `${(user.ad || "").charAt(0)}${(user.soyad || "").charAt(0)}`.toUpperCase() : "--"
  // Kullanıcının istasyonu oturumda taşınmıyor; vardiya için Merkez varsayılır.
  const stationKey = normalizeStationName(undefined)

  // ── Vardiya geri sayımı (mevcut shiftUtils ile — gerçek hesaplama) ──
  useEffect(() => {
    const tick = () => {
      const t = getTimeUntilNextShift(stationKey)
      const p = (n: number) => String(n).padStart(2, "0")
      setCountdown(`${p(t.hours)}:${p(t.minutes)}:${p(t.seconds)}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [stationKey])

  // ── Gerçek veri: araç sayısı, hidrant sayısı, aktif vaka ──
  const loadData = useCallback(async () => {
    try {
      const { data: vehicles } = await api.from("vehicles").select("plaka")
      if (Array.isArray(vehicles)) setVehicleCount(vehicles.length)
    } catch { /* sessiz geç */ }
    try {
      const { data: hydrants } = await api.from("fire_hydrants").select("id")
      if (Array.isArray(hydrants)) setHydrantCount(hydrants.length)
    } catch { /* sessiz geç */ }
    try {
      const res = await fetch("/api/harita-canli-vaka", { headers: getAuthHeaders() })
      const json = await res.json()
      const list: ActiveIncident[] = Array.isArray(json.incidents) ? json.incidents : []
      const aktif = list.find((i) =>
        ["aktif", "active", "devam ediyor", "müdahale"].includes((i.status || "").toLowerCase())
      )
      setActiveIncident(aktif || null)
    } catch { /* sessiz geç */ }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const titleCase = (s?: string) =>
    (s || "").replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))

  return (
    <div className="flex flex-col min-h-[100dvh] px-4 pt-[calc(env(safe-area-inset-top)+18px)] pb-6 max-w-md mx-auto w-full gap-4">

      {/* ── Başlık: kullanıcı ── */}
      <header className="flex items-center gap-3 pt-1">
        <div className="w-11 h-11 rounded-full bg-[var(--fd-accent)] text-white grid place-items-center font-bold text-base shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[calc(var(--fd-fs)*1.02)] leading-tight truncate">
            {user ? `${user.ad} ${user.soyad}` : "—"}
          </div>
          <div className="text-[calc(var(--fd-fs)*0.76)] text-[var(--fd-text2)] font-mono truncate">
            {user?.sicilNo || "—"}{user?.unvan ? ` · ${user.unvan}` : ""}{user?.posta ? ` · ${user.posta}. Posta` : ""}
          </div>
        </div>
      </header>

      {/* ── Vardiya geri sayımı ── */}
      <div className="flex items-center justify-between rounded-[var(--fd-r)] border border-[var(--fd-border)] bg-[var(--fd-surface)] shadow-[var(--fd-shadow-sm)] px-4 py-3">
        <span className="flex items-center gap-2 text-[calc(var(--fd-fs)*0.7)] font-bold uppercase tracking-wider text-[var(--fd-text3)]">
          <Clock size={14} strokeWidth={1.8} /> Vardiya değişimine
        </span>
        <span className="font-mono font-bold text-[calc(var(--fd-fs)*1.25)] tabular-nums">{countdown}</span>
      </div>

      {/* ── Aktif vaka şeridi (yalnızca gerçek aktif vaka varsa) ── */}
      {activeIncident && (
        <Link
          href="/saha/harita"
          className="flex items-center gap-3 rounded-[var(--fd-r)] border border-[var(--fd-accent-soft2)] bg-[var(--fd-accent-soft)] px-4 py-3 no-underline"
        >
          <Flame size={20} strokeWidth={1.8} className="text-[var(--fd-danger)] shrink-0" />
          <div className="min-w-0">
            <div className="text-[calc(var(--fd-fs)*0.72)] font-bold uppercase tracking-wide text-[var(--fd-danger)]">
              Aktif Görev — {activeIncident.olay_turu || "Vaka"}
            </div>
            <div className="text-[calc(var(--fd-fs)*0.85)] font-semibold text-[var(--fd-text)] truncate">
              {titleCase(activeIncident.mahalle) || activeIncident.adres || "Konum haritada"}
            </div>
          </div>
          <span className="ml-auto flex items-center gap-1 text-[calc(var(--fd-fs)*0.72)] font-bold text-[var(--fd-danger)] shrink-0">
            Haritada <ChevronRight size={14} strokeWidth={1.8} />
          </span>
        </Link>
      )}

      {/* ── Nöbet (mevcut GeofenceButton — gerçek geofence + duty_logs) ── */}
      <section className="rounded-[var(--fd-r)] border border-[var(--fd-border)] bg-[var(--fd-surface)] shadow-[var(--fd-shadow-sm)] p-4">
        <div className="text-[calc(var(--fd-fs)*0.7)] font-bold uppercase tracking-wider text-[var(--fd-text3)] mb-3">
          Nöbet
        </div>
        <GeofenceButton isMobile />
      </section>

      {/* ── 4 büyük eylem butonu → mevcut rotalar ── */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-start">
        <SahaButton href="/yonetim/tarayici" tone="accent" icon={<ScanLine size={28} strokeWidth={1.8} />} title="QR Tara" sub="Araç / bölme sayımı" />
        <SahaButton href="/araclar" tone="amber" icon={<Wrench size={28} strokeWidth={1.8} />} title="Arıza Bildir" sub="Araç seç, bildir" />
        <SahaButton href="/gorevler" tone="info" icon={<ClipboardCheck size={28} strokeWidth={1.8} />} title="Görevlerim" sub="Devir-teslim işleri" />
        <SahaButton href="/saha/harita" tone="success" icon={<MapIcon size={28} strokeWidth={1.8} />} title="Harita"
          sub={hydrantCount != null ? `${hydrantCount} hidrant` : "Vaka · hidrant"} />
      </div>

      {/* ── Alt bilgi + panele dön ── */}
      <div className="text-center text-[calc(var(--fd-fs)*0.72)] text-[var(--fd-text3)]">
        {vehicleCount != null ? `${vehicleCount} araç · ` : ""}Sivas İtfaiyesi Saha Modu
      </div>
      <button
        onClick={() => router.push("/yonetim")}
        className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-[var(--fd-r-sm)] text-[calc(var(--fd-fs)*0.8)] font-semibold text-[var(--fd-text3)] hover:bg-[var(--fd-surface2)] hover:text-[var(--fd-text2)] transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.8} /> Yönetim Paneline Dön
      </button>
    </div>
  )
}

// ── Yardımcı: büyük saha butonu ──
function SahaButton({
  href, icon, title, sub, tone,
}: {
  href: string
  icon: React.ReactNode
  title: string
  sub: string
  tone: "accent" | "amber" | "info" | "success"
}) {
  const toneBg: Record<string, string> = {
    accent: "rgba(220,38,38,var(--fd-badge-a))",
    amber: "rgba(245,158,11,var(--fd-badge-a))",
    info: "rgba(37,99,235,var(--fd-badge-a))",
    success: "rgba(22,163,74,var(--fd-badge-a))",
  }
  const toneColor: Record<string, string> = {
    accent: "var(--fd-accent)",
    amber: "var(--fd-amber)",
    info: "var(--fd-info)",
    success: "var(--fd-success)",
  }
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2.5 rounded-[var(--fd-r-lg)] border border-[var(--fd-border)] bg-[var(--fd-surface)] shadow-[var(--fd-shadow-sm)] py-7 no-underline text-[var(--fd-text)] active:scale-[0.97] transition-transform hover:bg-[var(--fd-surface2)]"
    >
      <span className="w-[52px] h-[52px] rounded-[var(--fd-r)] grid place-items-center"
        style={{ background: toneBg[tone], color: toneColor[tone] }}>
        {icon}
      </span>
      <span className="font-bold text-[calc(var(--fd-fs)*1.05)]">{title}</span>
      <span className="text-[calc(var(--fd-fs)*0.74)] text-[var(--fd-text2)] -mt-1.5">{sub}</span>
    </Link>
  )
}
