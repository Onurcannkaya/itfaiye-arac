"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { InventoryCheckModal } from "@/components/inventory/InventoryCheckModal"
import { AuditTimeline } from "@/components/inventory/AuditTimeline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { ArrowLeft, Truck, ScanLine, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function DeepLinkCompartmentPage() {
  const params = useParams()
  const router = useRouter()
  const plakaSlug = params.plaka as string
  const bolmeKey = params.bolme as string

  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Parse plaka from slug: "58-act-367" -> try matching against DB
  useEffect(() => {
    async function fetchVehicle() {
      const supabase = createClient()
      const { data: vehicles } = await supabase.from("vehicles").select("*")
      const found = (vehicles || []).find(
        (v: any) => v.plaka.replace(/\s+/g, "-").toLowerCase() === plakaSlug.toLowerCase()
      )
      setVehicle(found || null)
      setLoading(false)

      // Auto-open inventory modal after a brief delay
      if (found) {
        setTimeout(() => setModalOpen(true), 400)
      }
    }
    fetchVehicle()
  }, [plakaSlug])

  const handleSave = (results: any[]) => {
    console.log("Deep link inventory save:", results)
    setModalOpen(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 4000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Araç bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!vehicle) {
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

  const compartmentName = COMPARTMENT_NAMES[bolmeKey] || bolmeKey

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/50 pb-4">
        <Link href={`/araclar/${plakaSlug}`} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{vehicle.plaka}</h1>
            <Badge variant="success" className="text-[10px]">QR Tarandı</Badge>
          </div>
          <p className="text-muted-foreground text-sm truncate">{vehicle.aracTipi} — {compartmentName}</p>
        </div>
        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shrink-0">
          <ScanLine className="w-6 h-6 text-cyan-400" />
        </div>
      </div>

      {/* Success message */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-xl text-success animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Sayım başarıyla kaydedildi!</p>
            <p className="text-xs mt-0.5 opacity-80">{vehicle.plaka} — {compartmentName}</p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <Card className="border-cyan-500/15 bg-cyan-500/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-cyan-400" />
            QR Derin Bağlantı
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Bu sayfa <strong className="text-foreground">{vehicle.plaka}</strong> aracının <strong className="text-foreground">{compartmentName}</strong> bölmesine doğrudan bağlantı ile açıldı.
          </p>
          {!modalOpen && !saveSuccess && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Sayımı Başlat
            </button>
          )}
        </CardContent>
      </Card>

      {/* Audit Timeline */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base">Kontrol Geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <AuditTimeline plaka={vehicle.plaka} compartmentKey={bolmeKey} />
        </CardContent>
      </Card>

      {/* Inventory Check Modal */}
      <InventoryCheckModal
        isOpen={modalOpen}
        vehiclePlaka={vehicle.plaka}
        compartmentKey={bolmeKey}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
