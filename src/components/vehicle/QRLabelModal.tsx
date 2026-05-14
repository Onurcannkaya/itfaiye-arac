"use client"
import { useRef } from "react"
import QRCode from "react-qr-code"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Printer, QrCode } from "lucide-react"
import { APP_BASE_URL, COMPARTMENT_NAMES } from "@/lib/constants"

interface QRLabelModalProps {
  isOpen: boolean
  onClose: () => void
  plaka: string
  aracTipi: string
  marka?: string
  /** Optional: if provided, generates a compartment-specific label */
  compartmentKey?: string
}

export function QRLabelModal({ isOpen, onClose, plaka, aracTipi, marka, compartmentKey }: QRLabelModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  // Build QR content — Always a full URL so phone camera can open it directly
  const plakaSlug = plaka.replace(/\s+/g, "-").toLowerCase()
  const qrValue = compartmentKey
    ? `${APP_BASE_URL}/arac/${plakaSlug}/${compartmentKey}`
    : `${APP_BASE_URL}/arac/${plakaSlug}`

  const compartmentLabel = compartmentKey ? COMPARTMENT_NAMES[compartmentKey] || compartmentKey : null

  const handlePrint = () => {
    // Inject the print content into a temporary container at body root
    const printContainer = document.createElement("div")
    printContainer.className = "print-area-container"
    printContainer.innerHTML = printRef.current?.innerHTML || ""
    document.body.appendChild(printContainer)

    window.print()

    // Clean up after print
    setTimeout(() => {
      document.body.removeChild(printContainer)
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-primary" />
            QR Etiket Önizleme
          </DialogTitle>
        </DialogHeader>

        {/* Label Preview (also used for printing) */}
        <div className="px-6 pb-4">
          <div
            ref={printRef}
            className="bg-white text-black rounded-xl border-2 border-dashed border-border p-6 flex flex-col items-center justify-center space-y-4"
            style={{ fontFamily: "'Inter', Arial, sans-serif" }}
          >
            {/* Header */}
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Sivas Belediyesi
              </p>
              <p className="text-sm font-black uppercase tracking-wider text-red-600 mt-0.5">
                🚒 İTFAİYE MÜDÜRLÜĞÜ
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gray-200" />

            {/* QR Code */}
            <div className="p-3 bg-white rounded-lg">
              <QRCode
                value={qrValue}
                size={180}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            {/* Vehicle Info */}
            <div className="text-center space-y-1">
              <p className="text-2xl font-black tracking-widest text-black">
                {plaka}
              </p>
              <p className="text-sm font-semibold text-gray-600">
                {aracTipi}{marka ? ` — ${marka}` : ""}
              </p>
              {compartmentLabel && (
                <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full inline-block mt-1">
                  📦 {compartmentLabel}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="w-full h-px bg-gray-200" />
            <p className="text-[8px] text-gray-400 text-center">
              Bu QR kodu tarayarak envanter kontrolü veya günlük araç kontrolü başlatabilirsiniz.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Kapat</Button>
          <Button onClick={handlePrint} className="gap-2 min-w-[140px]">
            <Printer className="w-4 h-4" />
            Yazdır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
