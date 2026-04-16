"use client"

import { useParams } from "next/navigation"
import { mockVehicles } from "@/lib/data"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Truck, PackageSearch, ChevronRight, ArrowLeft, Gauge, Clock, ShieldCheck, CalendarDays } from "lucide-react"
import { InventoryList } from "@/components/vehicle/InventoryList"
import { VehicleSchematic } from "@/components/vehicle/VehicleSchematic"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function VehicleDetailPage() {
  const params = useParams()
  const idStr = params.id as string
  
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeCompartment, setActiveCompartment] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVehicle() {
      const supabase = createClient()
      const { data: vehicles } = await supabase.from('vehicles').select('*')
      const found = (vehicles || []).find(v => v.plaka.replace(/\s+/g, '-').toLowerCase() === idStr)
      setVehicle(found)
      if (found && Object.keys(found.bolmeler).length > 0) {
        setActiveCompartment(Object.keys(found.bolmeler)[0])
      }
      setLoading(false)
    }
    fetchVehicle()
  }, [idStr])
  
  if (loading) return <div className="p-6">Yükleniyor...</div>
  if (!vehicle) return <div className="p-6">Araç bulunamadı.</div>

  const compartKeys = Object.keys(vehicle?.bolmeler || {})
  const activeItems: any[] = activeCompartment ? (vehicle.bolmeler[activeCompartment] || []) : []

  // Count total items and issues
  const totalItems = Object.values(vehicle.bolmeler || {}).flat().length
  const issueItems = Object.values(vehicle.bolmeler || {}).flat().filter((i: any) => i.durum !== "Tam").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 border-b border-border/50 pb-4">
        <Link href="/araclar" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors sm:mr-2">
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

      {/* Araç Bilgi Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Gauge className="w-4 h-4 text-primary shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Kilometre</p><p className="text-sm font-bold">{(vehicle.km || 0).toLocaleString("tr-TR")} km</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-warning shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Motor (PTO)</p><p className="text-sm font-bold">{(vehicle.motorSaatiPTO || 0).toLocaleString("tr-TR")} sa</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Sigorta</p><p className="text-sm font-bold">{vehicle.sigortaBitis ? new Date(vehicle.sigortaBitis).toLocaleDateString("tr-TR") : "—"}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <CalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Muayene</p><p className="text-sm font-bold">{vehicle.muayeneBitis ? new Date(vehicle.muayeneBitis).toLocaleDateString("tr-TR") : "—"}</p></div>
        </CardContent></Card>
      </div>

      {/* İnteraktif Araç Şeması */}
      <Card>
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="text-base">Araç Şeması — Bölme Seçin</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-2">
          <VehicleSchematic
            compartmentKeys={compartKeys}
            activeCompartment={activeCompartment}
            onSelect={setActiveCompartment}
            vehicleType={vehicle.aracTipi}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* Bölme Listesi */}
        <Card className="lg:col-span-1 h-fit sticky top-4">
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
          <CardContent className="p-0">
             <div className="flex flex-col">
               {compartKeys.map(key => {
                 const isActive = activeCompartment === key
                 const itemCount = vehicle.bolmeler[key].length
                 const issues = vehicle.bolmeler[key].filter((i: any) => i.durum !== "Tam").length
                 return (
                   <button
                     key={key}
                     onClick={() => setActiveCompartment(key)}
                     className={cn(
                       "flex items-center justify-between px-5 py-3.5 border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors text-left",
                       isActive && "bg-primary/5 text-primary border-l-4 border-l-primary font-bold shadow-sm"
                     )}
                   >
                     <div>
                       <span className="block text-sm">{COMPARTMENT_NAMES[key] || key}</span>
                       <span className="block text-[11px] text-muted-foreground mt-0.5">{itemCount} malzeme</span>
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

        {/* Envanter Listesi */}
        <Card className="lg:col-span-2 shadow-sm">
           <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
             <CardTitle className="text-base flex items-center space-x-2">
               <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
               <span>{activeCompartment ? COMPARTMENT_NAMES[activeCompartment] || activeCompartment : "Bölme Seçin"} Envanteri</span>
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0 px-0">
              {activeCompartment ? (
                <InventoryList items={activeItems} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">Lütfen sol menüden veya şemadan bir araç bölmesi seçin.</div>
              )}
           </CardContent>
        </Card>
      </div>
    </div>
  )
}

