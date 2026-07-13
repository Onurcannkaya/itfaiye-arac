"use client"
import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ScanLine, Camera, AlertTriangle, Search, Loader2, Keyboard, ArrowLeft, CheckCircle2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/authStore"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { Scanner } from "@yudiel/react-qr-scanner"

type ScanMode = "scanning" | "error"

interface VehicleInfo {
  plaka: string
  arac_tipi: string
  bolmeler: Record<string, unknown[]>
}

class ScannerErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("[Scanner Boundary] Gracefully handled error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export default function TarayiciPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [mode, setMode] = useState<ScanMode>("scanning")
  const [errorMsg, setErrorMsg] = useState("")
  const [manualPlaka, setManualPlaka] = useState("")
  const [manualLoading, setManualLoading] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  // Only managers can use manual plate entry
  // Er and Şoför (role=User) must scan QR codes
  const canManualEntry = user && (
    user.rol === 'Admin' || 
    user.rol === 'Editor' || 
    user.rol === 'Shift_Leader'
  )

  // Custom alert modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [alertModalData, setAlertModalData] = useState<{
    title: string
    vehicle: string
    compartment: string
    materialName?: string
  } | null>(null)

  // Intercept and suppress Next.js DevOverlay popup for missing cameras
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        const errorStr = args.map(a => {
          if (a instanceof Error) return a.message + " " + a.stack;
          return String(a);
        }).join(" ");
        
        if (
          errorStr.includes("Requested device not found") || 
          errorStr.includes("NotFoundError") || 
          errorStr.includes("Devices not found") ||
          errorStr.includes("Permission denied")
        ) {
          console.warn("[Camera Interceptor] Camera error handled gracefully:", ...args);
          return;
        }
        originalError.apply(console, args);
      };
      return () => {
        console.error = originalError;
      };
    }
  }, []);

  // ─── QR Parse Logic ────────────────────────────────────────
  const parseQRContent = (raw: string): { plaka: string; compartment?: string } | null => {
    const trimmed = raw.trim()

    // 1. URL format: /arac/{plaka-slug}/{compartment?}
    const urlPattern = /\/arac\/([^/?#]+)(?:\/([^/?#]+))?/
    const urlMatch = trimmed.match(urlPattern)
    if (urlMatch) {
      return {
        plaka: urlMatch[1].replace(/-/g, " ").toUpperCase(),
        compartment: urlMatch[2] || undefined,
      }
    }

    // 2. Dash-separated compartment format: "58ACT367-kabin_ici" or "58 ACT 367-sol_on_kapak"
    const dashMatch = trimmed.match(/^(.+?)-(\w+_\w+.*)$/)
    if (dashMatch && COMPARTMENT_NAMES[dashMatch[2]]) {
      return {
        plaka: dashMatch[1].replace(/-/g, " ").replace(/\s+/g, " ").toUpperCase().trim(),
        compartment: dashMatch[2],
      }
    }

    // 3. Legacy JSON: {"p": "58 ACT 367", "c": "kabin_ici"}
    try {
      const json = JSON.parse(trimmed)
      if (json.p) {
        return { plaka: json.p.toUpperCase(), compartment: json.c || undefined }
      }
    } catch { /* not JSON */ }

    // 4. Plain plaka text (anything that looks like a Turkish plate)
    const plakaPattern = /^(\d{2})\s*([A-ZÇĞİÖŞÜ]+)\s*(\d+)$/i
    const plakaMatch = trimmed.toUpperCase().replace(/-/g, " ").replace(/\s+/g, " ").trim().match(plakaPattern)
    if (plakaMatch) {
      return { plaka: `${plakaMatch[1]} ${plakaMatch[2]} ${plakaMatch[3]}` }
    }

    // 5. Fallback: treat entire string as plaka
    if (trimmed.length >= 5 && trimmed.length <= 15) {
      return { plaka: trimmed.toUpperCase() }
    }

    return null
  }

  // ─── Vehicle Lookup & Redirect ─────────────────────────────
  const lookupVehicle = useCallback(async (plaka: string, compartment?: string) => {
    const { data: rawData, error } = await api.from("vehicles")
      .select("plaka,arac_tipi,bolmeler")
      .eq("plaka", plaka)
      .single()

    if (error || !rawData) {
      setErrorMsg(`"${plaka}" plakası sistemde bulunamadı.`)
      setMode("error")
      return
    }

    const data = rawData as VehicleInfo
    const plakaSlug = plaka.replace(/\s+/g, "-").toLowerCase()

    // Redirect to the target deep link immediately
    if (compartment && data.bolmeler?.[compartment]) {
      router.push(`/arac/${plakaSlug}/${compartment}`)
    } else {
      router.push(`/arac/${plakaSlug}`)
    }
  }, [router])

  // ─── QR Scan Handler ───────────────────────────────────────
  interface ScanResult {
    rawValue?: string
  }

  const handleScan = useCallback(async (results: ScanResult[]) => {
    if (!results?.length || mode !== "scanning") return

    const rawValue = results[0]?.rawValue
    if (!rawValue) return

    // Vibrate on successful scan
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100)
    }

    const trimmed = rawValue.trim()
    
    // Extract UUID if present (either raw UUID or inside a URL like /zimmet/UUID)
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = trimmed.match(uuidRegex);
    
    if (uuidMatch) {
      const scannedUuid = uuidMatch[0].toLowerCase();
      setManualLoading(true)
      
      try {
        // 1. Search in temporary_assignments table
        const { data: assignment } = await api
          .from("temporary_assignments")
          .select("id,uuid,durum,malzeme_id,birim_adi")
          .eq("uuid", scannedUuid)
          .single();

        if (assignment) {
          // If assignment is active or overdue, redirect to assignment details page
          if (assignment.durum === "AKTIF" || assignment.durum === "GECIKTI") {
            router.push(`/zimmet/${scannedUuid}`);
            return;
          }
          
          // If returned (IADE_EDILDI), locate in vehicle_inventory
          if (assignment.durum === "IADE_EDILDI") {
            const { data: vehInvList } = await api
              .from("vehicle_inventory")
              .select("plaka,bolme_kapak,inventory_id")
              .eq("inventory_id", assignment.malzeme_id);
              
            if (vehInvList && vehInvList.length > 0) {
              const firstMatch = vehInvList[0];
              const label = firstMatch.bolme_kapak || "Araç İçi";
              
              setAlertModalData({
                title: "Malzeme Bulundu",
                vehicle: firstMatch.plaka,
                compartment: label,
                materialName: "İade edilmiş envanter."
              })
              setAlertModalOpen(true)
              return;
            }
          }
        }

        // 2. Fallback: Search all vehicles' bolmeler JSON for the scanned UUID
        const { data: allVehicles } = await api.from("vehicles").select("plaka,bolmeler")
        if (allVehicles) {
          let foundVehiclePlaka = null
          let foundCompartment = null
          let foundMaterialName = null

          for (const v of allVehicles as any[]) {
            if (!v.bolmeler) continue
            let compartments: any = {}
            if (typeof v.bolmeler === 'string') {
              try { compartments = JSON.parse(v.bolmeler); } catch { continue; }
            } else {
              compartments = v.bolmeler
            }

            for (const [compName, items] of Object.entries(compartments)) {
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && typeof item === 'object') {
                    const isMatch = Object.values(item).some(val => 
                      typeof val === 'string' && val.toLowerCase() === scannedUuid
                    )
                    if (isMatch) {
                      foundVehiclePlaka = v.plaka
                      foundCompartment = compName
                      foundMaterialName = item.malzeme || "Malzeme"
                      break
                    }
                  }
                }
              }
              if (foundVehiclePlaka) break
            }
            if (foundVehiclePlaka) break
          }

          if (foundVehiclePlaka && foundCompartment) {
            setAlertModalData({
              title: "Malzeme Bulundu",
              vehicle: foundVehiclePlaka,
              compartment: foundCompartment,
              materialName: foundMaterialName || "Envanter Malzemesi"
            })
            setAlertModalOpen(true)
            return;
          }
        }

        setErrorMsg(`"${scannedUuid}" kimlikli malzeme veya zimmet kaydı bulunamadı.`)
        setMode("error")
      } catch (err) {
        console.error("Lookup error:", err)
        setErrorMsg("Tarama verileri sorgulanırken bir veritabanı hatası oluştu.")
        setMode("error")
      } finally {
        setManualLoading(false)
      }
      return
    }

    const parsed = parseQRContent(rawValue)
    if (!parsed) {
      setErrorMsg("Geçersiz QR kodu. Lütfen araç veya malzeme etiketini okutun.")
      setMode("error")
      return
    }

    lookupVehicle(parsed.plaka, parsed.compartment)
  }, [mode, lookupVehicle, router])

  // ─── Manual Plaka Search ───────────────────────────────────
  const handleManualSearch = async () => {
    if (!manualPlaka.trim()) return
    setManualLoading(true)
    await lookupVehicle(manualPlaka.toUpperCase().trim())
    setManualLoading(false)
  }

  // ─── Reset to Scanner ──────────────────────────────────────
  const resetToScanner = () => {
    setMode("scanning")
    setErrorMsg("")
    setManualPlaka("")
  }

  // ─── Alert Modal Confirm ───────────────────────────────────
  const handleAlertConfirm = () => {
    if (!alertModalData) return
    const { vehicle, compartment } = alertModalData
    setAlertModalOpen(false)
    
    const plakaSlug = vehicle.replace(/\s+/g, "-").toLowerCase()
    const compKey = Object.entries(COMPARTMENT_NAMES).find(
      ([_, v]) => v.toLowerCase() === compartment.toLowerCase()
    )?.[0] || compartment.replace(/\s+/g, "_").toLowerCase()

    router.push(`/arac/${plakaSlug}/${compKey}`)
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--fd-text)] flex items-center justify-center gap-2">
          <ScanLine className="w-6 h-6 text-[var(--fd-accent)] animate-pulse" />
          Akıllı QR & Barkod Okuyucu
        </h1>
        <p className="text-xs text-[var(--fd-text2)] max-w-sm mx-auto">
          Araç veya bölme QR kodunu taratarak envanter ve durum takip ekranına doğrudan geçiş yapın.
        </p>
      </div>

      {/* ═══ SCANNER VIEW ═══ */}
      {mode === "scanning" && (
        <div className="space-y-6">
          <Card className="w-full aspect-square bg-[var(--fd-surface)] border-2 border-[var(--fd-border)] relative overflow-hidden group shadow-[var(--fd-shadow)] rounded-[var(--fd-r-lg)]">
            <CardContent className="p-0 w-full h-full flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none z-10" />

              {cameraError ? (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 h-full w-full bg-[var(--fd-surface2)]/40">
                  <Camera className="w-10 h-10 text-[var(--fd-accent)]/80 animate-pulse" />
                  <div className="px-4 py-3 bg-[var(--fd-accent)]/10 border-2 border-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-accent)] font-mono text-xs font-semibold tracking-wider max-w-xs leading-relaxed animate-pulse">
                    ⚡ KAMERA AKIŞI OPTİMİZE EDİLİYOR...
                    <div className="text-[10px] text-[var(--fd-text2)] mt-1 font-sans font-medium">
                      Lütfen Malzeme Kodunu Odaklayın veya Manuel Giriş Yapın
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <ScannerErrorBoundary
                    fallback={
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 h-full w-full bg-[var(--fd-surface2)]/40">
                        <Camera className="w-10 h-10 text-[var(--fd-accent)]/80 animate-pulse" />
                        <div className="px-4 py-3 bg-[var(--fd-accent)]/10 border-2 border-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-accent)] font-mono text-xs font-semibold tracking-wider max-w-xs leading-relaxed animate-pulse">
                          ⚡ KAMERA AKIŞI OPTİMİZE EDİLİYOR...
                          <div className="text-[10px] text-[var(--fd-text2)] mt-1 font-sans font-medium">
                            Lütfen Malzeme Kodunu Odaklayın veya Manuel Giriş Yapın
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <Scanner
                      onScan={handleScan}
                      onError={() => setCameraError(true)}
                      components={{ finder: false }}
                    />
                  </ScannerErrorBoundary>

                  {/* Scan Frame Overlay */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-3/4 border border-[var(--fd-accent)]/30 rounded-[var(--fd-r)] relative shadow-[0_0_15px_rgba(var(--fd-accent-soft2),0.15)]">
                      <div className="absolute -top-[1.5px] -left-[1.5px] w-6 h-6 border-t-[3px] border-l-[3px] border-[var(--fd-accent)] rounded-tl-lg" />
                      <div className="absolute -top-[1.5px] -right-[1.5px] w-6 h-6 border-t-[3px] border-r-[3px] border-[var(--fd-accent)] rounded-tr-lg" />
                      <div className="absolute -bottom-[1.5px] -left-[1.5px] w-6 h-6 border-b-[3px] border-l-[3px] border-[var(--fd-accent)] rounded-bl-lg" />
                      <div className="absolute -bottom-[1.5px] -right-[1.5px] w-6 h-6 border-b-[3px] border-r-[3px] border-[var(--fd-accent)] rounded-br-lg" />
                      <div className="absolute left-0 right-0 h-[2px] bg-[var(--fd-accent)] shadow-[0_0_10px_var(--fd-accent)] animate-[scan_2.5s_ease-in-out_infinite]" />
                    </div>
                  </div>
                  <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-bold text-[var(--fd-accent)]/90 animate-pulse z-20">
                    QR Kodu Çerçevenin İçine Alın
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Input - Only for managers */}
          {canManualEntry ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-[var(--fd-border)]" />
                <span className="text-[10px] text-[var(--fd-text3)] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Keyboard className="w-3 h-3 text-[var(--fd-text3)]" /> veya Manuel Giriş
                </span>
                <div className="h-px flex-1 bg-[var(--fd-border)]" />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Plaka girin (Örn: 58 ACT 367)"
                  value={manualPlaka}
                  onChange={e => setManualPlaka(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                  className="font-mono tracking-wider bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)] focus:border-[var(--fd-accent)] rounded-[var(--fd-r-sm)] h-10"
                />
                <Button 
                  onClick={handleManualSearch} 
                  disabled={manualLoading || !manualPlaka.trim()}
                  className="shrink-0 rounded-[var(--fd-r-sm)] font-bold bg-[var(--fd-accent)] hover:opacity-90 text-white h-10 w-12"
                >
                  {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 p-3 rounded-[var(--fd-r-sm)] border border-dashed border-[var(--fd-border)] bg-[var(--fd-surface2)]/30 text-center">
              <p className="text-[11px] text-[var(--fd-text3)] font-semibold">Manuel plaka girişi yalnızca yöneticiler için aktiftir.</p>
              <p className="text-[10px] text-[var(--fd-text3)] mt-1">Lütfen QR kod tarayarak devam edin.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ ERROR MODE ═══ */}
      {mode === "error" && (
        <div className="animate-in zoom-in-95 fade-in duration-300">
          <Card className="border-2 border-[var(--fd-danger)]/20 bg-[var(--fd-surface)] shadow-[var(--fd-shadow-lg)] rounded-[var(--fd-r-lg)]">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-[var(--fd-danger)]/10 rounded-full flex items-center justify-center mx-auto border border-[var(--fd-danger)]/25">
                <AlertTriangle className="w-8 h-8 text-[var(--fd-danger)]" />
              </div>
              <p className="font-black text-lg text-[var(--fd-text)]">Arama Bulunamadı</p>
              <p className="text-sm text-[var(--fd-text2)] leading-relaxed">{errorMsg}</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={resetToScanner} className="flex-1 rounded-[var(--fd-r-sm)] border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text)] hover:bg-[var(--fd-surface3)] font-bold h-10">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Tekrar Tara
                </Button>
              </div>

              {/* Manual entry fallback - only for managers */}
              {canManualEntry ? (
                <div className="pt-4 border-t border-[var(--fd-border)]">
                  <p className="text-xs font-bold text-[var(--fd-text3)] mb-2 uppercase tracking-wider">Hızlı Plaka Arama:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="58 ACT 367"
                      value={manualPlaka}
                      onChange={e => setManualPlaka(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                      className="font-mono bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)] focus:border-[var(--fd-accent)] rounded-[var(--fd-r-sm)] h-10"
                    />
                    <Button 
                      onClick={handleManualSearch} 
                      disabled={manualLoading || !manualPlaka.trim()}
                      className="bg-[var(--fd-accent)] hover:opacity-90 text-white font-bold rounded-[var(--fd-r-sm)] h-10 w-12"
                    >
                      {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-[var(--fd-border)]">
                  <p className="text-[11px] text-[var(--fd-text3)] font-semibold text-center">Manuel plaka girişi yalnızca yöneticiler için aktiftir.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ CUSTOM SUCCESS MODAL ═══ */}
      {alertModalOpen && alertModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] shadow-[var(--fd-shadow-lg)] overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[var(--fd-success)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--fd-success)]" />
                {alertModalData.title}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[var(--fd-text3)] hover:text-[var(--fd-text)] p-1 h-7 w-7" 
                onClick={() => setAlertModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 text-center space-y-4">
              {alertModalData.materialName && (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--fd-text3)] font-semibold uppercase tracking-wider">Malzeme Tanımı</p>
                  <p className="text-base font-extrabold text-[var(--fd-text)]">
                    {alertModalData.materialName}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 bg-[var(--fd-surface2)]/50 p-3 rounded-lg border border-[var(--fd-border)] text-left">
                <div>
                  <p className="text-[10px] text-[var(--fd-text3)] font-semibold uppercase tracking-wider">🚒 Plaka</p>
                  <p className="text-sm font-extrabold text-[var(--fd-text)] font-[var(--fd-fontmono)]">{alertModalData.vehicle}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--fd-text3)] font-semibold uppercase tracking-wider">📍 Bölme</p>
                  <p className="text-sm font-extrabold text-[var(--fd-text)] truncate" title={alertModalData.compartment}>{alertModalData.compartment}</p>
                </div>
              </div>
            </CardContent>
            <div className="bg-[var(--fd-surface2)]/40 border-t border-[var(--fd-border)] p-4 flex gap-2">
              <Button 
                onClick={handleAlertConfirm}
                className="flex-1 bg-[var(--fd-accent)] hover:opacity-90 text-white font-bold h-10 rounded-[var(--fd-r-sm)] shadow-[var(--fd-shadow-sm)]"
              >
                Envanter Sayfasına Git
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
