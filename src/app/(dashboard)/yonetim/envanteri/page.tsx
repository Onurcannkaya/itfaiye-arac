"use client"

import { useState, useEffect, useMemo } from "react"
import PageGuard from "@/components/PageGuard"
import { api } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { 
  Combine, 
  Search, 
  Truck, 
  FileText, 
  FileSpreadsheet, 
  SlidersHorizontal,
  Layers,
  MapPin,
  ClipboardList
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export default function EnvanteriPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [vehicleInventory, setVehicleInventory] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlaka, setSelectedPlaka] = useState("")

  // Fetch all inventory, vehicle inventory, and vehicles
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: inv } = await api.from('inventory').select('*')
        const { data: vehInv } = await api.from('vehicle_inventory').select('*')
        const { data: vehs } = await api.from('vehicles').select('*')
        
        if (inv) setInventory(inv)
        if (vehInv) setVehicleInventory(vehInv)
        if (vehs) {
          // Sort vehicles by plate
          const sortedVehs = [...vehs].sort((a, b) => a.plaka.localeCompare(b.plaka, 'tr'))
          setVehicles(sortedVehs)
        }
      } catch (err) {
        console.error("Envanter yükleme hatası:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Create a mapping of inventory_id -> array of { plaka, adet }
  const distributionMap = useMemo(() => {
    const map: Record<number, { plaka: string; adet: number }[]> = {}
    vehicleInventory.forEach(item => {
      const invId = item.inventory_id
      if (!map[invId]) {
        map[invId] = []
      }
      map[invId].push({ plaka: item.plaka, adet: item.adet })
    })
    // Sort distribution lists by plate
    Object.keys(map).forEach(key => {
      map[Number(key)].sort((a, b) => a.plaka.localeCompare(b.plaka, 'tr'))
    })
    return map
  }, [vehicleInventory])

  // Filter inventory by search query (case-insensitive Turkish comparison)
  const filteredInventoryBySearch = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().replace(/i/g, 'i').replace(/I/g, 'ı')
    return inventory.filter(item => {
      const name = item.malzeme_adi.toLowerCase().replace(/i/g, 'i').replace(/I/g, 'ı')
      return name.includes(q)
    })
  }, [inventory, searchQuery])

  // Filtered items when a specific vehicle is selected
  const vehicleZimmetList = useMemo(() => {
    if (!selectedPlaka) return []
    // Get all items in vehicle_inventory for this plaka
    const items = vehicleInventory.filter(vi => vi.plaka === selectedPlaka && vi.adet > 0)
    
    // Join with inventory names
    return items.map((item, idx) => {
      const invDetails = inventory.find(inv => inv.id === item.inventory_id)
      return {
        sira: idx + 1,
        malzeme_adi: invDetails ? invDetails.malzeme_adi : `Bilinmeyen Malzeme (ID: ${item.inventory_id})`,
        adet: item.adet
      }
    }).sort((a, b) => a.malzeme_adi.localeCompare(b.malzeme_adi, 'tr'))
  }, [selectedPlaka, vehicleInventory, inventory])

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF()
    const timestamp = new Date().toLocaleDateString('tr-TR')
    
    doc.setFont("Helvetica", "bold")
    doc.setFontSize(16)
    doc.text("SİVAS BELEDİYESİ İTFAİYE MÜDÜRLÜĞÜ", 14, 20)
    
    doc.setFontSize(12)
    doc.setFont("Helvetica", "normal")
    
    if (selectedPlaka) {
      doc.text(`Taktik Araç Zimmet ve Envanter Raporu`, 14, 28)
      doc.text(`Araç Plakası: ${selectedPlaka}`, 14, 34)
      doc.text(`Rapor Tarihi: ${timestamp}`, 14, 40)
      
      const body = vehicleZimmetList.map(item => [
        item.sira.toString(),
        item.malzeme_adi,
        item.adet.toString()
      ])

      autoTable(doc, {
        head: [["Sıra No", "Malzeme Cinsi", "Zimmetli Adet"]],
        body: body,
        startY: 46,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { font: "Helvetica" }
      })
      doc.save(`Envanter_Raporu_${selectedPlaka.replace(/\s+/g, '_')}.pdf`)
    } else if (searchQuery.trim()) {
      doc.text(`Malzeme Dağılım ve Arama Sonuçları Raporu`, 14, 28)
      doc.text(`Arama Kriteri: "${searchQuery}"`, 14, 34)
      doc.text(`Rapor Tarihi: ${timestamp}`, 14, 40)

      const body: string[][] = []
      let sira = 1
      filteredInventoryBySearch.forEach(item => {
        const dists = distributionMap[item.id] || []
        const distStr = dists.map(d => `${d.plaka} (${d.adet})`).join(', ') || 'Araçlarda Yok'
        body.push([
          sira.toString(),
          item.malzeme_adi,
          item.merkez.toString(),
          item.esentepe.toString(),
          item.organize.toString(),
          item.depo.toString(),
          distStr,
          item.toplam.toString()
        ])
        sira++
      })

      autoTable(doc, {
        head: [["Sıra", "Malzeme Cinsi", "Merkez", "Esentepe", "OSB", "Depo", "Araç Dağılımları (Plaka-Adet)", "Toplam"]],
        body: body,
        startY: 46,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { font: "Helvetica", fontSize: 8 }
      })
      doc.save(`Arama_Sonuclari_Envanter_${timestamp.replace(/\./g, '_')}.pdf`)
    } else {
      doc.text(`Genel Stok ve Malzeme Matrisi Raporu`, 14, 28)
      doc.text(`Rapor Tarihi: ${timestamp}`, 14, 34)

      const body = inventory.map((item, idx) => [
        (idx + 1).toString(),
        item.malzeme_adi,
        item.merkez.toString(),
        item.esentepe.toString(),
        item.organize.toString(),
        item.depo.toString(),
        item.toplam.toString()
      ])

      autoTable(doc, {
        head: [["Sıra", "Malzeme Cinsi", "Merkez", "Esentepe", "OSB", "Depo", "Genel Toplam"]],
        body: body,
        startY: 40,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { font: "Helvetica", fontSize: 9 }
      })
      doc.save(`Genel_Stok_Matrisi_${timestamp.replace(/\./g, '_')}.pdf`)
    }
  }

  // Excel Export
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const timestamp = new Date().toLocaleDateString('tr-TR')

    if (selectedPlaka) {
      const data = vehicleZimmetList.map(item => ({
        "Sıra No": item.sira,
        "Malzeme Cinsi": item.malzeme_adi,
        "Zimmet Miktarı (Adet)": item.adet
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, selectedPlaka.substring(0, 30))
      XLSX.writeFile(wb, `Envanter_Raporu_${selectedPlaka.replace(/\s+/g, '_')}.xlsx`)
    } else if (searchQuery.trim()) {
      const data = filteredInventoryBySearch.map((item, idx) => {
        const dists = distributionMap[item.id] || []
        const distStr = dists.map(d => `${d.plaka}: ${d.adet} ad.`).join(' | ') || '-'
        return {
          "Sıra No": idx + 1,
          "Malzeme Adı": item.malzeme_adi,
          "Merkez Ana Depo": item.merkez,
          "Esentepe Şubesi": item.esentepe,
          "Organize Sanayi Şubesi": item.organize,
          "Depo Stok": item.depo,
          "Araç Zimmet Dağılımları": distStr,
          "Toplam Stok": item.toplam
        }
      })
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, "Arama Sonuçları")
      XLSX.writeFile(wb, `Arama_Sonuclari_Envanter_${timestamp.replace(/\./g, '_')}.xlsx`)
    } else {
      const data = inventory.map((item, idx) => ({
        "Sıra No": idx + 1,
        "Malzeme Adı": item.malzeme_adi,
        "Merkez Ana Depo": item.merkez,
        "Esentepe Şubesi": item.esentepe,
        "Organize Sanayi Şubesi": item.organize,
        "Depo Stok": item.depo,
        "Genel Toplam": item.toplam
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, "Genel Stok Matrisi")
      XLSX.writeFile(wb, `Genel_Stok_Matrisi_${timestamp.replace(/\./g, '_')}.xlsx`)
    }
  }

  return (
    <PageGuard pageId="envanter">
      <div className="flex flex-col min-h-screen space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Combine className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              Malzeme & Envanter Kontrol Matrisi
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sivas İtfaiye envanterindeki 130 kalem ekipmanın şube, depo ve araç bazlı taktiksel dağılımı.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleExportPDF} 
              variant="outline" 
              className="flex-1 sm:flex-none h-11 border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-200"
              disabled={loading}
            >
              <FileText className="w-4 h-4 mr-2 text-rose-400" />
              PDF İndir
            </Button>
            <Button 
              onClick={handleExportExcel} 
              variant="outline" 
              className="flex-1 sm:flex-none h-11 border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-200"
              disabled={loading}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Excel İndir
            </Button>
          </div>
        </div>

        {/* Filters and Inputs Controls */}
        <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl">
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            
            {/* 1. Eldiven Uyumlu Arama Çubuğu */}
            <div className="flex-1 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">MALZEME VEYA EKİPMAN ARAMA</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Ekipman adı girin (Örn: Balta, Hortum, Elbise)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value) setSelectedPlaka("") // Clear vehicle selection when typing
                  }}
                  className="pl-11 h-12 bg-slate-950/80 border-white/10 text-slate-100 text-sm md:text-base font-semibold focus:border-cyan-500/50 focus:ring-cyan-500/50 rounded-xl"
                />
              </div>
            </div>

            {/* Separator / OR */}
            <div className="flex items-center justify-center font-mono text-[10px] font-bold text-slate-500 uppercase px-2">
              <span>VEYA</span>
            </div>

            {/* 2. Araç Bazlı Filtreleme Süzgeci */}
            <div className="w-full md:w-80">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">ARAÇ BAZLI ENVANTER SÜZGECİ</label>
              <div className="relative">
                <select
                  value={selectedPlaka}
                  onChange={(e) => {
                    setSelectedPlaka(e.target.value)
                    if (e.target.value) setSearchQuery("") // Clear search when selecting vehicle
                  }}
                  className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 font-mono font-bold text-slate-100 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                >
                  <option value="">-- Tüm Araçlar / Filtre Yok --</option>
                  {vehicles.map(v => (
                    <option key={v.plaka} value={v.plaka}>
                      🚗 {v.plaka} {v.model ? `(${v.model})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Dynamic Display Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Combine className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-slate-400 font-mono text-sm tracking-wider">ENVANTER VERİLERİ ÇEKİLİYOR...</p>
          </div>
        ) : searchQuery.trim() ? (
          
          /* ═══ 1. SENARYO: ARAMA AKTİFKEN DİNAMİK DAĞILIM KARTLARI ═══ */
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                Arama Sonuçları: {filteredInventoryBySearch.length} Kalem Eşleşti
              </span>
            </div>

            {filteredInventoryBySearch.length === 0 ? (
              <Card className="bg-slate-950/40 border border-slate-800/40 py-16 text-center rounded-2xl">
                <p className="text-slate-500 italic text-sm">Aradığınız kriterlere uygun malzeme kaydı bulunamadı.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInventoryBySearch.map(item => {
                  const dists = distributionMap[item.id] || []
                  
                  return (
                    <Card key={item.id} className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div>
                        {/* Material Header */}
                        <CardHeader className="bg-slate-950/40 border-b border-white/5 p-4 flex flex-row justify-between items-center">
                          <CardTitle className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                            <Layers className="w-4 h-4 text-cyan-400" />
                            {item.malzeme_adi}
                          </CardTitle>
                          <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-0.5 rounded text-xs font-extrabold">
                            T: {item.toplam} Adet
                          </span>
                        </CardHeader>

                        {/* Inventory distribution data */}
                        <CardContent className="p-4 space-y-4">
                          
                          {/* Station/Branch Stocks */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] font-bold tracking-wider uppercase">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Şube ve Depo Stokları
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                <p className="text-slate-500 font-mono text-[9px] font-bold uppercase">Merkez</p>
                                <p className="text-slate-200 font-mono font-bold mt-1 text-sm">{item.merkez}</p>
                              </div>
                              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                <p className="text-slate-500 font-mono text-[9px] font-bold uppercase">Esentepe</p>
                                <p className="text-slate-200 font-mono font-bold mt-1 text-sm">{item.esentepe}</p>
                              </div>
                              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                <p className="text-slate-500 font-mono text-[9px] font-bold uppercase">OSB</p>
                                <p className="text-slate-200 font-mono font-bold mt-1 text-sm">{item.organize}</p>
                              </div>
                              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                <p className="text-slate-500 font-mono text-[9px] font-bold uppercase">Depo</p>
                                <p className="text-slate-200 font-mono font-bold mt-1 text-sm">{item.depo}</p>
                              </div>
                            </div>
                          </div>

                          {/* Vehicle distribution list */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] font-bold tracking-wider uppercase">
                              <Truck className="w-3.5 h-3.5 text-slate-400" />
                              Taktik Araç Zimmet Dağılımı
                            </div>
                            
                            {dists.length === 0 ? (
                              <div className="bg-slate-900/20 py-4 text-center rounded-xl border border-white/5 border-dashed text-xs text-slate-500 italic">
                                Araç üzerinde aktif zimmet bulunmamaktadır.
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {dists.map(dist => (
                                  <div key={dist.plaka} className="bg-slate-900/40 px-3 py-2 rounded-xl border border-white/5 flex items-center justify-between">
                                    <span className="font-mono text-xs text-slate-300 font-bold">{dist.plaka}</span>
                                    <span className="font-mono text-xs text-cyan-400 font-extrabold bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">
                                      {dist.adet}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </CardContent>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

        ) : selectedPlaka ? (
          
          /* ═══ 2. SENARYO: ARAÇ SEÇİLİYKEN RESMİ KURUM NİZAMINDA TABLO ═══ */
          <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-950/40 border-b border-white/10 p-5 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2 tracking-tight">
                <ClipboardList className="w-5 h-5 text-cyan-400" />
                <span>Araç Zimmet Listesi - {selectedPlaka}</span>
              </CardTitle>
              <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-3 py-1 rounded-lg text-xs font-bold">
                Toplam Çeşitlilik: {vehicleZimmetList.length} Kalem
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 font-mono">
                    <tr>
                      <th className="px-5 py-3.5 text-left font-semibold w-16">Sıra No</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Malzeme Cinsi (Cihaz / Donanım)</th>
                      <th className="px-5 py-3.5 text-right font-semibold w-32">Zimmet Miktarı (Adet)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {vehicleZimmetList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-500 italic font-mono text-xs">
                          Bu araca zimmetli herhangi bir operasyonel malzeme bulunmamaktadır.
                        </td>
                      </tr>
                    ) : (
                      vehicleZimmetList.map((item) => (
                        <tr key={item.sira} className="hover:bg-white/5 transition-colors duration-150">
                          <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{item.sira}</td>
                          <td className="px-5 py-3.5 text-slate-200 font-bold">{item.malzeme_adi}</td>
                          <td className="px-5 py-3.5 text-right text-cyan-400 font-mono font-bold text-sm">{item.adet}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        ) : (
          
          /* ═══ 3. SENARYO: HİÇBİR FİLTRE AKTİF DEĞİLKEN GENEL STOK MATRİSİ ═══ */
          <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-950/40 border-b border-white/10 p-5">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2 tracking-tight">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Sivas İtfaiyesi Genel Stok Matrisi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 font-mono sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3.5 text-left font-semibold w-16">Sıra No</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Malzeme Cinsi</th>
                      <th className="px-5 py-3.5 text-center font-semibold">Merkez</th>
                      <th className="px-5 py-3.5 text-center font-semibold">Esentepe</th>
                      <th className="px-5 py-3.5 text-center font-semibold">OSB</th>
                      <th className="px-5 py-3.5 text-center font-semibold">Depo</th>
                      <th className="px-5 py-3.5 text-right font-semibold w-32">Toplam Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {inventory.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors duration-150">
                        <td className="px-5 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-5 py-2.5 text-slate-200 font-bold">{item.malzeme_adi}</td>
                        <td className="px-5 py-2.5 text-center font-mono text-slate-300">{item.merkez}</td>
                        <td className="px-5 py-2.5 text-center font-mono text-slate-300">{item.esentepe}</td>
                        <td className="px-5 py-2.5 text-center font-mono text-slate-300">{item.organize}</td>
                        <td className="px-5 py-2.5 text-center font-mono text-slate-300">{item.depo}</td>
                        <td className="px-5 py-2.5 text-right text-cyan-400 font-mono font-extrabold text-sm">{item.toplam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Global Hardware Safe Area Masking Block / Bottom Navigation Shield */}
        <div 
          className="w-full block md:hidden pointer-events-none clear-both h-28" 
          aria-hidden="true" 
        />

      </div>
    </PageGuard>
  )
}
