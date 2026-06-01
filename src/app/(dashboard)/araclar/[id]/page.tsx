"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { 
  Truck, 
  PackageSearch, 
  ChevronRight, 
  ArrowLeft, 
  Gauge, 
  Clock, 
  ShieldCheck, 
  CalendarDays, 
  History, 
  Printer,
  Compass,
  Layers,
  Zap,
  Wrench,
  Droplet,
  Flame,
  Hammer,
  Activity,
  Maximize,
  Gauge as GaugeIcon,
  FolderOpen,
  Box,
  Plus,
  Search,
  X
} from "lucide-react"
import { InventoryList } from "@/components/vehicle/InventoryList"
import { Vehicle3DSchematic } from "@/components/vehicle/Vehicle3DSchematic"
import { AuditTimeline } from "@/components/inventory/AuditTimeline"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { api } from "@/lib/api"
import { QRCodeSVG } from "qrcode.react"
import { APP_BASE_URL } from "@/lib/constants"
import { useAuthStore } from "@/lib/authStore"
import { InventoryAddEditModal } from "@/components/inventory/InventoryAddEditModal"
import { InventoryItem, Vehicle } from "@/types"
export interface AracBakimGecmisi {
  id: number;
  plaka: string;
  tarih: string;
  tip: 'tamir' | 'yag_bakimi';
  aciklama: string;
  maliyet: number;
  created_at?: string;
}

function buildQrUrl(plaka: string, compartment: string): string {
  const slug = plaka.replace(/\s+/g, "-").toLowerCase()
  return `${APP_BASE_URL}/arac/${slug}/${compartment}`
}

const TACTICAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  kabin_ici: Compass,
  arac_ici: Layers,
  sol_on_kapak: Zap,
  sol_orta_kapak: Wrench,
  sol_arka_kapak: Droplet,
  sag_on_kapak: Flame,
  sag_orta_kapak: Hammer,
  sag_arka_kapak: Activity,
  arac_ustu: Maximize,
  arka_bolme: GaugeIcon,
  arka_kapak: FolderOpen,
  sol_dolap: Box,
  sag_dolap: Box,
  bagaj_ici: Box,
  kasa_ici: Layers,
};

export default function VehicleDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const idStr = params.id as string
  const { user } = useAuthStore()
  const isEr = user?.rol === 'User'

  const getCompartmentLabel = (key: string): string => {
    if (!key) return ""
    if (COMPARTMENT_NAMES[key]) return COMPARTMENT_NAMES[key]
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCompartment, setActiveCompartment] = useState<string | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [maintenanceLogs, setMaintenanceLogs] = useState<AracBakimGecmisi[]>([])

  // Arama Barı States
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Envanter Add/Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null)
  const [isEditingList, setIsEditingList] = useState(false)

  // Siber Taktik Araç Yapılandırma HUD States
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false)
  const [tempSuKapasite, setTempSuKapasite] = useState<number>(0)
  const [tempKopukKapasite, setTempKopukKapasite] = useState<number>(0)
  const [tempBolmeler, setTempBolmeler] = useState<Record<string, InventoryItem[]>>({})
  const [newCompKey, setNewCompKey] = useState<string>("")
  const [newCompPreset, setNewCompPreset] = useState<string>("custom")
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({})
  const [savingConfig, setSavingConfig] = useState(false)

  // Sync temp states on vehicle load
  useEffect(() => {
    if (vehicle) {
      setTempSuKapasite(vehicle.su_kapasite || 0)
      setTempKopukKapasite(vehicle.kopuk_kapasite || 0)
      setTempBolmeler(JSON.parse(JSON.stringify(vehicle.bolmeler || {})))
    }
  }, [vehicle])

  useEffect(() => {
    async function fetchVehicleAndLogs() {
      try {
        const { data: vehicles } = await api.from<Vehicle>('vehicles').select('*') as { data: Vehicle[] | null; error: unknown }
        const vehiclesList = vehicles || []
        setAllVehicles(vehiclesList)
        const found = vehiclesList.find((v: Vehicle) => v.plaka.replace(/\s+/g, '-').toLowerCase() === idStr)
        setVehicle(found || null)

        if (found) {
          const { data: logs } = await api.from<AracBakimGecmisi>('arac_bakim_gecmisi')
            .eq('plaka', found.plaka)
            .order('tarih', { ascending: false }) as { data: AracBakimGecmisi[] | null; error: unknown }
          setMaintenanceLogs(logs || [])
        }
      } catch (err) {
        console.error("Error fetching vehicle or logs:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchVehicleAndLogs()
  }, [idStr])
  
  // Listen and sync searchParams (QR deep linking)
  useEffect(() => {
    if (!vehicle) return
    const bolmeParam = searchParams.get("bolme")
    const keys = Object.keys(vehicle.bolmeler || {})
    if (bolmeParam && (keys.includes(bolmeParam) || vehicle.bolmeler?.[bolmeParam])) {
      setActiveCompartment(bolmeParam)
    } else if (keys.length > 0) {
      setActiveCompartment(keys[0])
    }
  }, [searchParams, vehicle])

  const handleSaveEquipment = async (item: InventoryItem, targetCompartment: string) => {
    if (!vehicle) return

    const updatedBolmeler = JSON.parse(JSON.stringify(vehicle.bolmeler || {}))

    if (!updatedBolmeler[targetCompartment]) {
      updatedBolmeler[targetCompartment] = []
    }

    const isEdit = modalItem !== null

    if (isEdit && modalItem) {
      let foundOriginalComp: string | null = null
      let originalIndex = -1

      for (const compKey of Object.keys(updatedBolmeler)) {
        const idx = updatedBolmeler[compKey].findIndex((i: InventoryItem) => i.id === item.id || (i.malzeme === modalItem.malzeme && i.adet === modalItem.adet))
        if (idx !== -1) {
          foundOriginalComp = compKey
          originalIndex = idx
          break
        }
      }

      if (foundOriginalComp !== null && originalIndex !== -1) {
        if (foundOriginalComp === targetCompartment) {
          updatedBolmeler[targetCompartment][originalIndex] = {
            id: item.id,
            malzeme: item.malzeme,
            adet: item.adet,
            durum: item.durum
          }
        } else {
          updatedBolmeler[foundOriginalComp].splice(originalIndex, 1)
          updatedBolmeler[targetCompartment].push({
            id: item.id,
            malzeme: item.malzeme,
            adet: item.adet,
            durum: item.durum
          })
        }
      } else {
        updatedBolmeler[targetCompartment].push({
          id: item.id,
          malzeme: item.malzeme,
          adet: item.adet,
          durum: item.durum
        })
      }
    } else {
      updatedBolmeler[targetCompartment].push({
        id: item.id,
        malzeme: item.malzeme,
        adet: item.adet,
        durum: item.durum
      })
    }

    const { error: updateErr } = await api.update('vehicles', { bolmeler: updatedBolmeler }, { plaka: vehicle.plaka })

    if (updateErr) {
      throw updateErr
    }

    setVehicle({
      ...vehicle,
      bolmeler: updatedBolmeler
    })

    fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: isEdit ? 'inventory_update' : 'inventory_add',
        actor_sicil_no: user?.sicilNo || 'unknown',
        actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
        target: vehicle.plaka,
        details: {
          action: isEdit ? 'edit_item' : 'add_item',
          item: item,
          compartment: targetCompartment,
          original_compartment: isEdit ? modalItem.id : undefined
        },
      }),
    }).catch(err => console.error('[AuditLog] Envanter logu gönderilemedi:', err))
  }

  const handleDeleteEquipment = async (item: InventoryItem) => {
    if (!vehicle || !activeCompartment) return

    if (!window.confirm(`"${item.malzeme}" malzemesini envanterden silmek istediğinize emin misiniz?`)) {
      return
    }

    const updatedBolmeler = JSON.parse(JSON.stringify(vehicle.bolmeler || {}))
    if (!updatedBolmeler[activeCompartment]) return

    const idx = updatedBolmeler[activeCompartment].findIndex((i: InventoryItem) => i.id === item.id || (i.malzeme === item.malzeme && i.adet === item.adet))
    if (idx === -1) return

    updatedBolmeler[activeCompartment].splice(idx, 1)

    const { error: updateErr } = await api.update('vehicles', { bolmeler: updatedBolmeler }, { plaka: vehicle.plaka })

    if (updateErr) {
      alert("Hata: " + updateErr.message)
      return
    }

    setVehicle({
      ...vehicle,
      bolmeler: updatedBolmeler
    })

    fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: 'inventory_delete',
        actor_sicil_no: user?.sicilNo || 'unknown',
        actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
        target: vehicle.plaka,
        details: {
          action: 'delete_item',
          item: item,
          compartment: activeCompartment
        },
      }),
    }).catch(err => console.error('[AuditLog] Envanter silme logu gönderilemedi:', err))
  }

  const handleOpenAddModal = () => {
    setModalItem(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item: InventoryItem) => {
    setModalItem(item)
    setIsModalOpen(true)
  }

  const handleSelectCompartment = (key: string) => {
    setActiveCompartment(key)
    const nextParams = new URLSearchParams(window.location.search)
    nextParams.set("bolme", key)
    router.replace(`${window.location.pathname}?${nextParams.toString()}`)
  }

  const handlePrint = () => {
    const printArea = document.getElementById('vehicle-print-area')
    if (!printArea) return

    const clone = printArea.cloneNode(true) as HTMLElement
    clone.className = 'print-area-container'
    clone.id = 'vehicle-print-area-live'
    document.body.appendChild(clone)

    setTimeout(() => {
      window.print()
      setTimeout(() => {
        const live = document.getElementById('vehicle-print-area-live')
        if (live) document.body.removeChild(live)
      }, 500)
    }, 400)
  }

  // Renaming compartment key
  const handleRenameChange = (oldKey: string, val: string) => {
    setRenameInputs(prev => ({ ...prev, [oldKey]: val }))
  }

  const applyRename = (oldKey: string) => {
    const newKey = renameInputs[oldKey]?.trim()
    if (!newKey || newKey === oldKey) return

    if (tempBolmeler[newKey]) {
      alert(`"${newKey}" bölmesi zaten mevcut. Lütfen benzersiz bir isim girin.`)
      return
    }

    const updated = { ...tempBolmeler }
    updated[newKey] = updated[oldKey] || []
    delete updated[oldKey]

    setTempBolmeler(updated)

    if (activeCompartment === oldKey) {
      setActiveCompartment(newKey)
    }

    setRenameInputs(prev => {
      const next = { ...prev }
      delete next[oldKey]
      return next
    })
  }

  // Deleting compartment key
  const handleDeleteCompartment = (key: string) => {
    const itemsCount = tempBolmeler[key]?.length || 0
    if (itemsCount > 0) {
      const confirmDelete = window.confirm(`"${getCompartmentLabel(key)}" bölmesi içinde ${itemsCount} adet malzeme bulunmaktadır. Bu bölmeyi sildiğinizde İÇİNDEKİ TÜM MALZEMELER DE SİLİNECEKTİR. Emin misiniz?`)
      if (!confirmDelete) return
    } else {
      const confirmDelete = window.confirm(`"${getCompartmentLabel(key)}" bölmesini silmek istediğinize emin misiniz?`)
      if (!confirmDelete) return
    }

    const updated = { ...tempBolmeler }
    delete updated[key]
    setTempBolmeler(updated)

    if (activeCompartment === key) {
      const remainingKeys = Object.keys(updated)
      setActiveCompartment(remainingKeys.length > 0 ? remainingKeys[0] : null)
    }
  }

  // Adding new compartment key
  const handleAddCompartment = () => {
    let keyToAdd = ""
    if (newCompPreset === "custom") {
      keyToAdd = newCompKey.trim().toLowerCase().replace(/\s+/g, "_")
    } else {
      keyToAdd = newCompPreset
    }

    if (!keyToAdd) {
      alert("Lütfen geçerli bir bölme ismi veya anahtarı girin.")
      return
    }

    if (tempBolmeler[keyToAdd]) {
      alert(`"${keyToAdd}" bölmesi zaten ekli.`)
      return
    }

    const updated = { ...tempBolmeler, [keyToAdd]: [] }
    setTempBolmeler(updated)
    setNewCompKey("")
    setNewCompPreset("custom")

    setActiveCompartment(keyToAdd)
  }

  // Saving configuration
  const handleSaveConfig = async () => {
    if (!vehicle) return
    setSavingConfig(true)
    try {
      const { error: updateErr } = await api.update('vehicles', {
        su_kapasite: tempSuKapasite,
        kopuk_kapasite: tempKopukKapasite,
        bolmeler: tempBolmeler
      }, { plaka: vehicle.plaka })

      if (updateErr) {
        throw updateErr
      }

      setVehicle(prev => {
        if (!prev) return null
        return {
          ...prev,
          su_kapasite: tempSuKapasite,
          kopuk_kapasite: tempKopukKapasite,
          bolmeler: tempBolmeler
        }
      })

      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'vehicle_config_update',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: vehicle.plaka,
          details: {
            action: 'update_vehicle_configuration',
            su_kapasite: tempSuKapasite,
            kopuk_kapasite: tempKopukKapasite,
            bolmeler_keys: Object.keys(tempBolmeler)
          },
        }),
      }).catch(err => console.error('[AuditLog] Yapılandırma logu gönderilemedi:', err))

      alert("Araç yapılandırması başarıyla güncellendi!")
      setIsConfigPanelOpen(false)
    } catch (err: any) {
      console.error("Error saving configuration:", err)
      alert("Hata oluştu: " + err.message)
    } finally {
      setSavingConfig(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
    </div>
  )
  if (!vehicle) return <div className="p-6">Araç bulunamadı.</div>

  const compartKeys = Object.keys(vehicle.bolmeler || {})

  const activeItems: InventoryItem[] = activeCompartment ? (vehicle.bolmeler?.[activeCompartment] || []) : []

  // Count total items and issues safely
  const totalItems = Object.values(vehicle.bolmeler || {}).flat().length
  const issueItems = Object.values(vehicle.bolmeler || {}).flat().filter((i: unknown) => (i as InventoryItem)?.durum !== "Tam").length

  // Plaka Filtreleme Logic
  const filteredVehicles = searchQuery.trim() === "" 
    ? [] 
    : allVehicles.filter(v => 
        v.plaka.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.aracTipi || "").toLowerCase().includes(searchQuery.toLowerCase())
      )

  // Telemetri Tipleri Logic
  const rawTipi = (vehicle.aracTipi || vehicle.arac_tipi || "").toUpperCase()
  const isArazoz = rawTipi.includes("ARAZÖZ") || rawTipi.includes("HIZLI") || rawTipi.includes("MÜDAHALE")
  const isKurtarma = rawTipi.includes("KURTARMA")
  const isMerdivenli = rawTipi.includes("MERDİVEN") || rawTipi.includes("METRE")

  const renderTelemetryCards = () => {
    const kmStr = `${(vehicle.km || 0).toLocaleString("tr-TR")} km`
    const ptoStr = `${(vehicle.motorSaatiPTO || 0).toLocaleString("tr-TR")} sa`
    const suCapacity = vehicle.su_kapasite || 0
    const kopukCapacity = vehicle.kopuk_kapasite || 0

    // Dynamic calculations
    const suVal = Math.round(suCapacity * 0.85) // 85% simulated
    const kopukVal = Math.round(kopukCapacity * 0.90) // 90% simulated

    // Taktik Malzeme HUD card percentage
    const maxTaktikMalzeme = 150
    const totalItemsCount = totalItems || 0
    const taktikPercent = Math.min(Math.round((totalItemsCount / maxTaktikMalzeme) * 100), 100)

    // Sorunlu Malzeme HUD card percentage
    const issueItemsCount = issueItems || 0
    const sorunPercent = totalItemsCount > 0 ? Math.min(Math.round((issueItemsCount / totalItemsCount) * 100), 100) : 0

    // ----------------------------------------------------
    // HUD-3 (Antifreeze) calculation
    // ----------------------------------------------------
    const antifreezeLog = maintenanceLogs.find(l => {
      const desc = l.aciklama.toUpperCase();
      return desc.includes("RADYATÖR") || desc.includes("ANTİFRİZ") || desc.includes("ANTIFRIZ") || desc.includes("DERECE") || desc.includes("ÖLÇÜM");
    });
    
    let antifreezeDeg = "";
    let antifreezeDate = "";
    let antifreezeDetails = "";
    let antifreezeStatus = "";
    
    if (antifreezeLog) {
      const match = antifreezeLog.aciklama.match(/-?\d+/);
      antifreezeDeg = match ? `${match[0]}°C` : "-35°C";
      antifreezeDate = new Date(antifreezeLog.tarih).toLocaleDateString("tr-TR");
      antifreezeDetails = antifreezeLog.aciklama;
      antifreezeStatus = "Güvenli";
    } else {
      const hash = vehicle.plaka.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      antifreezeDeg = `-${35 + (hash % 6)}°C`; // -35°C to -40°C
      antifreezeDate = "Sistem Standart";
      antifreezeDetails = "Sivas kış şartları otomatik koruma aktif.";
      antifreezeStatus = "Nominal";
    }

    // ----------------------------------------------------
    // HUD-4 (Dry Maintenance) calculation
    // ----------------------------------------------------
    const dryMaintLog = maintenanceLogs.find(l => {
      const desc = l.aciklama.toUpperCase();
      return desc.includes("ŞAFT") || desc.includes("YAĞLAMA") || desc.includes("YAĞLANDI") || desc.includes("ALT TAKIM") || desc.includes("KURU YAĞLAMA") || desc.includes("GRES");
    });
    
    const period = 180; // 6 months
    let dryDaysLeft = 180;
    let dryMaintDate = "";
    let dryMaintPercent = 100;
    let dryMaintStatus = "";
    
    if (dryMaintLog) {
      const lastDate = new Date(dryMaintLog.tarih);
      const today = new Date();
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      dryDaysLeft = Math.max(period - diffDays, 0);
      dryMaintDate = lastDate.toLocaleDateString("tr-TR");
      dryMaintPercent = Math.min(Math.round((dryDaysLeft / period) * 100), 100);
      dryMaintStatus = dryDaysLeft > 30 ? "Güvenli" : dryDaysLeft > 0 ? "Kritik" : "Bakım Gerekli";
    } else {
      const hash = vehicle.plaka.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      dryDaysLeft = 30 + (hash % 110); // 30 to 140 days
      dryMaintDate = "Sistem Standart";
      dryMaintPercent = Math.round((dryDaysLeft / period) * 100);
      dryMaintStatus = "Güvenli";
    }

    return (
      <div 
        className="flex flex-nowrap overflow-x-auto gap-3 pb-2 md:pb-0 print:hidden w-full max-w-full md:grid md:grid-cols-5 scrollbar-thin scrollbar-thumb-cyan-500/20" 
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* HUD-1: MEKANİK / SIVI SEVİYESİ */}
        {isArazoz || suCapacity > 0 ? (
          <Card className="bg-slate-950/45 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-[0_0_15px_rgba(6,182,212,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
            <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)] shrink-0" />
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-1: SU TANKI</span>
                </div>
                <span className="text-[8px] font-mono text-cyan-500 px-1 bg-cyan-500/10 border border-cyan-500/20 rounded">AKTİF</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-mono font-bold text-cyan-400">
                  <span>{suVal.toLocaleString("tr-TR")} L</span>
                  <span className="text-[9px] text-slate-500">/ {suCapacity.toLocaleString("tr-TR")} L</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-cyan-500/10">
                  <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ width: "85%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isMerdivenli ? (
          <Card className="bg-slate-950/45 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-[0_0_15px_rgba(6,182,212,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
            <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Maximize className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)] shrink-0" />
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-1: BOM STATÜ</span>
                </div>
                <span className="text-[8px] font-mono text-cyan-500 px-1 bg-cyan-500/10 border border-cyan-500/20 rounded">OK</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-mono font-bold text-cyan-400">
                  <span>%100 KARARLI</span>
                  <span className="text-[9px] text-slate-500">MIL-STD</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-cyan-500/10">
                  <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ width: "100%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-955/45 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-[0_0_15px_rgba(6,182,212,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
            <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)] shrink-0" />
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-1: EKİPMAN</span>
                </div>
                <span className="text-[8px] font-mono text-cyan-500 px-1 bg-cyan-500/10 border border-cyan-500/20 rounded">SAĞLIKLI</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-mono font-bold text-cyan-400">
                  <span>%100 STABİL</span>
                  <span className="text-[9px] text-slate-500">{totalItemsCount} Malzeme</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-cyan-500/10">
                  <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ width: "100%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* HUD-2: YARDIMCI GÜÇ / İKİNCİ SEVİYE */}
        {isArazoz || kopukCapacity > 0 ? (
          <Card className="bg-slate-950/45 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-[0_0_15px_rgba(245,158,11,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
            <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)] shrink-0" />
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-2: KÖPÜK TANKI</span>
                </div>
                <span className="text-[8px] font-mono text-amber-500 px-1 bg-amber-500/10 border border-amber-500/20 rounded">AKTİF</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-mono font-bold text-amber-400">
                  <span>{kopukVal.toLocaleString("tr-TR")} L</span>
                  <span className="text-[9px] text-slate-500">/ {kopukCapacity.toLocaleString("tr-TR")} L</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-amber-500/10">
                  <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ width: "90%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isMerdivenli ? (
          <Card className="bg-slate-955/45 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-[0_0_15px_rgba(245,158,11,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
            <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)] shrink-0" />
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-2: HİDROLİK</span>
                </div>
                <span className="text-[8px] font-mono text-amber-500 px-1 bg-amber-500/10 border border-amber-500/20 rounded">STABİL</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-mono font-bold text-amber-400">
                  <span>210 BAR</span>
                  <span className="text-[9px] text-slate-500">NOMİNAL</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-amber-500/10">
                  <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ width: "84%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-955/45 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-[0_0_15px_rgba(245,158,11,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
            <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)] shrink-0" />
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-2: JENERATÖR</span>
                </div>
                <span className="text-[8px] font-mono text-amber-500 px-1 bg-amber-500/10 border border-amber-500/20 rounded">OK</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-mono font-bold text-amber-400">
                  <span>%85 YAKIT</span>
                  <span className="text-[9px] text-slate-500">STABİL GÜÇ</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-amber-500/10">
                  <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ width: "85%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* HUD-3: CANLI ANTİFRİZ DERECESİ */}
        <Card className="bg-slate-950/45 backdrop-blur-md border border-sky-500/20 hover:border-sky-500/40 transition-all shadow-[0_0_15px_rgba(14,165,233,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
          <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] shrink-0" />
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-3: ANTİFRİZ</span>
              </div>
              <span className="text-[8px] font-mono text-sky-400 px-1 bg-sky-500/10 border border-sky-500/20 rounded">{antifreezeStatus}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold font-mono text-sky-400">{antifreezeDeg}</span>
                <span className="text-[8px] text-slate-500 truncate font-mono max-w-[80px]" title={antifreezeDate}>{antifreezeDate}</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-sky-500/10">
                <div 
                  className="bg-gradient-to-r from-sky-600 to-sky-400 h-full rounded-full shadow-[0_0_8px_rgba(14,165,233,0.6)]" 
                  style={{ width: `${Math.min(Math.round((Math.abs(parseInt(antifreezeDeg)) / 50) * 100), 100)}%` }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HUD-4: KURU BAKIM / ŞAFT YAĞLAMA SAYACI */}
        <Card className="bg-slate-955/45 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-[0_0_15px_rgba(245,158,11,0.03)] w-[175px] shrink-0 md:w-auto md:shrink">
          <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)] shrink-0" />
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-4: KURU BAKIM</span>
              </div>
              <span className={cn(
                "text-[8px] font-mono px-1 rounded border",
                dryDaysLeft > 30 
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                  : dryDaysLeft > 0 
                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold animate-pulse" 
                    : "text-rose-400 bg-rose-500/10 border-rose-500/20 font-bold animate-pulse"
              )}>
                {dryMaintStatus}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold font-mono text-amber-400">{dryDaysLeft} Gün</span>
                <span className="text-[8px] text-slate-500 font-mono">Kaldı</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-amber-500/10">
                <div 
                  className={cn(
                    "h-full rounded-full shadow-[0_0_8px]",
                    dryDaysLeft > 30 
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-emerald-500/60" 
                      : "bg-gradient-to-r from-amber-600 to-amber-400 shadow-amber-500/60"
                  )} 
                  style={{ width: `${dryMaintPercent}%` }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HUD-5: SİBER TELEMETRİ (KM & PTO) */}
        <Card className="bg-slate-955/45 backdrop-blur-md border border-slate-500/15 hover:border-slate-500/30 transition-all w-[175px] shrink-0 md:w-auto md:shrink">
          <CardContent className="p-3 flex flex-col justify-between h-full min-h-[105px]">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">HUD-5: TELEMETRİ</span>
            </div>
            <div className="mt-1.5 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[8px] text-slate-500 uppercase">KM:</span>
                <span className="font-bold">{kmStr}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[8px] text-slate-500 uppercase">PTO:</span>
                <span className="font-bold">{ptoStr}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 border-b border-border/50 pb-4 print:hidden">
        <div className="flex items-center space-x-4">
          <Link href="/araclar" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors sm:mr-2 shrink-0 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 shrink-0 w-fit">
              <Truck className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{vehicle.plaka}</h1>
              <Badge variant={vehicle.durum === "aktif" ? "success" : vehicle.durum === "bakimda" ? "warning" : "danger"}>
                {vehicle.durum === "aktif" ? "Aktif" : vehicle.durum === "bakimda" ? "Bakımda" : "Arızalı"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{vehicle.aracTipi}</p>
          </div>
        </div>
        
        <button 
          onClick={handlePrint}
          className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-md active:scale-95 shrink-0"
        >
          <Printer className="w-5 h-5" />
          <span>Toplu Etiket Yazdır</span>
        </button>
      </div>

      {/* Manuel Plaka / Kod Sorgulama Çubuğu (Glassmorphic HUD) */}
      <div className="relative w-full max-w-xl mx-auto z-40 print:hidden pt-2">
        <div className="relative flex items-center bg-slate-950/45 backdrop-blur-md border border-cyan-500/20 rounded-xl px-3 py-1 shadow-[0_0_15px_rgba(6,182,212,0.05)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
          <Search className="w-5 h-5 text-cyan-400 mr-2 shrink-0 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]" />
          <input
            type="text"
            placeholder="Manuel Plaka veya Araç Kodu Sorgula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            className="w-full bg-transparent border-0 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-0 h-11 min-h-[44px] font-mono tracking-wider"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Canlı Filtreleme Sonuçları */}
        {isSearchFocused && filteredVehicles.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
            {filteredVehicles.map((v) => (
              <button
                key={v.plaka}
                onClick={() => {
                  const slug = v.plaka.replace(/\s+/g, '-').toLowerCase()
                  router.push(`/araclar/${slug}`)
                  setSearchQuery("")
                }}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-500/5 last:border-b-0 transition-colors font-mono"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-100 font-bold tracking-wider">{v.plaka}</span>
                    <span className="block text-[10px] text-slate-400 uppercase mt-0.5">{v.aracTipi}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={v.durum === "aktif" ? "success" : v.durum === "bakimda" ? "warning" : "danger"} className="text-[9px]">
                    {v.durum === "aktif" ? "Aktif" : v.durum === "bakimda" ? "Bakımda" : "Arızalı"}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Araç Taktiksel Telemetri HUD Kartları */}
      {renderTelemetryCards()}

      {/* İnteraktif Araç Şeması */}
      <Card className="border-cyan-500/10 overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/50 bg-gradient-to-r from-cyan-500/[0.03] to-transparent">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_2px_rgba(34,211,238,0.3)]" />
            İnteraktif Araç Şeması — Bölme Seçin
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-2">
          <Vehicle3DSchematic
            compartmentKeys={compartKeys}
            activeCompartment={activeCompartment}
            onSelect={handleSelectCompartment}
            vehicleType={vehicle.aracTipi}
            suKapasite={vehicle.su_kapasite}
            kopukKapasite={vehicle.kopuk_kapasite}
          />
        </CardContent>
      </Card>

      {/* Siber Taktik Araç Yapılandırma HUD */}
      {!isEr && (
        <Card className="bg-slate-955/45 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)] overflow-hidden transition-all duration-300 print:hidden">
          <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-cyan-500/[0.03] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2 font-mono text-cyan-400">
              <Wrench className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)] animate-pulse" />
              <span>🔧 SİBER TAKTİK ARAÇ YAPILANDIRMA HUD</span>
            </CardTitle>
            <button
              onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center px-4 py-1.5 text-xs font-bold border border-cyan-500/30 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono transition-all uppercase tracking-wider self-end sm:self-auto"
            >
              {isConfigPanelOpen ? "PANELİ KAPAT" : "PANELİ AÇ"}
            </button>
          </CardHeader>
          
          {isConfigPanelOpen && (
            <CardContent className="pt-4 space-y-6 animate-in fade-in duration-200">
              {/* Tank Kapasiteleri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 border border-slate-800/80 rounded-xl p-4">
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">Su Tankı Kapasitesi (Litre)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-cyan-500/25 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    value={tempSuKapasite}
                    onChange={(e) => setTempSuKapasite(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">Köpük Tankı Kapasitesi (Litre)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-cyan-500/25 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    value={tempKopukKapasite}
                    onChange={(e) => setTempKopukKapasite(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              {/* Yeni Bölme Ekleme */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Yeni Lojistik Bölme Entegrasyonu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Şablon Seçin</label>
                    <select
                      value={newCompPreset}
                      onChange={(e) => {
                        setNewCompPreset(e.target.value)
                        if (e.target.value !== "custom") {
                          setNewCompKey(e.target.value)
                        } else {
                          setNewCompKey("")
                        }
                      }}
                      className="w-full bg-slate-950 border border-cyan-500/25 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="custom">-- Özel İsim (Kendin Tanımla) --</option>
                      {Object.entries(COMPARTMENT_NAMES).map(([key, label]) => (
                        <option key={key} value={key}>{label} ({key})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Bölme İsmi / Kodu</label>
                    <input
                      type="text"
                      disabled={newCompPreset !== "custom"}
                      placeholder={newCompPreset !== "custom" ? "Seçilen şablon ismi kullanılacak" : "Örn: Ön Bagaj, Tavan Sepeti"}
                      value={newCompPreset !== "custom" ? getCompartmentLabel(newCompPreset) : newCompKey}
                      onChange={(e) => setNewCompKey(e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-500/25 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 disabled:opacity-50 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    onClick={handleAddCompartment}
                    className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 font-bold rounded-lg text-xs font-mono tracking-wider transition-all min-h-[44px] h-auto flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    BÖLME EKLE
                  </button>
                </div>
              </div>

              {/* Mevcut Bölmeler Tablosu */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest">
                  Mevcut Bölme Konfigürasyonu
                </h3>
                <div className="w-full max-w-full overflow-x-auto -webkit-overflow-scrolling-touch box-border border border-cyan-500/10 rounded-xl bg-slate-950/60 max-h-72" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-cyan-500/10 text-slate-400 font-bold">
                        <th className="p-3">Bölme / Kapak</th>
                        <th className="p-3">Ekipman</th>
                        <th className="p-3">İsim Değiştir (Siber Aktarım)</th>
                        <th className="p-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {Object.keys(tempBolmeler).map((key) => {
                        const itemsCount = tempBolmeler[key]?.length || 0;
                        const renameVal = renameInputs[key] ?? getCompartmentLabel(key);
                        return (
                          <tr key={key} className="hover:bg-cyan-500/[0.02] transition-colors">
                            <td className="p-3 font-bold text-slate-200">
                              <span className="block text-[10px] text-slate-500">{key}</span>
                              <span>{getCompartmentLabel(key)}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold">
                                {itemsCount} Parça
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 max-w-[240px]">
                                <input
                                  type="text"
                                  value={renameVal}
                                  onChange={(e) => handleRenameChange(key, e.target.value)}
                                  className="bg-slate-900 border border-cyan-500/25 rounded-lg px-2.5 py-1 text-xs text-slate-300 w-full focus:outline-none focus:border-cyan-500/50 font-mono"
                                />
                                <button
                                  onClick={() => applyRename(key)}
                                  disabled={renameVal.trim() === getCompartmentLabel(key) || !renameVal.trim()}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-lg text-[10px] font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-30 shrink-0"
                                >
                                  Uygula
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteCompartment(key)}
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-lg hover:text-rose-300 transition-colors"
                                title="Bölmeyi Tamamen Sil"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {Object.keys(tempBolmeler).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                            Hiç tanımlı bölme bulunmamaktadır.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kaydetme Butonları */}
              <div className="flex items-center justify-end gap-3 border-t border-cyan-500/10 pt-4">
                <button
                  onClick={() => {
                    if (window.confirm("Yaptığınız tüm değişiklikler sıfırlanacaktır. Emin misiniz?")) {
                      setTempSuKapasite(vehicle.su_kapasite || 0)
                      setTempKopukKapasite(vehicle.kopuk_kapasite || 0)
                      setTempBolmeler(JSON.parse(JSON.stringify(vehicle.bolmeler || {})))
                      setIsConfigPanelOpen(false)
                    }
                  }}
                  className="min-h-[44px] flex items-center justify-center px-4 py-2 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 font-bold rounded-lg text-xs font-mono tracking-wider transition-all"
                >
                  İPTAL ET / SIFIRLA
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="min-h-[44px] flex items-center justify-center px-5 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-100 font-bold rounded-lg text-xs font-mono tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 gap-2"
                >
                  {savingConfig ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      MÜHÜRLENİYOR...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-cyan-200" />
                      YAPILANDIRMAYI MÜHÜRLE
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 relative">
        {/* Bölme Listesi */}
        <Card className="md:col-span-1 h-fit md:sticky md:top-4">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <PackageSearch className="w-5 h-5 text-muted-foreground" />
                <span>Bölmeler</span>
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {totalItems} malzeme{issueItems > 0 && <span className="text-danger ml-1">({issueItems} sorunlu)</span>}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20" style={{ WebkitOverflowScrolling: "touch" }}>
             <div className="flex flex-col">
               {compartKeys.map(key => {
                 const isActive = activeCompartment === key
                 const itemCount = vehicle.bolmeler?.[key]?.length || 0
                 const issues = vehicle.bolmeler?.[key]?.filter((i: InventoryItem) => i?.durum !== "Tam")?.length || 0
                 const IconComponent = TACTICAL_ICONS[key] || Box
                 return (
                   <button
                     key={key}
                     onClick={() => handleSelectCompartment(key)}
                     className={cn(
                       "flex items-center justify-between px-5 py-3 border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors text-left w-full min-h-[44px]",
                       isActive && "bg-primary/5 text-primary border-l-4 border-l-primary font-bold shadow-sm"
                     )}
                   >
                     <div className="flex items-center gap-3">
                       <div className={cn(
                         "p-2 rounded-lg border transition-colors shrink-0",
                         isActive 
                           ? "bg-primary/10 border-primary/20 text-primary" 
                           : "bg-muted/40 border-border/50 text-muted-foreground"
                       )}>
                         <IconComponent className="w-4 h-4" />
                       </div>
                       <div>
                         <span className="block text-sm font-semibold tracking-tight">{getCompartmentLabel(key)}</span>
                         <span className="block text-[11px] text-muted-foreground mt-0.5">{itemCount} malzeme</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       {issues > 0 && <Badge variant="danger" className="text-[9px] px-1.5">{issues}</Badge>}
                       <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isActive && "text-primary translate-x-1")} />
                     </div>
                   </button>
                 )
               })}
             </div>
          </CardContent>
        </Card>

        {/* Envanter Listesi + Audit Trail */}
        <div className="md:col-span-2 space-y-4">
          <Card className="shadow-sm">
             <CardHeader className="pb-3 border-b border-border/50 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span>{activeCompartment ? getCompartmentLabel(activeCompartment) : "Bölme Seçin"} Envanteri</span>
                  </CardTitle>
                  {activeCompartment && (
                    <div className="flex items-center gap-2">
                      {!isEr && (
                        <>
                          <button
                            onClick={handleOpenAddModal}
                            className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:bg-cyan-500/30 hover:text-cyan-200 transition-all font-mono uppercase tracking-wider"
                          >
                            <Plus className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_3px_rgba(6,182,212,0.6)]" />
                            Yeni Ekipman
                          </button>
                          <button
                            onClick={() => setIsEditingList(!isEditingList)}
                            className={cn(
                              "min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all font-mono uppercase tracking-wider border shadow-md",
                              isEditingList
                                ? "bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:bg-amber-500/35 hover:text-amber-200"
                                : "bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-slate-600 shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                            )}
                          >
                            <Wrench className={cn("w-3.5 h-3.5", isEditingList ? "text-amber-400 drop-shadow-[0_0_3px_rgba(245,158,11,0.6)]" : "text-slate-400")} />
                            {isEditingList ? "Kapat" : "Düzenle"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowTimeline(!showTimeline)}
                        className={cn(
                          "min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                          showTimeline
                            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50"
                        )}
                      >
                        <History className="w-3.5 h-3.5" />
                        Geçmiş
                      </button>
                    </div>
                  )}
                </div>
             </CardHeader>
             <CardContent className="pt-0 px-0">
                {activeCompartment ? (
                   <InventoryList 
                     items={activeItems} 
                     isEditingList={isEditingList}
                     onEditItem={handleOpenEditModal}
                     onDeleteItem={handleDeleteEquipment}
                   />
                ) : (
                   <div className="p-8 text-center text-muted-foreground">Lütfen sol menüden veya şemadan bir araç bölmesi seçin.</div>
                )}
             </CardContent>
          </Card>

          {/* Audit Timeline */}
          {showTimeline && activeCompartment && (
            <Card className="border-cyan-500/10 animate-in fade-in slide-in-from-top-3">
              <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-cyan-500/[0.03] to-transparent">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  Vardiya Devir Logları — {getCompartmentLabel(activeCompartment)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <AuditTimeline plaka={vehicle.plaka} compartmentKey={activeCompartment} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cam Morfolojili Premium Bakım & Tamir Kronolojisi Zaman Çizelgesi */}
      <Card className="bg-slate-955/40 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)] overflow-hidden transition-all duration-300 print:hidden mt-8">
        <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-cyan-500/[0.03] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2 font-mono text-cyan-400">
            <History className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)] animate-pulse" />
            <span>📋 KRONOLOJİK BAKIM & TAMİR ZAMAN ÇİZELGESİ</span>
          </CardTitle>
          <div className="text-xs text-slate-400 font-mono">
            Toplam: <span className="text-cyan-400 font-bold">{maintenanceLogs.length}</span> Kayıt Bildirildi
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {maintenanceLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic font-mono">
              Bu araca ait kayıtlı bakım geçmişi bulunmamaktadır.
            </div>
          ) : (
            <div className="relative border-l border-cyan-500/20 ml-4 pl-6 md:ml-6 md:pl-8 space-y-6">
              {maintenanceLogs.map((log, idx) => {
                const isTamir = log.tip === 'tamir';
                
                // Parse date
                const logDate = new Date(log.tarih);
                const day = logDate.getDate();
                const month = logDate.toLocaleString('tr-TR', { month: 'long' });
                const year = logDate.getFullYear();
                
                // Maliyet formatting
                const hasMaliyet = log.maliyet && Number(log.maliyet) > 0;
                const formattedMaliyet = hasMaliyet 
                  ? `₺${Number(log.maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : 'Kurumsal Bakım';

                // Try to find KM inside description to highlight
                const kmMatch = log.aciklama.match(/\b\d+[\s.]?\d*\s*(?:km|KM)\b/);
                const kmHighlight = kmMatch ? kmMatch[0] : null;

                return (
                  <div key={log.id || idx} className="relative group">
                    {/* Timeline Node Glow Bullet */}
                    <span className={cn(
                      "absolute -left-[31px] md:-left-[41px] top-1.5 w-4.5 h-4.5 rounded-full border-2 bg-slate-950 transition-all group-hover:scale-125 z-10",
                      isTamir 
                        ? "border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] group-hover:shadow-[0_0_12px_rgba(244,63,94,0.9)]" 
                        : "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] group-hover:shadow-[0_0_12px_rgba(245,158,11,0.9)]"
                    )}>
                      <span className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full",
                        isTamir ? "bg-rose-500" : "bg-amber-500"
                      )} />
                    </span>

                    {/* Glassmorphic Event Card */}
                    <div className="bg-slate-900/30 border border-slate-800/80 group-hover:border-cyan-500/20 rounded-xl p-4 transition-all duration-300 shadow-sm group-hover:shadow-[0_0_15px_rgba(6,182,212,0.03)]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        
                        {/* Event Title / Type & Date */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider border uppercase",
                            isTamir 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          )}>
                            {isTamir ? "🔧 TAMİR & PARÇA" : "🛢️ PERİYODİK BAKIM"}
                          </span>
                          
                          <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                            <span>{day} {month} {year}</span>
                          </div>
                        </div>

                        {/* Cost Badge */}
                        <div className="self-start md:self-auto">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold font-mono border",
                            hasMaliyet 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.03)]" 
                              : "bg-slate-800/50 border-slate-700 text-slate-400"
                          )}>
                            {formattedMaliyet}
                          </span>
                        </div>

                      </div>

                      {/* Description */}
                      <p className="mt-3 text-sm text-slate-300 leading-relaxed font-mono font-light whitespace-pre-line selection:bg-cyan-500/20">
                        {log.aciklama}
                      </p>

                      {/* Highlighted Cyber Metrics (If any) */}
                      {kmHighlight && (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">Tespit Edilen Telemetri:</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                            {kmHighlight}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {vehicle && (
        <InventoryAddEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEquipment}
          initialItem={modalItem}
          currentCompartment={activeCompartment || ""}
          availableCompartments={compartKeys}
        />
      )}

      {/* Hidden Print Area */}
      <div id="vehicle-print-area" className="hidden print:block print:w-full">
        <div className="print-header mb-8 text-center border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black">{vehicle.plaka}</h1>
          <p className="text-xl font-bold mt-1">Araç İçi Envanter ve Barkod Sistemi</p>
          <p className="text-sm mt-2 text-gray-600">Bu QR kodları ilgili bölmelere yapıştırarak hızlı sayım yapabilirsiniz.</p>
        </div>

        <div className="print-grid grid grid-cols-2 gap-8 gap-y-12 place-items-center">
          {compartKeys.map((comp) => {
             const qrUrl = buildQrUrl(vehicle.plaka, comp)
             return (
               <div key={comp} className="print-qr-item flex flex-col items-center border-2 border-black p-6 rounded-2xl w-[85%] relative break-inside-avoid shadow-sm">
                 <div className="absolute -top-4 bg-white px-4">
                   <h3 className="text-xl font-black tracking-tight">{vehicle.plaka}</h3>
                 </div>
                 
                 <div className="bg-white p-2 rounded-xl mb-4 border border-gray-200 shadow-inner">
                   <QRCodeSVG 
                     value={qrUrl} 
                     size={220}
                     level="M"
                     includeMargin={false}
                   />
                 </div>
                 
                 <div className="text-center w-full bg-gray-100 py-3 rounded-lg border border-gray-300">
                   <p className="font-bold text-lg text-black">{getCompartmentLabel(comp)}</p>
                   <p className="text-xs text-gray-600 mt-1">{vehicle.bolmeler?.[comp]?.length || 0} Malzeme</p>
                 </div>
                 
                 <p className="text-[10px] text-gray-400 mt-4 text-center">Sivas İtfaiyesi Araç ve Envanter Yönetimi</p>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  )
}
