"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { DailyVehicleCheckModal } from "@/components/inventory/DailyVehicleCheckModal"
import { InventoryCheckModal } from "@/components/inventory/InventoryCheckModal"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import {
  Truck, ScanLine, CheckCircle2, ClipboardCheck, ChevronDown, Loader2, ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type PageMode = "loading" | "not-found" | "choose" | "inventory" | "daily" | "success"

export default function VehicleDeepLinkPage() {
  const params = useParams()
  const plakaSlug = params.plaka as string

  const [vehicle, setVehicle] = useState<any>(null)
  const [mode, setMode] = useState<PageMode>("loading")
  const [compartmentKey, setCompartmentKey] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    async function fetchVehicle() {
      const { data: vehicles } = await api.from("vehicles").select("*")
      const found = (vehicles || []).find(
        (v: any) => v.plaka.replace(/\s+/g, "-").toLowerCase() === plakaSlug.toLowerCase()
      )
      if (found) {
        setVehicle(found)
        setMode("choose")
      } else {
        setMode("not-found")
      }
    }
    fetchVehicle()
  }, [plakaSlug])

  const vehicleCompartments = vehicle?.bolmeler
    ? Object.keys(vehicle.bolmeler).filter((k: string) => Array.isArray(vehicle.bolmeler[k]) && vehicle.bolmeler[k].length > 0)
    : []

  const handleCompartmentSelect = (key: string) => {
    setCompartmentKey(key)
    setMode("inventory")
  }

  const handleInventorySaved = () => {
    setSuccessMsg(`${vehicle?.plaka} — ${COMPARTMENT_NAMES[compartmentKey] || compartmentKey} sayımı kaydedildi!`)
    setMode("success")
  }

  const handleDailySaved = () => {
    setSuccessMsg(`${vehicle?.plaka} günlük kontrol raporu kaydedildi!`)
    setMode("success")
  }

  // ─── Loading ─────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Araç bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  // ─── Not Found ───────────────────────────────────────────
  if (mode === "not-found") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <Truck className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <h2 className="text-xl font-bold">Araç Bulunamadı</h2>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-2 py-0.5 rounded">{plakaSlug}</code> plakasına sahip araç sistemde kayıtlı değil.
            </p>
            <Link href="/araclar" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline">
              <ArrowLeft className="w-4 h-4" /> Araç Listesine Dön
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Success ─────────────────────────────────────────────
  if (mode === "success") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center border-success/30">
          <CardContent className="p-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
            <h2 className="text-xl font-bold text-success">İşlem Başarılı!</h2>
            <p className="text-sm text-muted-foreground">{successMsg}</p>
            <div className="flex gap-2 justify-center">
              <Link href="/araclar" className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                <Truck className="w-4 h-4" /> Araçlar
              </Link>
              <button
                onClick={() => setMode("choose")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <ScanLine className="w-4 h-4" /> Tekrar Kontrol
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Choose Mode ─────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] pt-8 space-y-6 max-w-md mx-auto">
      {/* Vehicle Header */}
      <div className="text-center space-y-2">
        <Badge variant="success" className="text-xs mb-2">QR ile Açıldı</Badge>
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Truck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black tracking-wider">{vehicle.plaka}</h1>
        <p className="text-muted-foreground text-sm">
          {vehicle.arac_tipi || vehicle.aracTipi}
          {vehicle.marka ? ` — ${vehicle.marka}` : ""}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
          Ne yapmak istiyorsunuz?
        </p>

        {/* Option 1: Compartment/Inventory */}
        <button
          onClick={() => {
            if (vehicleCompartments.length === 1) {
              handleCompartmentSelect(vehicleCompartments[0])
            } else if (vehicleCompartments.length > 0) {
              const el = document.getElementById("compartment-list-deep")
              if (el) el.classList.toggle("hidden")
            }
          }}
          disabled={vehicleCompartments.length === 0}
          className={cn(
            "w-full p-4 border-2 rounded-2xl flex items-center gap-4 transition-all group text-left",
            vehicleCompartments.length > 0
              ? "bg-cyan-500/5 hover:bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40"
              : "bg-muted/30 border-border/30 opacity-50 cursor-not-allowed"
          )}
        >
          <div className="w-12 h-12 bg-cyan-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <ClipboardCheck className="w-6 h-6 text-cyan-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">📋 Bölme / Envanter Sayımı</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vehicleCompartments.length > 0
                ? `${vehicleCompartments.length} bölme mevcut`
                : "Bu araçta tanımlı bölme yok"}
            </p>
          </div>
          {vehicleCompartments.length > 1 && (
            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Compartment sub-list */}
        {vehicleCompartments.length > 1 && (
          <div id="compartment-list-deep" className="hidden space-y-1.5 pl-4 animate-in slide-in-from-top-2">
            {vehicleCompartments.map((key: string) => (
              <button
                key={key}
                onClick={() => handleCompartmentSelect(key)}
                className="w-full p-3 bg-muted/40 hover:bg-muted border border-border/50 rounded-xl text-left text-sm font-medium transition-colors flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                {COMPARTMENT_NAMES[key] || key}
              </button>
            ))}
          </div>
        )}

        {/* Option 2: Daily Check */}
        <button
          onClick={() => setMode("daily")}
          className="w-full p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border-2 border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl flex items-center gap-4 transition-all group text-left"
        >
          <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Truck className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">🚒 Günlük Araç Kontrolü</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yakıt, su, köpük, pompa ve genel durum kontrolü
            </p>
          </div>
        </button>
      </div>

      {/* Modals */}
      {mode === "inventory" && vehicle && compartmentKey && (
        <InventoryCheckModal
          isOpen={true}
          vehiclePlaka={vehicle.plaka}
          compartmentKey={compartmentKey}
          onClose={() => setMode("choose")}
          onSave={handleInventorySaved}
        />
      )}

      {mode === "daily" && vehicle && (
        <DailyVehicleCheckModal
          isOpen={true}
          vehiclePlaka={vehicle.plaka}
          vehicleType={vehicle.arac_tipi || vehicle.aracTipi || "Araç"}
          onClose={() => setMode("choose")}
          onSaved={handleDailySaved}
        />
      )}
    </div>
  )
}
