"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Siren, Navigation, Truck, Users, MapPin } from "lucide-react"

interface AlarmPayload {
  title?: string
  body?: string
  olay_turu?: string
  adres?: string
  mahalle?: string
  plaka?: string
  posta?: string
  mesafe?: string
  url?: string
}

/**
 * Tam ekran vaka alarm katmanı.
 * Root layout'a eklenir; normalde görünmezdir. Şunları dinler:
 *  - Service Worker push mesajı ({ type: 'INCIDENT_ALARM', payload }) — uygulama açıkken
 *  - window 'saha:alarm' CustomEvent — test/manuel tetik
 * Mevcut hiçbir akışı değiştirmez; yalnızca üstte bir katman gösterir.
 */
export function AlarmOverlay() {
  const router = useRouter()
  const [alarm, setAlarm] = useState<AlarmPayload | null>(null)
  const [muted, setMuted] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sirenTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const beep = useCallback((freq: number, dur: number, when = 0) => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext)
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
      const a = audioCtxRef.current!
      const o = a.createOscillator(), g = a.createGain()
      o.type = "square"; o.frequency.value = freq
      g.gain.setValueAtTime(0.06, a.currentTime + when)
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur)
      o.connect(g).connect(a.destination)
      o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05)
    } catch { /* ses engellendi, yok say */ }
  }, [])

  const stopSiren = useCallback(() => {
    if (sirenTimer.current) { clearInterval(sirenTimer.current); sirenTimer.current = null }
  }, [])

  const startSiren = useCallback(() => {
    stopSiren()
    const once = () => { if (!muted) { beep(700, 0.38, 0); beep(950, 0.38, 0.4) } }
    once()
    sirenTimer.current = setInterval(once, 900)
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300])
  }, [beep, muted, stopSiren])

  const trigger = useCallback((p: AlarmPayload) => {
    setMuted(false)
    setAlarm(p)
  }, [])

  // Alarm açılınca siren başlat; kapanınca durdur
  useEffect(() => {
    if (alarm) startSiren()
    else stopSiren()
    return stopSiren
  }, [alarm, startSiren, stopSiren])

  // Dinleyiciler
  useEffect(() => {
    const onSwMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "INCIDENT_ALARM") trigger(e.data.payload || {})
    }
    const onTest = (e: Event) => trigger((e as CustomEvent).detail || {})
    navigator.serviceWorker?.addEventListener("message", onSwMessage)
    window.addEventListener("saha:alarm", onTest as EventListener)
    // Test kolaylığı: konsoldan window.__sahaTestAlarm()
    ;(window as any).__sahaTestAlarm = (p?: AlarmPayload) =>
      trigger(p || { olay_turu: "Yangın — İşyeri", adres: "Test Mahallesi, Örnek Cad. No:1", plaka: "58 AEL 289", posta: "2. Posta", mesafe: "3.4 km" })
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSwMessage)
      window.removeEventListener("saha:alarm", onTest as EventListener)
    }
  }, [trigger])

  if (!alarm) return null

  const tur = (alarm.olay_turu || alarm.title || "Canlı İhbar")
  const adres = alarm.adres || alarm.mahalle || alarm.body || "Konum haritada"

  const accept = () => {
    stopSiren()
    if (navigator.vibrate) navigator.vibrate([80, 40, 120])
    setAlarm(null)
    router.push("/saha/harita")
  }
  const openRoute = () => {
    if (alarm.url) { window.open(alarm.url, "_blank", "noopener"); return }
    accept()
  }

  return (
    <div
      role="alertdialog"
      aria-label="Vaka alarmı"
      className="fixed inset-0 z-[9999] flex flex-col text-white"
      style={{ background: "#641414" }}
    >
      <div className="pointer-events-none absolute inset-0 alarm-edge" />
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pt-16">
        <span className="w-20 h-20 rounded-full grid place-items-center alarm-siren" style={{ background: "var(--fd-danger)" }}>
          <Siren size={40} strokeWidth={1.8} />
        </span>
        <span className="text-[calc(var(--fd-fs)*0.74)] font-bold tracking-[0.2em]" style={{ color: "#fecaca" }}>CANLI İHBAR</span>
        <h2 className="text-[calc(var(--fd-fs)*2)] font-bold leading-tight text-balance">{String(tur).toLocaleUpperCase("tr-TR")}</h2>
        <div className="text-[calc(var(--fd-fs)*1.05)] font-semibold leading-snug max-w-[30ch]" style={{ color: "#fecaca" }}>{adres}</div>
        <div className="flex flex-wrap gap-2 justify-center mt-2 font-mono text-[calc(var(--fd-fs)*0.78)] font-bold">
          {alarm.plaka && <span className="alarm-chip"><Truck size={13} strokeWidth={1.8} />{alarm.plaka}</span>}
          {alarm.posta && <span className="alarm-chip"><Users size={13} strokeWidth={1.8} />{alarm.posta}</span>}
          {alarm.mesafe && <span className="alarm-chip"><MapPin size={13} strokeWidth={1.8} />{alarm.mesafe}</span>}
        </div>
      </div>
      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-3">
        <button onClick={accept} className="py-6 rounded-[var(--fd-r-lg)] bg-white font-bold text-[calc(var(--fd-fs)*1.35)]" style={{ color: "#7f1d1d" }}>
          Yola Çıktım
        </button>
        <button onClick={openRoute} className="py-4 rounded-[var(--fd-r)] border-2 font-bold text-[calc(var(--fd-fs)*0.95)] flex items-center justify-center gap-2" style={{ borderColor: "rgba(255,255,255,0.5)" }}>
          <Navigation size={16} strokeWidth={1.8} /> Rotayı Aç
        </button>
        <button onClick={() => setMuted((m) => !m)} className="self-center mt-0.5 text-[calc(var(--fd-fs)*0.8)] underline" style={{ color: "#fca5a5" }}>
          {muted ? "sesi aç" : "sesi kapat"}
        </button>
      </div>

      <style>{`
        .alarm-edge { border: 5px solid var(--fd-danger); border-radius: 0; animation: alarmEdge 1s ease-in-out infinite; }
        @keyframes alarmEdge { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
        .alarm-siren { animation: alarmSiren 1s ease-in-out infinite; }
        @keyframes alarmSiren { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.65); } 50% { box-shadow: 0 0 0 24px rgba(220,38,38,0); } }
        .alarm-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); }
        @media (prefers-reduced-motion: reduce) { .alarm-edge, .alarm-siren { animation: none; } }
      `}</style>
    </div>
  )
}
