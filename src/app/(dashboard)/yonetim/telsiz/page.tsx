"use client"

import { useState, useEffect, useRef } from "react"
import jsPDF from "jspdf"
import { useAuthStore } from "@/lib/authStore"
import { api } from "@/lib/api"
import PageGuard from "@/components/PageGuard"
import { Badge } from "@/components/ui/Badge"
import { 
  Radio, 
  Send, 
  Volume2, 
  VolumeX, 
  FileText, 
  Printer, 
  Loader2, 
  Shield, 
  Info, 
  Lock, 
  Unlock, 
  MessageSquare, 
  Clock, 
  User, 
  AlertTriangle,
  ArrowLeft 
} from "lucide-react"

// Turkish character cleanups for Helvetica built-in font in jsPDF
function cleanTurkishChars(text: string): string {
  if (!text) return ""
  const charMap: Record<string, string> = {
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
  }
  return text.replace(/[şŞıİğĞüÜöÖçÇ]/g, match => charMap[match] || match)
}

interface Incident {
  id: string
  olay_turu: string
  mahalle: string
  status: string
  cikis_saati: string
  adres?: string
}

interface RadioLog {
  id: string
  kanal_tipi: string
  vaka_id?: string
  gonderen_personel_id: string
  gonderen_ad_soyad: string
  gonderen_rutbe: string
  mesaj_metni: string
  telsiz_kodu?: string
  created_at: string
}

export default function TelsizPage() {
  const { user } = useAuthStore()
  const [personnelUuid, setPersonnelUuid] = useState<string>("")
  
  // Channels and selection state
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([])
  const [closedIncidents, setClosedIncidents] = useState<Incident[]>([])
  const [selectedChannel, setSelectedChannel] = useState<{ id: string; name: string; type: 'Genel' | 'Vaka'; isClosed: boolean }>({
    id: 'general',
    name: 'Genel Karargâh Muhabere',
    type: 'Genel',
    isClosed: false
  })

  // Messages and Input
  const [messages, setMessages] = useState<RadioLog[]>([])
  const [inputText, setInputText] = useState("")
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Simulation states
  const [isMuted, setIsMuted] = useState(false)
  const [isTxActive, setIsTxActive] = useState(false) // Red dot blinking (Transmission)
  const [isRxActive, setIsRxActive] = useState(false) // Green dot blinking (Reception)
  
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const prevMessagesLength = useRef<number>(0)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('channels')

  // Canvas waveform dynamic animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    let phase = 0
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      let amplitude = 1.5
      let speed = 0.05
      if (isTxActive || sendingMessage) {
        amplitude = 8
        speed = 0.22
      } else if (isRxActive) {
        amplitude = 6
        speed = 0.16
      } else if (inputText.trim().length > 0) {
        amplitude = 3
        speed = 0.08
      }
      
      ctx.strokeStyle = '#06b6d4' // cyan-500
      ctx.lineWidth = 1.5
      ctx.shadowBlur = 4
      ctx.shadowColor = 'rgba(6, 182, 212, 0.4)'
      
      ctx.beginPath()
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.1 + phase) * amplitude
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      
      phase += speed
      animationId = requestAnimationFrame(draw)
    }
    
    draw()
    return () => cancelAnimationFrame(animationId)
  }, [isTxActive, isRxActive, sendingMessage, inputText])

  // Resolve user's database personnel uuid on load
  useEffect(() => {
    async function resolveUuid() {
      if (user?.sicilNo) {
        try {
          const { data, error } = await api.from('personnel').select('id').eq('sicil_no', user.sicilNo).single()
          if (data && data.id) {
            setPersonnelUuid(data.id)
          }
        } catch (err) {
          console.error("Personnel id fetch error:", err)
        }
      }
    }
    resolveUuid()
  }, [user?.sicilNo])

  // Polling for Active and Closed incidents/channels list (every 5 seconds)
  useEffect(() => {
    async function fetchChannels() {
      try {
        const { data: incData } = await api.from('incidents').select('*').order('cikis_saati', { ascending: false })
        if (incData) {
          const active = incData.filter((i: any) => i.status === 'active')
          const closed = incData.filter((i: any) => i.status !== 'active')
          setActiveIncidents(active)
          setClosedIncidents(closed)
        }
      } catch (err) {
        console.error("Fetch incidents error:", err)
      } finally {
        setLoadingChannels(false)
      }
    }

    fetchChannels()
    const interval = setInterval(fetchChannels, 5000)
    return () => clearInterval(interval)
  }, [])

  // Helper to fetch selected channel messages
  const fetchMessages = async () => {
    if (!selectedChannel) return
    setIsRxActive(true)
    setTimeout(() => setIsRxActive(false), 300)

    try {
      let queryBuilder = api.from('radio_logs').select('*')
      if (selectedChannel.id === 'general') {
        queryBuilder = queryBuilder.eq('kanal_tipi', 'Genel')
      } else {
        queryBuilder = queryBuilder.eq('kanal_tipi', 'Vaka').eq('vaka_id', selectedChannel.id)
      }
      
      const { data, error } = await queryBuilder.order('created_at', { ascending: true })
      if (data) {
        setMessages(data)
      }
    } catch (err) {
      console.error("Fetch messages error:", err)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 40
    setShouldAutoScroll(isAtBottom)
  }

  // Polling for Selected Channel messages (every 2 seconds)
  useEffect(() => {
    prevMessagesLength.current = 0 // Reset message length tracker on channel change
    setShouldAutoScroll(true) // Reset auto-scroll to true when changing channels
    setLoadingMessages(true)
    fetchMessages().then(() => {
      setLoadingMessages(false)
      // Force scroll to bottom on channel change
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 100)
    })

    const interval = setInterval(fetchMessages, 2000)
    return () => clearInterval(interval)
  }, [selectedChannel])

  // Scroll to bottom and play squelch / static noise on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      if (shouldAutoScroll && chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
      
      // Play walkie-talkie audio squelch/siren on receiving a new message
      if (prevMessagesLength.current > 0) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg.telsiz_kodu === 'ACIL_DURUM') {
          playSirenSound()
        } else {
          playStaticNoise()
        }
      }
      prevMessagesLength.current = messages.length
    }
  }, [messages, shouldAutoScroll])

  // Send message action
  const handleSendMessage = async (text: string, telsizKodu: string | null = null) => {
    const cleanText = text.trim()
    if (!cleanText) return
    if (!user) return

    if (!personnelUuid) {
      alert("Kimliğiniz doğrulanıyor, lütfen 1 saniye bekleyip tekrar deneyin.")
      return
    }

    setSendingMessage(true)
    setIsTxActive(true)

    try {
      const payload = {
        kanal_tipi: selectedChannel.type,
        vaka_id: selectedChannel.id === 'general' ? null : selectedChannel.id,
        gonderen_personel_id: personnelUuid,
        gonderen_ad_soyad: `${user.ad} ${user.soyad}`,
        gonderen_rutbe: user.unvan || user.rol || "İtfaiye Eri",
        mesaj_metni: cleanText,
        telsiz_kodu: telsizKodu,
        created_at: new Date().toISOString()
      }

      const { data, error } = await api.insert('radio_logs', [payload])
      if (error) {
        console.error("Message insert error:", error)
        alert("Muhabere hatası: Telsiz mandalı başarısız.")
      } else {
        setInputText("")
        // Play beep sound if unmuted
        if (!isMuted && typeof window !== 'undefined') {
          playRadioBeep()
        }
        await fetchMessages()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSendingMessage(false)
      setIsTxActive(false)
    }
  }

  // Simulate Walkie-Talkie Over beep sound using Web Audio API
  const playRadioBeep = () => {
    if (isMuted) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      // Tone 1
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // High Pitch Beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch (e) {
      console.warn("Audio Context init failed:", e)
    }
  }

  // Play Walkie-Talkie Static/Squelch Noise using synthesized white noise
  const playStaticNoise = () => {
    if (isMuted || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const bufferSize = ctx.sampleRate * 0.12 // 120ms duration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1 // White noise
      }
      
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1000
      filter.Q.value = 1.2
      
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      
      noise.start()
    } catch (e) {
      console.warn("Static noise failed:", e)
    }
  }

  // Play Emergency Siren Yelp sound using low pass modulated oscillator
  const playSirenSound = () => {
    if (isMuted || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      
      const duration = 1.8 // 1.8 seconds duration
      const steps = 18
      for (let i = 0; i < steps; i++) {
        const time = ctx.currentTime + (duration / steps) * i
        const freq = i % 2 === 0 ? 900 : 600
        osc.frequency.setValueAtTime(freq, time)
      }
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1400
      
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (e) {
      console.warn("Siren sound failed:", e)
    }
  }

  // Generate Jurnal PDF using jsPDF
  const handlePrintJurnal = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const clean = (txt: string) => cleanTurkishChars(txt || "")

    // A4 border lines
    doc.rect(5, 5, 200, 287)
    doc.rect(6, 6, 198, 285)

    // Antetli Başlık
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(14)
    doc.text(clean("T.C. SIVAS BELEDIYESI"), 105, 20, { align: "center" })
    doc.setFontSize(12)
    doc.text(clean("ITFAIYE MUDURLUGU"), 105, 26, { align: "center" })
    doc.setFont("Helvetica", "normal")
    doc.setFontSize(11)
    doc.text(clean("RESMI VAKA TELSİZ MUHABERE JURNALI"), 105, 32, { align: "center" })

    doc.line(15, 38, 195, 38)

    // Detay Bilgileri
    doc.setFontSize(10)
    doc.setFont("Helvetica", "bold")
    doc.text(clean("MUHABERE DETAYLARI:"), 15, 46)
    
    doc.setFont("Helvetica", "normal")
    doc.text(clean(`Kanal Adi: ${selectedChannel.name}`), 15, 54)
    doc.text(clean(`Kanal Tipi: ${selectedChannel.type === 'Genel' ? 'Genel Karargah' : 'Olay Sevk Kanali'}`), 15, 60)
    doc.text(clean(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`), 15, 66)

    doc.line(15, 72, 195, 72)

    // Tablo Başlıkları
    doc.setFont("Helvetica", "bold")
    doc.text(clean("ZAMAN"), 15, 80)
    doc.text(clean("GONDEREN PERSONEL / RUTBE"), 40, 80)
    doc.text(clean("KOD"), 105, 80)
    doc.text(clean("MUHABERE METNI"), 120, 80)
    doc.line(15, 83, 195, 83)

    // Mesaj Dökümleri
    doc.setFont("Helvetica", "normal")
    let y = 89
    const maxPageHeight = 275

    messages.forEach((msg, idx) => {
      // If table reaches bottom, add a new page
      if (y > maxPageHeight) {
        doc.addPage()
        doc.rect(5, 5, 200, 287)
        doc.rect(6, 6, 198, 285)
        
        // Header on new page
        doc.setFont("Helvetica", "bold")
        doc.text(clean("ZAMAN"), 15, 15)
        doc.text(clean("GONDEREN PERSONEL / RUTBE"), 40, 15)
        doc.text(clean("KOD"), 105, 15)
        doc.text(clean("MUHABERE METNI"), 120, 15)
        doc.line(15, 18, 195, 18)
        
        doc.setFont("Helvetica", "normal")
        y = 24
      }

      const timeStr = new Date(msg.created_at).toLocaleTimeString('tr-TR')
      const senderStr = `${msg.gonderen_ad_soyad} (${msg.gonderen_rutbe})`
      const codeStr = msg.telsiz_kodu || "-"
      
      // Text wrap for walkie-talkie message
      const textLines = doc.splitTextToSize(msg.mesaj_metni, 70)

      doc.text(clean(timeStr), 15, y)
      doc.text(clean(senderStr), 40, y)
      doc.text(clean(codeStr), 105, y)
      
      textLines.forEach((line: string, lIdx: number) => {
        doc.text(clean(line), 120, y + (lIdx * 5))
      })

      y += Math.max(textLines.length * 5, 8)
      doc.line(15, y - 3, 195, y - 3)
      y += 3
    })

    // Signatures at the bottom
    if (y + 35 > maxPageHeight) {
      doc.addPage()
      doc.rect(5, 5, 200, 287)
      doc.rect(6, 6, 198, 285)
      y = 20
    }

    doc.setFont("Helvetica", "bold")
    doc.text(clean("RAPORU HAZIRLAYAN:"), 15, y + 15)
    doc.setFont("Helvetica", "normal")
    doc.text(clean(user ? `${user.ad} ${user.soyad}` : "Telsiz Operatörü"), 15, y + 22)
    doc.text(clean(user?.unvan || "Itfaiye Eri"), 15, y + 27)

    doc.setFont("Helvetica", "bold")
    doc.text(clean("NOBETCI AMIRI ONAYI:"), 120, y + 15)
    doc.setFont("Helvetica", "normal")
    doc.text(clean("............................"), 120, y + 22)
    doc.text(clean("İmza / Mühür"), 120, y + 27)

    doc.save(`Telsiz_Muhabere_Jurnali_${selectedChannel.id}.pdf`)
  }

  return (
    <PageGuard pageId="telsiz">
      <div className="flex flex-col min-h-[calc(100vh-8rem)] lg:min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 pb-2 md:pb-6 font-sans">
        
        {/* TOP STATUS CONTROL BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border border-slate-800 bg-slate-900/40 backdrop-blur-md px-4 py-3 rounded-xl gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/50 border border-cyan-800/30 rounded-lg text-cyan-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                Dijital Telsiz Muhabere Sistemi
                <span className="text-[10px] uppercase bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">CANLI</span>
              </h2>
              <p className="text-xs text-slate-400">Sivas İtfaiye Daire Başkanlığı Müfrezeler Arası Ortak Muhabere Ağı</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Audio Indicator */}
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isMuted 
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-400 hover:bg-rose-900/20' 
                  : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/20'
              }`}
              title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* General Jurnal Export Action */}
            <button
              onClick={handlePrintJurnal}
              disabled={messages.length === 0}
              className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Resmi Jurnal Bas
            </button>
          </div>
        </div>

        {/* MAIN COMMUNICATIONS PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          
          {/* LEFT CHANNEL SELECTOR PANEL (SOL PANEL) */}
          <div className={`lg:col-span-4 flex flex-col gap-4 border border-slate-900 bg-slate-950 rounded-xl p-4 max-h-[calc(100vh-21rem)] lg:max-h-[calc(100vh-14rem)] overflow-y-auto ${
            mobileView === 'channels' ? 'flex' : 'hidden lg:flex'
          }`}>
            
            {/* Telsiz Simulation Graphic Panel */}
            <div className="border border-slate-800/80 bg-slate-950 rounded-lg p-3 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(6,182,212,0.05)]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">MÜFREZE AKSIYON FREKANSI</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isTxActive ? 'bg-red-500 animate-ping' : 'bg-red-900'}`} title="TX - Gönderme" />
                  <span className="text-[8px] font-bold text-red-500 mr-1.5">TX</span>
                  <div className={`w-2 h-2 rounded-full ${isRxActive ? 'bg-green-500 animate-ping' : 'bg-green-900'}`} title="RX - Alma" />
                  <span className="text-[8px] font-bold text-green-500">RX</span>
                </div>
              </div>
              
              {/* Status Screen with animated canvas waveform */}
              <div className="mt-3 bg-slate-900/90 border border-slate-800/60 rounded px-3 py-2 flex items-center justify-between font-mono">
                <span className="text-xs font-black text-cyan-400 tracking-widest uppercase">ANLIK KANAL BAĞLANTISI</span>
                <canvas 
                  ref={canvasRef} 
                  width={90} 
                  height={18} 
                  className="w-[90px] h-[18px] opacity-90"
                />
              </div>
            </div>

            <div className="border-t border-slate-900 my-1" />

            {/* Channels Lists */}
            <div className="space-y-4">
              
              {/* Category 1: Karargah Main Channel */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-2">KARARGÂH KANALI</span>
                <button
                  onClick={() => {
                    setSelectedChannel({ id: 'general', name: 'Genel Karargâh Muhabere', type: 'Genel', isClosed: false })
                    setMobileView('chat')
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedChannel.id === 'general'
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold shadow-[inset_10px_0_15px_-10px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-900/20 border-slate-900 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm">Genel Karargâh Muhabere</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </button>
              </div>

              {/* Category 2: Active incident channels */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-2">🚨 CANLI OLAY KANALLARI</span>
                {loadingChannels ? (
                  <div className="py-4 text-center text-xs text-slate-500">Kanallar yükleniyor...</div>
                ) : activeIncidents.length === 0 ? (
                  <div className="py-3 px-2 border border-dashed border-slate-900 text-xs text-slate-500 rounded-lg text-center">
                    Aktif ihbar sevk kanalı bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeIncidents.map(inc => (
                      <button
                        key={inc.id}
                        onClick={() => {
                          setSelectedChannel({ id: inc.id, name: `Vaka #${inc.olay_turu} (${inc.mahalle})`, type: 'Vaka', isClosed: false })
                          setMobileView('chat')
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedChannel.id === inc.id
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold shadow-[inset_10px_0_15px_-10px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-900/20 border-slate-900 hover:border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-sm block truncate font-bold text-slate-200">{inc.olay_turu}</span>
                            <span className="text-[10px] block text-slate-400 truncate">{inc.mahalle} Mah.</span>
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category 3: Closed incident channels (Archive) */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-2">🗄️ KAPATILMIŞ VAKA ARŞİVİ (SALT OKUNUR)</span>
                {loadingChannels ? null : closedIncidents.length === 0 ? (
                  <div className="py-2 text-center text-xs text-slate-600">Arşiv kaydı bulunmuyor.</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    {closedIncidents.map(inc => (
                      <button
                        key={inc.id}
                        onClick={() => {
                          setSelectedChannel({ id: inc.id, name: `Arşiv: Vaka #${inc.olay_turu} (${inc.mahalle})`, type: 'Vaka', isClosed: true })
                          setMobileView('chat')
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedChannel.id === inc.id
                            ? 'bg-slate-800/80 border-slate-700 text-slate-300 font-bold'
                            : 'bg-slate-950 border-slate-900/80 hover:border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs block truncate font-semibold">{inc.olay_turu}</span>
                            <span className="text-[9px] block text-slate-500 truncate">{inc.mahalle} Mah.</span>
                          </div>
                        </div>
                        <span className="text-[9px] bg-slate-900 border border-slate-800 px-1 rounded text-slate-500">Arşiv</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT MESSAGE LOGS & CHAT WINDOW (SAĞ PANEL) */}
          <div className={`lg:col-span-8 flex flex-col border border-slate-900 bg-slate-950/60 rounded-xl overflow-hidden min-h-[300px] lg:min-h-[500px] max-h-[calc(100vh-21rem)] lg:max-h-[calc(100vh-14rem)] ${
            mobileView === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}>
            
            {/* Header info */}
            <div className="border-b border-slate-900 bg-slate-950 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {/* Back Button on Mobile */}
                <button
                  onClick={() => setMobileView('channels')}
                  className="lg:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 mr-2 shrink-0 cursor-pointer"
                  title="Kanallara Dön"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedChannel.isClosed ? 'bg-slate-500' : 'bg-cyan-500 animate-pulse'}`} />
                <h3 className="font-bold text-slate-100 truncate text-sm md:text-base">{selectedChannel.name}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedChannel.isClosed ? (
                  <Badge className="bg-slate-900 border-slate-800 text-slate-400 flex items-center gap-1 text-[10px]">
                    <Lock className="w-3 h-3" /> Salt Okunur Mod
                  </Badge>
                ) : (
                  <Badge className="bg-cyan-950/45 border-cyan-800/30 text-cyan-400 flex items-center gap-1 text-[10px]">
                    <Unlock className="w-3 h-3" /> Canlı Kanal
                  </Badge>
                )}
                {selectedChannel.isClosed && (
                  <button
                    onClick={handlePrintJurnal}
                    className="px-2.5 py-1 text-[10px] font-bold bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 text-cyan-400 rounded cursor-pointer transition-all flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF Jurnali Bas
                  </button>
                )}
              </div>
            </div>

            {/* Chat Stream Window */}
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/30 scrollbar-thin"
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  <span className="text-xs">Muhabere logları yükleniyor...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-600 gap-2">
                  <Radio className="w-8 h-8 opacity-20" />
                  <span className="text-xs font-mono">TELSİZ MANDALI AÇIK - SES KAYDI YOK</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = msg.gonderen_personel_id === personnelUuid
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      {/* Name, Rank & Time */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        <User className="w-3 h-3 text-cyan-500" />
                        <span className="font-semibold">{msg.gonderen_ad_soyad}</span>
                        <span className="text-slate-500">({msg.gonderen_rutbe})</span>
                        <Clock className="w-3 h-3 text-slate-500 ml-1" />
                        <span className="text-slate-500">{new Date(msg.created_at).toLocaleTimeString('tr-TR')}</span>
                      </div>

                      {/* Bubble content */}
                      <div 
                        className={`rounded-xl px-3 py-2.5 text-sm border shadow-lg ${
                          isCurrentUser 
                            ? 'bg-cyan-950/20 border-cyan-800/35 text-slate-100 rounded-tr-none'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {/* Radio Code badge if present */}
                        {msg.telsiz_kodu && (
                          <div className="mb-1 flex">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                              📟 {msg.telsiz_kodu}
                            </span>
                          </div>
                        )}
                        <p className="font-mono leading-relaxed whitespace-pre-wrap">{msg.mesaj_metni}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* QUICK ACTIONS BUTTONS & WRITING PANEL */}
            {selectedChannel.isClosed ? (
              <div className="bg-slate-950 border-t border-slate-900 p-4 flex items-center justify-center gap-2 text-slate-400 bg-gradient-to-r from-slate-900/10 to-amber-950/5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-amber-500/85">Bu vaka kapatılmıştır. Kanal salt okunur moddadır.</span>
              </div>
            ) : (
              <div className="bg-slate-950 border-t border-slate-900 p-3 space-y-3">
                
                {/* HIZLI TELSİZ KOD BUTONLARI */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] font-bold text-slate-500 mr-1 uppercase">HIZLI KOD:</span>
                  <button
                    onClick={() => handleSendMessage("Anlaşıldı, tamam.", "ANLASILDI")}
                    disabled={sendingMessage || !personnelUuid}
                    className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800/60 hover:border-cyan-500/50 text-cyan-400 rounded-lg cursor-pointer transition-all font-mono font-bold"
                  >
                    📟 Anlaşıldı
                  </button>
                  <button
                    onClick={() => handleSendMessage("Müfrezeden vaka yerine intikal başladı, tamam.", "INTIKAL")}
                    disabled={sendingMessage || !personnelUuid}
                    className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800/60 hover:border-cyan-500/50 text-cyan-400 rounded-lg cursor-pointer transition-all font-mono font-bold"
                  >
                    🚒 İntikal / Çıkış
                  </button>
                  <button
                    onClick={() => handleSendMessage("Olay yerine ulaşıldı, yangına müdahale başladı, tamam.", "VARIS")}
                    disabled={sendingMessage || !personnelUuid}
                    className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800/60 hover:border-cyan-500/50 text-cyan-400 rounded-lg cursor-pointer transition-all font-mono font-bold"
                  >
                    🔥 Olay Yerine Varış
                  </button>
                  <button
                    onClick={() => handleSendMessage("Merkez, acil su tankeri takviyesi sevk edin, tamam.", "SU_TAKVIYESI")}
                    disabled={sendingMessage || !personnelUuid}
                    className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800/60 hover:border-cyan-500/50 text-cyan-400 rounded-lg cursor-pointer transition-all font-mono font-bold"
                  >
                    💧 Su Takviyesi
                  </button>
                  <button
                    onClick={() => handleSendMessage("Yangın kontrol altına alındı, soğutma başladı, tamam.", "KONTROL")}
                    disabled={sendingMessage || !personnelUuid}
                    className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800/60 hover:border-cyan-500/50 text-cyan-400 rounded-lg cursor-pointer transition-all font-mono font-bold"
                  >
                    🟢 Kontrol Altında
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSirenSound()
                      handleSendMessage("🚨 ACİL DURUM İKAZI! İvedi koordinasyon sağlayın, tamam.", "ACIL_DURUM")
                    }}
                    disabled={sendingMessage || !personnelUuid}
                    className="px-2.5 py-1 text-xs bg-red-950/20 hover:bg-red-900/20 border border-red-800/40 hover:border-red-500 text-red-400 rounded-lg cursor-pointer transition-all font-mono font-bold flex items-center gap-1"
                  >
                    🚨 Acil Durum İkazı
                  </button>
                </div>

                {/* WRITER INPUT AREA */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage(inputText)
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Mandalı basmak için mesajınızı yazın... (Enter veya Gönder)"
                    disabled={sendingMessage}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !inputText.trim() || !personnelUuid}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold p-2 px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>

              </div>
            )}

          </div>

        </div>

      </div>
    </PageGuard>
  )
}
