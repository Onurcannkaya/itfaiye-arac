"use client"
import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Printer, Settings, Combine, Save, Trash2, Plus, ArrowRight } from "lucide-react"
import { COMPARTMENT_NAMES } from "@/lib/constants"

type FlatItem = {
  internalId: string;
  bolme: string;
  id: string; // The one from bolmeler (usually numeric or uuid but here it comes from JSON)
  isim: string;
  miktar: number;
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
        isim: "",
        miktar: 1,
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
      if (!item.isim || item.isim.trim() === "") return; // Skip empty items
      
      if (!newBolmeler[item.bolme]) newBolmeler[item.bolme] = []
      
      newBolmeler[item.bolme].push({
        id: item.id,
        isim: item.isim,
        miktar: Number(item.miktar),
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
    window.print()
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
        
        <Button onClick={handlePrint} variant="default" className="w-full sm:w-auto h-11 shrink-0 font-bold bg-primary hover:bg-primary/90">
          <Printer className="w-4 h-4 mr-2" />
          Toplu QR Bölme Etiketleri Yazdır
        </Button>
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
                          value={item.isim}
                          onChange={(e) => handleFieldChange(item.internalId, "isim", e.target.value)}
                          className="bg-background"
                        />
                      </td>
                      <td className="px-5 py-3 align-top">
                        <Input 
                          type="number"
                          min="1"
                          value={item.miktar}
                          onChange={(e) => handleFieldChange(item.internalId, "miktar", e.target.value)}
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
          <div className="p-4 border-t border-border/50 bg-surface flex justify-end items-center gap-3 rounded-b-lg">
             {saveSuccess && <span className="text-sm font-bold text-success animate-in fade-in mr-2 flex items-center gap-1"> Başarıyla kaydedildi!</span>}
             <Button onClick={saveInventoryToDB} disabled={isSaving} className="font-bold">
               {isSaving ? "Kaydediliyor..." : <><Save className="w-4 h-4 mr-2"/> Supabase'e Kaydet</>}
             </Button>
          </div>
        </Card>
      </div>

      {/* --- A4 Print Düzeni (Toplu Izgara - Grid) --- */}
      <div className="hidden print:block w-full text-black bg-white -m-8">
         <div className="flex flex-col w-full px-8 pt-8">
            <h1 className="text-3xl font-black mb-1">ETİKET DİZİNİ</h1>
            <p className="text-xl font-bold border-b-4 border-black pb-4 mb-8">Araç: {selectedPlaka}</p>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
              {printCompartments.map(comp => (
                <div key={comp} className="border-4 border-black p-6 flex flex-col items-center justify-center rounded-2xl page-break-inside-avoid shadow-sm text-center">
                   <h2 className="text-2xl font-black bg-black text-white px-4 py-1.5 rounded-full mb-6 whitespace-nowrap">
                      {selectedPlaka}
                   </h2>
                   
                   <div className="bg-white p-2">
                     <QRCodeSVG value={JSON.stringify({p: selectedPlaka, c: comp})} size={180} level={"H"} />
                   </div>
                   
                   <div className="mt-5 border-t-2 border-black w-full pt-3">
                     <h3 className="text-xl font-bold uppercase tracking-widest">{COMPARTMENT_NAMES[comp] || comp}</h3>
                     <p className="text-[10px] uppercase font-mono mt-2 tracking-widest text-black/60 font-bold">Sivas İtfaiyesİ</p>
                   </div>
                </div>
              ))}
            </div>
         </div>
      </div>
      
      {/* Sadece Yazdırma Esnasında Görünen A4 CSS Rules */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          @page { size: auto; margin: 0mm; }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      `}} />

    </div>
  )
}
