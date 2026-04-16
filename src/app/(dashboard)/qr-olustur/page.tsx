"use client"
import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Printer, Settings, Combine } from "lucide-react"

export default function QRGeneratorPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedPlaka, setSelectedPlaka] = useState("")
  const [selectedCompartment, setSelectedCompartment] = useState("")
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    async function fetchVehicles() {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('plaka, bolmeler')
      if (data) {
        setVehicles(data)
        if (data.length > 0) {
          setSelectedPlaka(data[0].plaka)
          const firstCompartKeys = Object.keys(data[0].bolmeler)
          if (firstCompartKeys.length > 0) {
            setSelectedCompartment(firstCompartKeys[0])
          }
        }
      }
    }
    fetchVehicles()
  }, [])

  const currentVehicle = vehicles.find(v => v.plaka === selectedPlaka)
  const compartments = currentVehicle ? Object.keys(currentVehicle.bolmeler) : []

  const handleVehicleChange = (plaka: string) => {
    setSelectedPlaka(plaka)
    const v = vehicles.find(vec => vec.plaka === plaka)
    if (v) {
      const keys = Object.keys(v.bolmeler)
      setSelectedCompartment(keys.length > 0 ? keys[0] : "")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const qrData = JSON.stringify({ p: selectedPlaka, c: selectedCompartment })

  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4 print:hidden">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">QR Üretici & Etiket Basımı</h1>
        <p className="text-muted-foreground mt-1 text-sm">Sahadaki itfaiye araçları için taranabilir etiketler oluşturun ve yazdırın.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {/* Kontrol Paneli */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Etiket Ayarları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Araç Seçimi</label>
              <select 
                value={selectedPlaka} 
                onChange={e => handleVehicleChange(e.target.value)} 
                className="w-full h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {vehicles.map(v => <option key={v.plaka} value={v.plaka}>{v.plaka}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Bölme / Lokasyon</label>
              <select 
                value={selectedCompartment} 
                onChange={e => setSelectedCompartment(e.target.value)} 
                className="w-full h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {compartments.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <Button onClick={handlePrint} className="w-full font-bold h-12 mt-4" variant="default">
              <Printer className="w-5 h-5 mr-2" />
              Baskı Önizleme ve Yazdır
            </Button>
          </CardContent>
        </Card>

        {/* Canlı Önizleme */}
        <Card className="bg-muted/30 border-dashed border-2">
           <CardContent className="flex items-center justify-center min-h-[300px] p-6">
              {currentVehicle && selectedCompartment ? (
                <div className="bg-white text-black p-4 inline-block text-center rounded shadow-sm border border-gray-200">
                  <div className="font-bold text-lg mb-1">{selectedPlaka}</div>
                  <div className="text-xs font-semibold mb-3 border-b-2 border-black pb-1 uppercase tracking-wide">
                     {selectedCompartment.replace(/_/g, ' ')}
                  </div>
                  <div className="flex justify-center bg-white p-2 border-4 border-black/10 rounded-xl">
                    <QRCodeSVG value={qrData} size={150} level={"H"} />
                  </div>
                  <div className="text-[9px] mt-3 font-mono text-gray-500">Sivas İtfaiyesİ Envanter Sİstemİ</div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm flex items-center gap-2">
                  <Combine className="w-5 h-5 animate-spin-slow" /> Yükleniyor veya eksik seçim...
                </div>
              )}
           </CardContent>
        </Card>
      </div>

      {/* Sadece Yazdırma Esnasında Görünen A4 Düzeni (Print Media) */}
      <div className="hidden print:flex flex-col items-center justify-center bg-white text-black h-screen w-full -m-8 p-8">
          <div className="border border-black p-8 text-center max-w-sm rounded">
            <h1 className="text-4xl font-black mb-2">{selectedPlaka}</h1>
            <h2 className="text-xl font-bold uppercase tracking-widest border-b-4 pb-2 border-black mb-6">
               {selectedCompartment.replace(/_/g, ' ')}
            </h2>
            <div className="flex justify-center items-center p-4 border-8 border-gray-900 rounded-2xl mb-4 bg-white">
               <QRCodeSVG value={qrData} size={300} level={"H"} />
            </div>
            <div className="text-sm font-bold mt-6 tracking-widest">SİVAS BELEDİYESİ İTFAİYE MÜDÜRLÜĞÜ</div>
          </div>
      </div>
      
      {/* Yazdırma stili eklemeleri */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:flex, .print\\:flex * { visibility: visible; }
          .print\\:flex { position: absolute; left: 0; top: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}} />

    </div>
  )
}
