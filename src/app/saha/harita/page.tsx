"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { api, getAuthHeaders } from "@/lib/api"
import { ChevronLeft, Navigation, Loader2, Flame } from "lucide-react"

const Map = dynamic(() => import("@/components/map/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--fd-surface)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--fd-accent)] mb-2" />
      <span className="text-sm font-medium text-[var(--fd-text2)]">Harita yükleniyor…</span>
    </div>
  ),
}) as any

// ── PostGIS WKB nokta çözücü (mevcut Map.tsx ile birebir) ──
function parseWKBPoint(wkbHex: string): [number, number] | null {
  if (!wkbHex || typeof wkbHex !== "string") return null
  const cleanHex = wkbHex.trim()
  if (cleanHex.length < 42) return null
  const isLittleEndian = cleanHex.substring(0, 2) === "01"
  const type = cleanHex.substring(2, 10)
  let coordsHex = ""
  if (type === "01000020" || type === "20000001") coordsHex = cleanHex.substring(18)
  else if (type === "01000000" || type === "00000001") coordsHex = cleanHex.substring(10)
  else if (cleanHex.length === 50) coordsHex = cleanHex.substring(18)
  else if (cleanHex.length === 42) coordsHex = cleanHex.substring(10)
  else return null
  if (coordsHex.length < 32) return null
  const hexToDouble = (h: string): number => {
    const bytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) bytes[isLittleEndian ? i : 7 - i] = parseInt(h.substring(i * 2, i * 2 + 2), 16)
    return new DataView(bytes.buffer).getFloat64(0, true)
  }
  return [hexToDouble(coordsHex.substring(0, 16)), hexToDouble(coordsHex.substring(16, 32))]
}

// Map'e verilecek stabil boş dizi referansları (her render aynı — döngü önlenir)
const EMPTY_ARR: any[] = []
function parseLoc(loc: any): [number, number] | null {
  if (!loc) return null
  if (typeof loc === "string") {
    const t = loc.trim()
    if (/^[0-9a-fA-F]+$/.test(t)) { const p = parseWKBPoint(t); if (p) return p }
    try { const p = JSON.parse(loc); if (p.coordinates) return [p.coordinates[0], p.coordinates[1]] } catch { return null }
  }
  if (loc.coordinates) return [loc.coordinates[0], loc.coordinates[1]]
  return null
}

export default function SahaHaritaPage() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<any[]>([])
  const [hydrants, setHydrants] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/harita-canli-vaka", { headers: getAuthHeaders() })
        const json = await res.json()
        if (Array.isArray(json.incidents)) setIncidents(json.incidents)
      } catch { /* yok say */ }
      try {
        const { data } = await api.from("fire_hydrants").select("*")
        if (Array.isArray(data)) setHydrants(data)
      } catch { /* yok say */ }
    })()
  }, [])

  // Haritada YALNIZCA aktif vakalar gösterilir; kapalı/test kayıtları görünmez.
  const activeIncidents = useMemo(
    () => incidents.filter((i) =>
      ["aktif", "active", "devam ediyor", "müdahale"].includes((i.status || "").toLowerCase())
    ),
    [incidents]
  )
  // Odaklanılacak / yol tarifi verilecek vaka: aktif vakaların ilki (yoksa yok).
  const target = useMemo(() => activeIncidents[0] || null, [activeIncidents])

  const targetCoord = useMemo<[number, number] | null>(() => target ? parseLoc(target.location) : null, [target])

  // Odak konumunu YALNIZCA BİR KEZ sabitle. Map, focusLocation'a göre otomatik vaka
  // seçtiği için sürekli değişen bir referans "Maximum update depth" döngüsüne yol açar.
  const [focus, setFocus] = useState<[number, number] | null>(null)
  useEffect(() => {
    if (targetCoord && !focus) setFocus([targetCoord[1], targetCoord[0]])
  }, [targetCoord, focus])

  const onMapClick = useCallback(() => {}, [])

  const openDirections = () => {
    if (!targetCoord) return
    const [lng, lat] = targetCoord
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener")
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* Harita (mevcut bileşen, gerçek veri) */}
      <div className="absolute inset-0">
        <Map
          incidents={activeIncidents}
          hydrants={hydrants}
          vehicles={EMPTY_ARR}
          externalMissions={EMPTY_ARR}
          mode="idle"
          onMapClick={onMapClick}
          focusLocation={focus}
          showPersonnelLayer={false}
          defaultShowHydrants={false}
        />
      </div>

      {/* Geri butonu */}
      <button
        onClick={() => router.push("/saha")}
        aria-label="Geri"
        className="absolute top-[calc(env(safe-area-inset-top)+14px)] left-4 z-[500] w-11 h-11 grid place-items-center rounded-[var(--fd-r-sm)] border border-[var(--fd-border)] bg-[var(--fd-surface)] text-[var(--fd-text)] shadow-[var(--fd-shadow)]"
      >
        <ChevronLeft size={20} strokeWidth={1.8} />
      </button>

      {/* Alt kart: hedef vaka + yol tarifi */}
      {target && (
        <div className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-[500] rounded-[var(--fd-r-lg)] border border-[var(--fd-border)] bg-[var(--fd-surface)] shadow-[var(--fd-shadow-lg)] p-4">
          <div className="flex items-start gap-3">
            <Flame size={18} strokeWidth={1.8} className="text-[var(--fd-danger)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold text-[calc(var(--fd-fs)*0.95)]">{target.olay_turu || "Vaka"}</div>
              <div className="text-[calc(var(--fd-fs)*0.8)] text-[var(--fd-text2)] leading-snug">
                {target.adres || target.mahalle || "Konum haritada işaretli"}
              </div>
            </div>
          </div>
          <button
            onClick={openDirections}
            disabled={!targetCoord}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-[var(--fd-r)] bg-[var(--fd-accent)] text-white font-bold text-[calc(var(--fd-fs)*1)] disabled:opacity-50"
          >
            <Navigation size={16} strokeWidth={1.8} /> Yol Tarifini Başlat
          </button>
        </div>
      )}
    </div>
  )
}
