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

  /* ── Shared inline styles for 7cm × 4cm label ── */
  const labelStyle: React.CSSProperties = {
    width: '7cm',
    height: '4cm',
    border: '1.5px solid #000',
    borderRadius: '4px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'sans-serif',
    background: '#fff',
    color: '#000',
    pageBreakInside: 'avoid',
  }

  const headerBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#000',
    color: '#fff',
    padding: '1.5mm 3mm',
    fontSize: '8px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    lineHeight: 1.2,
    flexShrink: 0,
  }

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    padding: '2mm 3mm',
    gap: '3mm',
    alignItems: 'center',
    minHeight: 0,
  }

  const qrBoxStyle: React.CSSProperties = {
    flexShrink: 0,
    width: '2.4cm',
    height: '2.4cm',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ccc',
    borderRadius: '3px',
    padding: '1mm',
    background: '#fff',
  }

  const infoStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '1mm',
    overflow: 'hidden',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-primary" />
            QR Etiket Önizleme
          </DialogTitle>
          <p className="text-xs text-[var(--fd-text3)] mt-1">
            Baskı boyutu: 7cm × 4cm
          </p>
        </DialogHeader>

        {/* Label Preview — scaled for screen, exact cm for print */}
        <div className="px-6 pb-4 flex justify-center">
          <div ref={printRef}>
            <div className="qr-label-card" style={labelStyle}>
              {/* Üst Bar — Plaka + Kurum */}
              <div style={headerBarStyle}>
                <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{plaka}</span>
                <span style={{ fontSize: '7px', fontWeight: 600, opacity: 0.9 }}>Sivas İtfaiye</span>
              </div>

              {/* İçerik — QR Sol, Bilgiler Sağ */}
              <div style={contentStyle}>
                {/* QR Kod */}
                <div style={qrBoxStyle}>
                  <QRCode
                    value={qrValue}
                    size={80}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>

                {/* Sağ — Araç Bilgisi */}
                <div style={infoStyle}>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 900,
                    lineHeight: 1.2,
                    color: '#000',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                  }}>
                    {plaka}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#444',
                    lineHeight: 1.3,
                  }}>
                    {aracTipi}{marka ? ` — ${marka}` : ""}
                  </p>
                  {compartmentLabel && (
                    <p style={{
                      margin: 0,
                      fontSize: '8px',
                      fontWeight: 700,
                      color: '#000',
                      background: '#f0f0f0',
                      padding: '0.5mm 2mm',
                      borderRadius: '2px',
                      display: 'inline-block',
                      alignSelf: 'flex-start',
                    }}>
                      {compartmentLabel}
                    </p>
                  )}
                  <div style={{
                    borderTop: '1px solid #ddd',
                    paddingTop: '1mm',
                    marginTop: '0.5mm',
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '6px',
                      color: '#888',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      Sivas İtfaiyesi Araç Kontrol Sistemi
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
