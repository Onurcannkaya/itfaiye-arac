"use client"
import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Printer, Settings, Combine, Save, Trash2, Plus, ArrowRight } from "lucide-react"
import { COMPARTMENT_NAMES, APP_BASE_URL } from "@/lib/constants"

function buildQrUrl(plaka: string, compartment: string): string {
  const slug = plaka.replace(/\s+/g, "-").toLowerCase()
  return `${APP_BASE_URL}/arac/${slug}/${compartment}`
}

type FlatItem = {
  internalId: string;
  bolme: string;
  id: string; // The one from bolmeler (usually numeric or uuid but here it comes from JSON)
  malzeme: string;
  adet: number;
  durum: string;
}

export default function EnvanterYonetimiPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedPlaka, setSelectedPlaka] = useState("")
  
  // Flattened inventory state
  const [inventory, setInventory] = useState<FlatItem[]>([])
  
  // UI states
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [printFilter, setPrintFilter] = useState("all")

  // Fetch initial data
  useEffect(() => {
    async function fetchVehicles() {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('*')
      if (data) {
        setVehicles(data)
        if (data.length > 0) {
          selectVehicle(data[0].plaka, data)
        }
      }
    }
    fetchVehicles()
  }, [])

  const selectVehicle = (plaka: string, vData = vehicles) => {
    setSelectedPlaka(plaka)
    const currentVehicle = vData.find(v => v.plaka === plaka)
    
    if (currentVehicle && currentVehicle.bolmeler) {
      // Flatten the structure
      const flatList: FlatItem[] = []
      Object.entries(currentVehicle.bolmeler).forEach(([bolmeKey, items]: [string, any]) => {
        items.forEach((item: any) => {
          flatList.push({
            internalId: Math.random().toString(36).substring(7),
            bolme: bolmeKey,
            ...item
          })
        })
      })
      setInventory(flatList)
    } else {
      setInventory([])
    }
  }

  const handleFieldChange = (internalId: string, field: keyof FlatItem, value: any) => {
    setInventory(prev => prev.map(item => 
      item.internalId === internalId ? { ...item, [field]: value } : item
    ))
  }

  const handleAddNewItem = () => {
    setInventory(prev => [
      ...prev,
      {
        internalId: Math.random().toString(36).substring(7),
        id: Math.floor(Math.random() * 100000).toString(),
        bolme: Object.keys(COMPARTMENT_NAMES)[0],
        malzeme: "",
        adet: 1,
        durum: "Tam"
      }
    ])
  }

  const handleDeleteItem = (internalId: string) => {
    setInventory(prev => prev.filter(item => item.internalId !== internalId))
  }

  const saveInventoryToDB = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    
    // Group back to Supabase JSON schema
    const newBolmeler: Record<string, any[]> = {}
    
    inventory.forEach(item => {
      if (!item.malzeme || item.malzeme.trim() === "") return; // Skip empty items
      
      if (!newBolmeler[item.bolme]) newBolmeler[item.bolme] = []
      
      newBolmeler[item.bolme].push({
        id: item.id,
        malzeme: item.malzeme,
        adet: Number(item.adet),
        durum: item.durum
      })
    })

    const supabase = createClient()
    const { error } = await supabase.from('vehicles')
      .update({ bolmeler: newBolmeler })
      .eq('plaka', selectedPlaka)

    setIsSaving(false)
    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      alert("Hata oluştu: " + error.message)
    }
  }

  const handlePrint = () => {
    // Get the print area div
    const printArea = document.getElementById('print-area-qr')
    if (!printArea) return

    // Clone the print area and append directly to body as a top-level child
    const clone = printArea.cloneNode(true) as HTMLElement
    clone.className = 'print-area-container'
    clone.id = 'print-area-live'
    document.body.appendChild(clone)

    // Wait for QR SVGs to fully render, then print
    setTimeout(() => {
      window.print()
      // Remove after print dialog closes
      setTimeout(() => {
        const live = document.getElementById('print-area-live')
        if (live) document.body.removeChild(live)
      }, 500)
    }, 400)
  }

  // Find unique compartments present in the inventory to generate QR codes
  const distinctCompartments = Array.from(new Set(inventory.map(i => i.bolme)))
  // If a vehicle has NO inventory, it has NO compartments, so print would be empty. 
  // Should ideally print all COMPARTMENT_NAMES? No, only the ones with inventory.
  // Actually, let's include all standard compartment types for that vehicle types, or just the ones with items.
  const printCompartments = distinctCompartments.length > 0 ? distinctCompartments : Object.keys(COMPARTMENT_NAMES)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border/50 pb-4 print:hidden gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">QR & Envanter Yönetimi</h1>
          <p className="text-muted-foreground mt-1 text-sm">Araç malzemelerini canlı düzenleyin, sistem QR etiketlerini toplu şekilde yazdırın.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={printFilter} 
            onChange={e => setPrintFilter(e.target.value)} 
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
          >
            <option value="all">Tüm Bölmeler</option>
            {distinctCompartments.map(c => (
               <option key={c} value={c}>{COMPARTMENT_NAMES[c] || c}</option>
            ))}
          </select>
          <Button onClick={handlePrint} variant="default" className="w-full sm:w-auto h-11 shrink-0 font-bold bg-primary hover:bg-primary/90">
            <Printer className="w-4 h-4 mr-2" />
            Etiketleri Yazdır
          </Button>
        </div>
      </div>

      <div className="print:hidden space-y-6">
        {/* Seçici Kart */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Hedef Araç Plakası</label>
              <select 
                value={selectedPlaka} 
                onChange={e => selectVehicle(e.target.value)} 
                className="w-full h-11 rounded-md border border-border bg-surface px-3 font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {vehicles.map(v => <option key={v.plaka} value={v.plaka}>{v.plaka}</option>)}
              </select>
            </div>
            
            <div className="hidden md:flex flex-col items-center justify-center pt-6 px-4">
               <ArrowRight className="text-muted-foreground/30" />
            </div>

            <div className="flex-1 w-full bg-muted/30 p-3 rounded-lg border border-border border-dashed">
              <p className="text-sm font-semibold mb-1">Durum Bilgisi</p>
              <p className="text-xs text-muted-foreground flex items-center justify-between">
                Sistemde Kayıtlı Toplam Malzeme:
                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{inventory.length} Adet</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* DataGrid Yöneticisi */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Tablo Yöneticisi (Anlık Düzenleme)
            </CardTitle>
            <Button onClick={handleAddNewItem} size="sm" variant="secondary" className="font-bold border border-border">
               <Plus className="w-4 h-4 mr-1"/>
               Yeni Satır
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
             <table className="w-full text-sm">
                <thead className="bg-surface text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Bölme (Kapak)</th>
                    <th className="px-5 py-4 text-left font-semibold">Malzeme Adı</th>
                    <th className="px-5 py-4 text-left font-semibold w-24">Adet</th>
                    <th className="px-5 py-4 text-left font-semibold w-32">Durum</th>
                    <th className="px-5 py-4 text-center font-semibold w-20">Sil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        Bu araca ait malzeme kaydı bulunamadı. "Yeni Satır" diyerek eklemeye başlayın.
                      </td>
                    </tr>
                  ) : inventory.map((item, index) => (
                    <tr key={item.internalId} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3 align-top">
                        <select
                          value={item.bolme}
                          onChange={(e) => handleFieldChange(item.internalId, "bolme", e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        >
                          {Object.entries(COMPARTMENT_NAMES).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <Input 
                          placeholder="Malzeme adı..."
                          value={item.malzeme}
                          onChange={(e) => handleFieldChange(item.internalId, "malzeme", e.target.value)}
                          className="bg-background"
                        />
                      </td>
                      <td className="px-5 py-3 align-top">
                        <Input 
                          type="number"
                          min="1"
                          value={item.adet}
                          onChange={(e) => handleFieldChange(item.internalId, "adet", e.target.value)}
                          className="bg-background"
                        />
                      </td>
                      <td className="px-5 py-3 align-top">
                        <select
                          value={item.durum}
                          onChange={(e) => handleFieldChange(item.internalId, "durum", e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        >
                           <option value="Tam">Tam</option>
                           <option value="Eksik">Eksik</option>
                           <option value="Arızalı">Arızalı</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-center align-top">
                        <button 
                          onClick={() => handleDeleteItem(item.internalId)}
                          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger rounded-lg transition-colors mx-auto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </CardContent>
          <div className="p-4 border-t border-border/50 bg-surface/95 backdrop-blur-sm flex justify-end items-center gap-3 rounded-b-lg md:relative sticky bottom-0 z-40"
               style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}>
             {saveSuccess && <span className="text-sm font-bold text-success animate-in fade-in mr-2 flex items-center gap-1"> Başarıyla kaydedildi!</span>}
             <Button onClick={saveInventoryToDB} disabled={isSaving} className="font-bold">
               {isSaving ? "Kaydediliyor..." : <><Save className="w-4 h-4 mr-2"/> Supabase'e Kaydet</>}
             </Button>
          </div>
        </Card>
      </div>

      {/* --- Hidden QR Source (never displayed, cloned to body on print) --- */}
      <div id="print-area-qr" style={{ display: 'none' }}>
         <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'black' }}>ETİKET DİZİNİ</h1>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '4px solid black', paddingBottom: '1rem', marginBottom: '2rem', color: 'black' }}>Araç: {selectedPlaka}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {(printFilter === "all" ? printCompartments : [printFilter]).map(comp => (
                <div key={comp} style={{ border: '6px solid black', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '1.5rem', textAlign: 'center', breakInside: 'avoid' as any, pageBreakInside: 'avoid' }}>
                   <h2 style={{ fontSize: '1.5rem', fontWeight: 900, background: 'black', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '9999px', marginBottom: '2rem', whiteSpace: 'nowrap' }}>
                      {selectedPlaka}
                   </h2>
                   
                   <div style={{ background: 'white', padding: '0.5rem' }}>
                     <QRCodeSVG value={buildQrUrl(selectedPlaka, comp)} size={220} level={"H"} />
                   </div>
                   
                   <div style={{ marginTop: '2rem', borderTop: '4px solid black', width: '100%', paddingTop: '1rem' }}>
                     <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'black' }}>{COMPARTMENT_NAMES[comp] || comp}</h3>
                     <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontFamily: 'monospace', marginTop: '0.75rem', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.8)', fontWeight: 700 }}>Sivas İtfaiyesi</p>
                   </div>
                </div>
              ))}
            </div>
         </div>
      </div>

    </div>
  )
}
