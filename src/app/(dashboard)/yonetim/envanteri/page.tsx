"use client"

import { useState, useEffect, useMemo } from "react"
import PageGuard from "@/components/PageGuard"
import { api } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { 
  Combine, 
  Trash2, 
  Plus, 
  Save, 
  Printer, 
  ArrowRight, 
  Loader2, 
  CheckCircle2 
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useAuthStore } from "@/lib/authStore"
import { COMPARTMENT_NAMES, APP_BASE_URL } from "@/lib/constants"

// TypeScript interfaces
interface Vehicle {
  plaka: string;
  arac_tipi?: string;
  marka?: string;
  model?: string;
}

interface InventoryItem {
  id: number;
  malzeme_adi: string;
}

interface InventoryRow {
  internalId: string;
  id?: number;
  plaka: string;
  bolme_kapak: string;
  malzeme_adi: string;
  adet: number;
  durum: string;
}

const DEFAULT_COMPARTMENTS = [
  "Araç İçi",
  "Sol Ön Kapak",
  "Sol Orta Kapak",
  "Sol Arka Kapak",
  "Sağ Ön Kapak",
  "Sağ Orta Kapak",
  "Sağ Arka Kapak",
  "Araç Üstü",
  "Arka Bölme",
  "Arka Kapak",
  "Kabin İçi"
];

const DURUM_OPTIONS = [
  { value: "Tam", label: "Tam (Eksiksiz)", colorClass: "text-emerald-400" },
  { value: "Eksik", label: "Eksik (Hasarsız)", colorClass: "text-amber-400" },
  { value: "Arızalı", label: "Arızalı (Bakımda)", colorClass: "text-rose-400" },
  { value: "Kayıp/Yok", label: "Kayıp / Yok", colorClass: "text-slate-400" }
];

export default function EnvanteriPage() {
  const { user } = useAuthStore()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedPlaka, setSelectedPlaka] = useState<string>("")
  const [tableRows, setTableRows] = useState<InventoryRow[]>([])
  const [compartmentOptions, setCompartmentOptions] = useState<string[]>(DEFAULT_COMPARTMENTS)
  
  // Cache of malzeme_adi -> id
  const [inventoryCache, setInventoryCache] = useState<Record<string, number>>({})
  
  // UI Loading States
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingRows, setLoadingRows] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  
  // Print Filter Option
  const [printFilter, setPrintFilter] = useState<string>("all")
  const [mounted, setMounted] = useState<boolean>(false)

  // Reverse mapping for clean slug URLs
  const getCompartmentKey = (label: string): string => {
    const entry = Object.entries(COMPARTMENT_NAMES).find(
      ([_, v]) => v.toLowerCase() === label.toLowerCase()
    );
    return entry ? entry[0] : label.replace(/\s+/g, "_").toLowerCase();
  };

  const buildQrUrl = (plaka: string, compartmentLabel: string): string => {
    const slug = plaka.replace(/\s+/g, "-").toLowerCase();
    const compKey = getCompartmentKey(compartmentLabel);
    return `${APP_BASE_URL}/arac/${slug}/${compKey}`;
  };

  // Initial load
  useEffect(() => {
    setMounted(true)
    async function loadInitialData() {
      try {
        setLoading(true)
        
        // 1. Fetch vehicles
        const { data: vehs } = await api.from('vehicles').select('*')
        if (vehs) {
          const sortedVehs = [...vehs].sort((a: Vehicle, b: Vehicle) => a.plaka.localeCompare(b.plaka, 'tr'))
          setVehicles(sortedVehs)
        }

        // 2. Fetch master inventory to populate cache
        const { data: masterInv } = await api.from('inventory').select('id, malzeme_adi')
        if (masterInv) {
          const cache: Record<string, number> = {};
          masterInv.forEach((item: InventoryItem) => {
            cache[item.malzeme_adi.toUpperCase()] = item.id;
          });
          setInventoryCache(cache)
        }

        // 3. Select first vehicle by default
        if (vehs && vehs.length > 0) {
          const defaultPlate = vehs[0].plaka;
          setSelectedPlaka(defaultPlate);
        }
      } catch (err) {
        console.error("Envanter başlangıç yükleme hatası:", err)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Load rows when selectedPlaka changes
  useEffect(() => {
    if (!selectedPlaka) return;
    
    async function loadVehicleRows() {
      try {
        setLoadingRows(true)
        // Fetch rows
        const { data: vehInv } = await api.from('vehicle_inventory').select('*').eq('plaka', selectedPlaka)
        const { data: masterInv } = await api.from('inventory').select('id, malzeme_adi')
        
        if (vehInv && masterInv) {
          const cache: Record<string, number> = {};
          masterInv.forEach((item: InventoryItem) => {
            cache[item.malzeme_adi.toUpperCase()] = item.id;
          });
          setInventoryCache(cache);

          const mapped: InventoryRow[] = vehInv.map((item: any) => {
            const matchingInv = masterInv.find((i: any) => i.id === item.inventory_id);
            return {
              internalId: Math.random().toString(36).substring(7),
              id: item.id,
              plaka: item.plaka,
              bolme_kapak: item.bolme_kapak || "Araç İçi",
              malzeme_adi: matchingInv ? matchingInv.malzeme_adi : `Bilinmeyen Malzeme (ID: ${item.inventory_id})`,
              adet: item.adet || 0,
              durum: item.durum || "Tam"
            };
          });

          // Extract and dedup any unique compartments from database rows
          const uniqueLocs = Array.from(new Set(mapped.map(row => row.bolme_kapak)));
          const mergedOptions = Array.from(new Set([...DEFAULT_COMPARTMENTS, ...uniqueLocs]));
          setCompartmentOptions(mergedOptions);

          // Sort table rows by bolme_kapak, then by name
          mapped.sort((a, b) => {
            const locComp = a.bolme_kapak.localeCompare(b.bolme_kapak, 'tr');
            if (locComp !== 0) return locComp;
            return a.malzeme_adi.localeCompare(b.malzeme_adi, 'tr');
          });

          setTableRows(mapped);
        } else {
          setTableRows([]);
        }
      } catch (err) {
        console.error("Araç envanter yükleme hatası:", err)
      } finally {
        setLoadingRows(false)
      }
    }
    loadVehicleRows()
  }, [selectedPlaka])

  // Field change handler
  const handleFieldChange = (internalId: string, field: keyof InventoryRow, value: any) => {
    setTableRows(prev => prev.map(row => 
      row.internalId === internalId ? { ...row, [field]: value } : row
    ));
  };

  // Add new row handler
  const handleAddNewItem = () => {
    setTableRows(prev => [
      ...prev,
      {
        internalId: Math.random().toString(36).substring(7),
        plaka: selectedPlaka,
        bolme_kapak: "Araç İçi",
        malzeme_adi: "",
        adet: 1,
        durum: "Tam"
      }
    ]);
  };

  // Delete row handler
  const handleDeleteItem = (internalId: string) => {
    setTableRows(prev => prev.filter(row => row.internalId !== internalId));
  };

  // Save changes to database
  const saveInventoryToDB = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      // 1. Gather all unique malzeme_adi, create new inventory master items if they don't exist
      const cache = { ...inventoryCache };
      
      for (const row of tableRows) {
        const matName = row.malzeme_adi.trim();
        if (!matName) continue;
        
        const matUpper = matName.toUpperCase();
        if (!cache[matUpper]) {
          // Dynamic insert into master inventory
          const insertRes = await api.insert('inventory', { malzeme_adi: matName });
          if (insertRes.error) {
            throw new Error(`Yeni master malzeme "${matName}" eklenirken hata oluştu: ${insertRes.error}`);
          }
          if (insertRes.data && insertRes.data[0]) {
            cache[matUpper] = insertRes.data[0].id;
          }
        }
      }
      setInventoryCache(cache);

      // 2. Prepare database insert rows
      const dbRows = tableRows
        .filter(row => row.malzeme_adi.trim() !== "")
        .map(row => {
          const matUpper = row.malzeme_adi.trim().toUpperCase();
          return {
            plaka: selectedPlaka,
            inventory_id: cache[matUpper],
            adet: Number(row.adet),
            durum: row.durum || "Tam",
            bolme_kapak: row.bolme_kapak || "Araç İçi"
          };
        });

      // 3. Clear old records for selected vehicle in vehicle_inventory
      const removeRes = await api.remove('vehicle_inventory', { plaka: selectedPlaka });
      if (removeRes.error) {
        throw new Error(`Eski envanter silinirken hata oluştu: ${removeRes.error}`);
      }

      // 4. Batch insert new records into vehicle_inventory
      if (dbRows.length > 0) {
        const insertRes = await api.insert('vehicle_inventory', dbRows);
        if (insertRes.error) {
          throw new Error(`Envanter kaydedilirken hata oluştu: ${insertRes.error}`);
        }
      }

      // 5. Rebuild bolmeler JSON for backward compatibility
      const newBolmeler: Record<string, any[]> = {};
      dbRows.forEach(row => {
        const key = getCompartmentKey(row.bolme_kapak);
        if (!newBolmeler[key]) newBolmeler[key] = [];
        
        // Find matching master name
        const masterName = tableRows.find(
          r => r.bolme_kapak === row.bolme_kapak && getCompartmentKey(r.bolme_kapak) === key && cache[r.malzeme_adi.trim().toUpperCase()] === row.inventory_id
        )?.malzeme_adi || "Bilinmeyen Malzeme";

        newBolmeler[key].push({
          malzeme: masterName,
          adet: row.adet,
          durum: row.durum
        });
      });

      const vehicleUpdateRes = await api.update('vehicles', { bolmeler: newBolmeler }, { plaka: selectedPlaka });
      if (vehicleUpdateRes.error) {
        console.warn("⚠️ bolmeler JSON update warning:", vehicleUpdateRes.error);
      }

      // 6. Save audit log
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'inventory_update',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: selectedPlaka,
          details: {
            total_items: dbRows.length,
            compartments: Object.keys(newBolmeler),
          },
        }),
      }).catch(err => console.error('[AuditLog] Envanter güncelleme logu gönderilemedi:', err))

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Hata oluştu: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Print engine handler
  const handlePrint = () => {
    const printArea = document.getElementById('print-area-qr')
    if (!printArea) return

    const clone = printArea.cloneNode(true) as HTMLElement
    clone.className = 'print-area-container'
    clone.id = 'print-area-live'
    document.body.appendChild(clone)

    setTimeout(() => {
      window.print()
      setTimeout(() => {
        const live = document.getElementById('print-area-live')
        if (live) document.body.removeChild(live)
      }, 500)
    }, 400)
  }

  // Get distinct compartments in current table rows
  const distinctCompartments = useMemo(() => {
    const set = new Set(tableRows.map(row => row.bolme_kapak));
    return Array.from(set).filter(Boolean);
  }, [tableRows]);

  const printCompartments = printFilter === "all" ? distinctCompartments : [printFilter];

  return (
    <PageGuard pageId="envanter">
      <div className="flex flex-col min-h-screen space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 print:hidden gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Combine className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              QR & Envanter Yönetimi
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Araç malzemelerini canlı düzenleyin, sistem QR etiketlerini toplu şekilde yazdırın.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <select 
              value={printFilter} 
              onChange={e => setPrintFilter(e.target.value)} 
              className="h-11 w-full sm:w-auto rounded-lg border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shrink-0 font-medium font-mono min-h-[44px]"
            >
              <option value="all">Tüm Bölmeler</option>
              {distinctCompartments.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button 
              onClick={handlePrint} 
              variant="default" 
              className="w-full sm:w-auto h-11 shrink-0 font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_-3px_rgba(249,115,22,0.4)] border border-orange-500/30 min-h-[44px]"
            >
              <Printer className="w-4 h-4 mr-2" />
              Etiketleri Yazdır
            </Button>
          </div>
        </div>

        {/* Filters and Inputs Controls */}
        <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl print:hidden">
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            
            {/* 1. Target Plate Select Dropdown */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">HEDEF ARAÇ PLAKASI</label>
              <div className="relative">
                <select
                  value={selectedPlaka}
                  onChange={(e) => setSelectedPlaka(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 font-mono font-bold text-slate-100 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                >
                  <option value="">-- Araç Seçin --</option>
                  {vehicles.map(v => (
                    <option key={v.plaka} value={v.plaka}>
                      🚗 {v.plaka} {v.model ? `(${v.model})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Separator / Arrow */}
            <div className="flex items-center justify-center pt-4 md:pt-6 px-2">
              <ArrowRight className="text-cyan-500/40 w-5 h-5 hidden md:block" />
            </div>

            {/* 2. Durum Bilgisi Counter Box */}
            <div className="flex-1 bg-slate-950/40 p-3 rounded-xl border border-white/5 border-dashed flex justify-between items-center h-12">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase font-mono leading-none mb-1">Durum Bilgisi</p>
                <p className="text-xs text-slate-300 font-semibold leading-none">Sistemde Kayıtlı Toplam Malzeme</p>
              </div>
              <span className="font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2.5 py-1 rounded text-xs font-bold shrink-0">
                {tableRows.length} Adet
              </span>
            </div>

          </CardContent>
        </Card>

        {/* Dynamic Display Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 print:hidden">
            <Combine className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-slate-400 font-mono text-sm tracking-wider">ENVANTER VERİLERİ ÇEKİLİYOR...</p>
          </div>
        ) : !selectedPlaka ? (
          <Card className="bg-slate-950/40 border border-slate-800/40 py-16 text-center rounded-2xl print:hidden">
            <p className="text-slate-500 italic text-sm">Düzenleme yapmak için lütfen üst menüden bir taktik araç plakası seçin.</p>
          </Card>
        ) : (
          
          /* ═══ TABLO YÖNETİCİSİ PANELİ ═══ */
          <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl print:hidden">
            <CardHeader className="bg-slate-950/40 border-b border-white/10 flex flex-row items-center justify-between p-5">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2 tracking-tight">
                <Combine className="w-4 h-4 text-cyan-400" />
                <span>Tablo Yöneticisi (Anlık Düzenleme)</span>
              </CardTitle>
              <Button 
                onClick={handleAddNewItem} 
                size="sm" 
                variant="secondary" 
                className="font-bold border border-white/10 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-cyan-400"/>
                Yeni Satır
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              
              {loadingRows ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-slate-500 font-mono text-xs">Araç envanter matrisi yükleniyor...</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 font-mono">
                      <tr>
                        <th className="px-5 py-3.5 text-left font-semibold w-1/4">BÖLME (KAPAK)</th>
                        <th className="px-5 py-3.5 text-left font-semibold">MALZEME ADI</th>
                        <th className="px-5 py-3.5 text-left font-semibold w-24">ADET</th>
                        <th className="px-5 py-3.5 text-left font-semibold w-40">DURUM</th>
                        <th className="px-5 py-3.5 text-center font-semibold w-20">SİL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {tableRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 italic font-mono text-xs">
                            Bu araca ait malzeme kaydı bulunamadı. "Yeni Satır" butonuna basarak envanter ekleyin.
                          </td>
                        </tr>
                      ) : (
                        tableRows.map((row) => (
                          <tr key={row.internalId} className="hover:bg-white/5 transition-colors duration-150">
                            {/* Compartment select */}
                            <td className="px-5 py-2.5 align-middle">
                              <select
                                value={row.bolme_kapak}
                                onChange={(e) => handleFieldChange(row.internalId, "bolme_kapak", e.target.value)}
                                className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 text-slate-200 px-3 py-1 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none font-mono"
                              >
                                {compartmentOptions.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </td>

                            {/* Material Name input */}
                            <td className="px-5 py-2.5 align-middle">
                              <Input 
                                placeholder="Malzeme ismi..."
                                value={row.malzeme_adi}
                                onChange={(e) => handleFieldChange(row.internalId, "malzeme_adi", e.target.value)}
                                className="bg-slate-950/60 border-white/10 text-slate-200 text-xs focus:border-cyan-500/50 focus:ring-cyan-500/50 h-10 w-full"
                              />
                            </td>

                            {/* Quantity input */}
                            <td className="px-5 py-2.5 align-middle">
                              <Input 
                                type="number"
                                min="1"
                                value={row.adet}
                                onChange={(e) => handleFieldChange(row.internalId, "adet", Number(e.target.value))}
                                className="bg-slate-950/60 border-white/10 text-slate-200 font-mono text-xs focus:border-cyan-500/50 focus:ring-cyan-500/50 h-10 w-20 text-center"
                              />
                            </td>

                            {/* Status select */}
                            <td className="px-5 py-2.5 align-middle">
                              <select
                                value={row.durum}
                                onChange={(e) => handleFieldChange(row.internalId, "durum", e.target.value)}
                                className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/80 text-slate-200 px-3 py-1 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none font-mono font-bold"
                              >
                                {DURUM_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} className={opt.colorClass}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Delete button */}
                            <td className="px-5 py-2.5 text-center align-middle">
                              <button 
                                onClick={() => handleDeleteItem(row.internalId)}
                                className="h-10 w-10 flex items-center justify-center text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-colors mx-auto border border-transparent hover:border-rose-500/20 min-h-[44px]"
                                title="Satırı Kaldır"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            
            {/* Footer with neon red save button */}
            <div className="p-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
              {saveSuccess && (
                <span className="text-xs font-mono font-bold text-emerald-400 animate-in fade-in duration-200 mr-2 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/25 justify-center">
                  ✓ VERİTABANINA YAZILDI VE MÜHÜRLENDİ
                </span>
              )}
              <Button 
                onClick={saveInventoryToDB} 
                disabled={isSaving || loadingRows} 
                className="font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_-3px_rgba(225,29,72,0.4)] border border-rose-500/30 px-6 min-h-[44px] transition-all duration-200 active:scale-[0.97] ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2"/>
                    Kaydet
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* --- Hidden QR print element (window.print() clone source) --- */}
        {mounted && selectedPlaka && (
          <div id="print-area-qr" style={{ display: 'none' }}>
             <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', color: 'black', borderBottom: '6px solid black', paddingBottom: '0.5rem' }}>
                  SİVAS BELEDİYESİ İTFAİYE MÜDÜRLÜĞÜ
                </h1>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: 'black' }}>
                  Araç QR Kod & Envanter Dizin Etiketleri (Araç Plakası: {selectedPlaka})
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                  {printCompartments.map(comp => (
                    <div key={comp} style={{ border: '6px solid black', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '2rem', textAlign: 'center', breakInside: 'avoid' as any, pageBreakInside: 'avoid' }}>
                       <h2 style={{ fontSize: '2rem', fontWeight: 950, background: 'black', color: 'white', padding: '0.75rem 2rem', borderRadius: '9999px', marginBottom: '2rem', whiteSpace: 'nowrap' }}>
                          {selectedPlaka}
                       </h2>
                       
                       <div style={{ background: 'white', padding: '1rem', border: '3px solid black' }}>
                         <QRCodeSVG value={buildQrUrl(selectedPlaka, comp)} size={240} level={"H"} />
                       </div>
                       
                       <div style={{ marginTop: '2rem', borderTop: '4px solid black', width: '100%', paddingTop: '1rem' }}>
                         <h3 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'black' }}>
                           {comp}
                         </h3>
                         <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'monospace', marginTop: '0.75rem', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.7)', fontWeight: 800 }}>
                           Sivas İtfaiyesi Lojistik
                         </p>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* Global Hardware Safe Area Spacer Shield */}
        <div 
          className="w-full block md:hidden pointer-events-none clear-both h-28" 
          aria-hidden="true" 
        />

      </div>
    </PageGuard>
  )
}
