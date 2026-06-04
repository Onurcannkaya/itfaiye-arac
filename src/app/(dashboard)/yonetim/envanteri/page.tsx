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
  Layers, 
  Truck, 
  FileSpreadsheet, 
  Search,
  Warehouse
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
  filo_no?: number | null;
  aciklama?: string;
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

interface MasterInventoryItem {
  id: number;
  malzeme_adi: string;
  merkez: number;
  esentepe: number;
  organize: number;
  depo: number;
  toplam: number;
}

interface VehicleInventoryItem {
  plaka: string;
  inventory_id: number;
  adet: number;
}

interface GarajInventoryItem {
  id: number;
  malzeme_adi: string;
  bolme_kapak: string;
  adet: number;
}

const CLEAN_COMPARTMENT_OPTIONS = [
  "Araç İçi",
  "Araç Üstü",
  "Arka Kapak",
  "Halat Çantası",
  "Küçük Kapak",
  "Sağ Ön Kapak",
  "Sağ Orta Kapak",
  "Sağ Arka Kapak",
  "Sol Ön Kapak",
  "Sol Orta Kapak",
  "Sol Arka Kapak",
  "Yüksek Açı Kurtarma Çantası",
  "Garaj"
];

const DURUM_OPTIONS = [
  { value: "Tam", label: "Tam (Eksiksiz)", colorClass: "text-emerald-400" },
  { value: "Eksik", label: "Eksik (Hasarsız)", colorClass: "text-amber-400" },
  { value: "Arızalı", label: "Arızalı (Bakımda)", colorClass: "text-rose-400" },
  { value: "Kayıp/Yok", label: "Kayıp / Yok", colorClass: "text-slate-400" }
];

export default function EnvanteriPage() {
  const { user } = useAuthStore()
  const canEdit = user?.rol === 'Admin' || user?.rol === 'Editor'
  
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<"crud" | "matrix">("crud")
  
  // Vehicle Selections and Rows
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedPlaka, setSelectedPlaka] = useState<string>("")
  const [tableRows, setTableRows] = useState<InventoryRow[]>([])
  
  // Vehicle metadata edit states (filo_no and aciklama)
  const [editFiloNo, setEditFiloNo] = useState<string>("")
  const [editAciklama, setEditAciklama] = useState<string>("")

  // Synchronize edit fields when selectedPlaka changes
  useEffect(() => {
    if (!selectedPlaka) return;
    const currentVeh = vehicles.find(v => v.plaka === selectedPlaka);
    if (currentVeh) {
      setEditFiloNo(currentVeh.filo_no?.toString() || "");
      setEditAciklama(currentVeh.aciklama || "");
    } else {
      setEditFiloNo("");
      setEditAciklama("");
    }
  }, [selectedPlaka, vehicles])

  const handleUpdateVehicleMeta = async () => {
    if (!selectedPlaka || selectedPlaka === "GARAJ") return;
    try {
      const updates = {
        filo_no: editFiloNo ? parseInt(editFiloNo, 10) : null,
        aciklama: editAciklama || null
      };
      
      const { error } = await api.update('vehicles', updates, { plaka: selectedPlaka });
      if (error) throw error;
      
      // Update vehicles state locally
      setVehicles(prev => prev.map(v => {
        if (v.plaka === selectedPlaka) {
          return { 
            ...v, 
            filo_no: updates.filo_no,
            aciklama: updates.aciklama || undefined 
          };
        }
        return v;
      }));
      
      alert("Araç filo bilgileri başarıyla güncellendi.");
    } catch (err: any) {
      console.error(err);
      alert("Hata oluştu: " + (err.message || err));
    }
  }
  
  // Cache of malzeme_adi -> id
  const [inventoryCache, setInventoryCache] = useState<Record<string, number>>({})
  
  // Master Matrix State
  const [masterInventory, setMasterInventory] = useState<MasterInventoryItem[]>([])
  const [allVehicleInventory, setAllVehicleInventory] = useState<VehicleInventoryItem[]>([])
  const [garajInventory, setGarajInventory] = useState<GarajInventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // Render plate as a beautiful realistic Turkish license plate badge
  const renderPlateHeader = (plaka: string) => {
    const isPlate = plaka.match(/(58\s+[A-Z]+\s+\d+)/i);
    if (!isPlate) return <span className="font-bold tracking-tight text-slate-300 font-sans">{plaka}</span>;
    return (
      <div className="inline-flex items-center border border-slate-700/60 rounded bg-slate-900 overflow-hidden text-[10px] font-mono leading-none shadow-[0_2px_5px_rgba(0,0,0,0.4)] border-b-2 border-slate-950">
        <span className="bg-blue-600 text-white px-1 py-1 text-[8px] font-black select-none">TR</span>
        <span className="px-1.5 py-1 text-slate-100 font-black tracking-tight whitespace-nowrap">{plaka}</span>
      </div>
    );
  };

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
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch vehicles
      const { data: vehs } = await api.from('vehicles').select('*')
      if (vehs) {
        const sortedVehs = [...vehs].sort((a: Vehicle, b: Vehicle) => (a.filo_no || 999) - (b.filo_no || 999))
        setVehicles(sortedVehs)
      }

      // 2. Fetch master inventory to populate cache & matrix
      const { data: masterInv } = await api.from('inventory').select('*')
      if (masterInv) {
        const cache: Record<string, number> = {};
        masterInv.forEach((item: any) => {
          cache[item.malzeme_adi.toUpperCase()] = item.id;
        });
        setInventoryCache(cache)
        
        const sortedInv = [...masterInv].sort((a: any, b: any) => a.malzeme_adi.localeCompare(b.malzeme_adi, 'tr'));
        setMasterInventory(sortedInv)
      }

      // 3. Fetch all vehicle_inventory entries for search matrix cards & pivot columns
      const { data: allVehInv } = await api.from('vehicle_inventory').select('plaka, inventory_id, adet')
      if (allVehInv) {
        setAllVehicleInventory(allVehInv)
      }

      // 4. Fetch Garaj list
      const { data: garajRows } = await api.from('vehicle_inventory').select('*').eq('plaka', 'GARAJ')
      if (garajRows && masterInv) {
        const mapped = garajRows.map((item: any) => {
          const matchingInv = masterInv.find((i: any) => i.id === item.inventory_id);
          return {
            id: item.id,
            malzeme_adi: matchingInv ? matchingInv.malzeme_adi : `Bilinmeyen Malzeme (ID: ${item.inventory_id})`,
            bolme_kapak: item.bolme_kapak || "Garaj",
            adet: item.adet || 0
          };
        });
        mapped.sort((a: any, b: any) => a.malzeme_adi.localeCompare(b.malzeme_adi, 'tr'));
        setGarajInventory(mapped);
      }

      // 5. Select first vehicle by default for CRUD editor
      if (vehs && vehs.length > 0 && !selectedPlaka) {
        setSelectedPlaka(vehs[0].plaka);
      }
    } catch (err) {
      console.error("Envanter veri yükleme hatası:", err)
    } finally {
      setLoading(false)
    }
  };

  // Load rows when selectedPlaka changes
  useEffect(() => {
    if (!selectedPlaka) return;
    
    async function loadVehicleRows() {
      try {
        setLoadingRows(true)
        const { data: vehInv } = await api.from('vehicle_inventory').select('*').eq('plaka', selectedPlaka)
        const { data: masterInv } = await api.from('inventory').select('id, malzeme_adi')
        
        if (vehInv && masterInv) {
          const cache: Record<string, number> = {};
          masterInv.forEach((item: any) => {
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
        bolme_kapak: selectedPlaka === "GARAJ" ? "Garaj" : "Araç İçi",
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
            bolme_kapak: row.bolme_kapak || (selectedPlaka === "GARAJ" ? "Garaj" : "Araç İçi")
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
      
      // Refresh local matrix and data cache
      loadAllData();
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

  // S.T.O.K Sheet vehicle columns extract (Excluding GARAJ to put in separate section)
  const vehicleColumns = useMemo(() => {
    const set = new Set(allVehicleInventory.map(item => item.plaka));
    return Array.from(set)
      .filter(plaka => plaka !== "GARAJ")
      .sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allVehicleInventory]);

  // General stock matrix client-side Excel CSV exporter (includes vehicle columns)
  const exportStockMatrixToCSV = () => {
    const headers = [
      "Sira No", 
      "Malzeme Cinsi", 
      ...vehicleColumns,
      "Merkez", 
      "Esentepe", 
      "OSB (Organize)", 
      "Depo", 
      "Toplam Stok"
    ];

    const rows = filteredInventory.map((item, idx) => {
      const rowAllocations = allVehicleInventory.filter(vi => vi.inventory_id === item.id);
      const vehicleCountMap: Record<string, number> = {};
      rowAllocations.forEach(a => {
        vehicleCountMap[a.plaka] = a.adet;
      });

      const vehicleSum = Object.entries(vehicleCountMap)
        .filter(([plaka]) => plaka !== "GARAJ")
        .reduce((sum, [_, val]) => sum + val, 0);

      const liveTotal = (item.merkez || 0) + (item.esentepe || 0) + (item.organize || 0) + (item.depo || 0) + vehicleSum;
      const vehicleCounts = vehicleColumns.map(plaka => vehicleCountMap[plaka] || 0);

      return [
        idx + 1,
        item.malzeme_adi,
        ...vehicleCounts,
        item.merkez,
        item.esentepe,
        item.organize,
        item.depo,
        liveTotal
      ];
    });
    
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
      csvContent += row.join(";") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Sivas_Itfaiyesi_Genel_Stok_Matrisi_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get distinct compartments in current table rows for QR printer
  const distinctCompartments = useMemo(() => {
    const set = new Set(tableRows.map(row => row.bolme_kapak));
    return Array.from(set).filter(Boolean);
  }, [tableRows]);

  const printCompartments = printFilter === "all" ? distinctCompartments : [printFilter];

  // Dynamic distribution mapping for stock query tab cards
  const distributionMap = useMemo(() => {
    const map: Record<number, { plaka: string; adet: number }[]> = {};
    allVehicleInventory.forEach(item => {
      const invId = item.inventory_id;
      if (!map[invId]) map[invId] = [];
      map[invId].push({ plaka: item.plaka, adet: item.adet });
    });
    return map;
  }, [allVehicleInventory]);

  // Master stock filtering
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return masterInventory;
    const query = searchQuery.trim().toLowerCase();
    return masterInventory.filter(item => 
      item.malzeme_adi.toLowerCase().includes(query)
    );
  }, [masterInventory, searchQuery]);

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
          
          {/* Print controls visible only on CRUD tab */}
          {activeTab === "crud" && (
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
          )}

          {/* Matrix export visible only on Matrix tab */}
          {activeTab === "matrix" && (
            <Button 
              onClick={exportStockMatrixToCSV} 
              variant="secondary" 
              className="w-full sm:w-auto h-11 shrink-0 font-bold border border-white/10 bg-slate-800/85 hover:bg-slate-800 text-slate-100 min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Excel (CSV) İndir
            </Button>
          )}
        </div>

        {/* Tab Selection Row */}
        <div className="flex gap-2 p-1 bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/5 self-start print:hidden">
          <button
            onClick={() => setActiveTab("crud")}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === "crud" ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "text-slate-400 hover:text-slate-200"}`}
          >
            🚗 Araç Envanter Editörü (CRUD)
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === "matrix" ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "text-slate-400 hover:text-slate-200"}`}
          >
            📊 Genel Stok & Sorgu Matrisi
          </button>
        </div>

        {/* Dynamic Display Tab Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 print:hidden">
            <Combine className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-slate-400 font-mono text-sm tracking-wider">ENVANTER VERİLERİ ÇEKİLİYOR...</p>
          </div>
        ) : (
          
          /* ════════════════ TAB 1: CRUD EDITOR ════════════════ */
          activeTab === "crud" ? (
            <div className="space-y-6">
              {/* Vehicle Selection Header Card */}
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl print:hidden">
                <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                  
                  {/* Target Plate Select Dropdown */}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">HEDEF ARAÇ PLAKASI</label>
                    <div className="relative">
                      <select
                        value={selectedPlaka}
                        onChange={(e) => setSelectedPlaka(e.target.value)}
                        className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 font-mono font-bold text-slate-100 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                      >
                        <option value="">-- Araç / Depo Seçin --</option>
                        {vehicles.map(v => (
                          <option key={v.plaka} value={v.plaka}>
                            {v.plaka === "GARAJ" 
                              ? "🏠 GARAJ (Merkez İtfaiye ve Şubeler)" 
                              : `🚗 ${v.filo_no ? `${v.filo_no} NOLU ${v.aciklama || ''} (${v.plaka})` : `${v.arac_tipi || ''} (${v.plaka})`}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Separator / Arrow */}
                  <div className="flex items-center justify-center pt-4 md:pt-6 px-2">
                    <ArrowRight className="text-cyan-500/40 w-5 h-5 hidden md:block" />
                  </div>

                  {/* Durum Bilgisi Counter Box */}
                  <div className="flex-1 bg-slate-950/40 p-3 rounded-xl border border-white/5 border-dashed flex justify-between items-center h-12">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase font-mono leading-none mb-1">Durum Bilgisi</p>
                      <p className="text-xs text-slate-300 font-semibold leading-none">Toplam Malzeme Çeşitliliği</p>
                    </div>
                    <span className="font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2.5 py-1 rounded text-xs font-bold shrink-0">
                      {tableRows.length} Kalem
                    </span>
                  </div>

                </CardContent>
              </Card>

              {/* Admin/Editor Vehicle Details Edit Tools */}
              {canEdit && selectedPlaka && selectedPlaka !== "GARAJ" && (
                <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl print:hidden">
                  <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:w-32">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">FİLO NUMARASI</label>
                      <input
                        type="number"
                        value={editFiloNo}
                        onChange={(e) => setEditFiloNo(e.target.value)}
                        placeholder="Örn: 3"
                        className="w-full h-11 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 font-mono font-bold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>
                    <div className="flex-1 w-full font-sans">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">AÇIKLAMA / ÇAĞRI ADI</label>
                      <input
                        type="text"
                        value={editAciklama}
                        onChange={(e) => setEditAciklama(e.target.value)}
                        placeholder="Örn: Ford Kargo Merdiven"
                        className="w-full h-11 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 font-bold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>
                    <button
                      onClick={handleUpdateVehicleMeta}
                      className="h-11 px-5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 w-full sm:w-auto font-sans shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]"
                    >
                      💾 Bilgiyi Güncelle
                    </button>
                  </CardContent>
                </Card>
              )}

              {/* CRUD Editor Table Matrix Card */}
              {!selectedPlaka ? (
                <Card className="bg-slate-950/40 border border-slate-800/40 py-16 text-center rounded-2xl print:hidden">
                  <p className="text-slate-500 italic text-sm">Düzenleme yapmak için lütfen üst menüden bir taktik araç plakası veya garaj deposunu seçin.</p>
                </Card>
              ) : (
                <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl print:hidden">
                  <CardHeader className="bg-slate-950/40 border-b border-white/10 flex flex-row items-center justify-between p-5">
                    <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2 tracking-tight">
                      <Combine className="w-4 h-4 text-cyan-400" />
                      <span>
                        {selectedPlaka === "GARAJ" 
                          ? "Garaj Deposu Envanter Editörü" 
                          : (() => {
                              const currentVeh = vehicles.find(v => v.plaka === selectedPlaka);
                              return currentVeh?.filo_no 
                                ? `${currentVeh.filo_no} NOLU ${currentVeh.aciklama || ''} (${selectedPlaka})` 
                                : `Tablo Yöneticisi (${selectedPlaka})`;
                            })()
                        }
                      </span>
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
                        <p className="text-slate-500 font-mono text-xs">Ayrıntılı envanter listesi yükleniyor...</p>
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
                                      {CLEAN_COMPARTMENT_OPTIONS.map(option => (
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
                  
                  {/* Save bar */}
                  <div className="p-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
                    {saveSuccess && (
                      <span className="text-xs font-mono font-bold text-emerald-400 mr-2 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/25 justify-center">
                        ✓ VERİTABANINA YAZILDI VE MÜHÜRLENDİ
                      </span>
                    )}
                    <Button 
                      onClick={saveInventoryToDB} 
                      disabled={isSaving || loadingRows} 
                      className="font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_-3px_rgba(225,29,72,0.4)] border border-rose-500/30 px-6 min-h-[44px] transition-all duration-200 active:scale-[0.97]"
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
            </div>
          ) : (
            
            /* ════════════════ TAB 2: GENERAL STOCK MATRIX ════════════════ */
            <div className="space-y-6">
              
              {/* Dynamic query search bar */}
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl print:hidden">
                <CardContent className="p-5">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Malzeme ismi ile matriste süzme yapın (Örn: Ala Hortum, Motopomp, Jeneratör)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-slate-900/60 border-white/10 text-slate-100 text-sm focus:border-cyan-500/50 focus:ring-cyan-500/50 h-12 pl-12 rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic Search Cards for vehicle distributions (visible only when search has text) */}
              {searchQuery.trim() !== "" && (
                <div className="space-y-4 print:hidden">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono pl-1">ARAMA SONUÇLARI MATRİS DIŞI DAĞILIM KARTLARI</h3>
                  
                  {filteredInventory.length === 0 ? (
                    <Card className="bg-slate-950/40 border border-slate-800/40 py-8 text-center rounded-2xl">
                      <p className="text-slate-500 italic text-sm">Aranan malzeme cinsiyle eşleşen envanter kaydı bulunamadı.</p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredInventory.map(item => {
                        const dists = distributionMap[item.id] || [];
                        return (
                          <Card key={item.id} className="bg-slate-950/75 border border-slate-800/60 rounded-2xl overflow-hidden shadow-lg hover:border-cyan-500/35 transition-all duration-200">
                            <CardHeader className="bg-slate-950/40 border-b border-white/5 p-4 flex flex-row justify-between items-center">
                              <span className="font-bold text-slate-200 text-sm">{item.malzeme_adi}</span>
                              <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-xs font-bold">
                                Toplam: {item.toplam} Adet (Depo)
                              </span>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                              
                              {/* Depot list */}
                              <div className="grid grid-cols-4 gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-center">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase font-mono">Merkez</span>
                                  <p className="font-mono font-bold text-slate-300 text-xs mt-0.5">{item.merkez}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase font-mono">Esentepe</span>
                                  <p className="font-mono font-bold text-slate-300 text-xs mt-0.5">{item.esentepe}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase font-mono">OSB</span>
                                  <p className="font-mono font-bold text-slate-300 text-xs mt-0.5">{item.organize}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase font-mono">Depo</span>
                                  <p className="font-mono font-bold text-slate-300 text-xs mt-0.5">{item.depo}</p>
                                </div>
                              </div>

                              {/* Vehicles distribution */}
                              <div className="space-y-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-cyan-500" /> Taktik Araç Zimmet Dağılımı (Garaj Hariç)
                                </span>
                                {dists.filter(d => d.plaka !== "GARAJ").length === 0 ? (
                                  <p className="text-[11px] text-slate-500 italic font-mono pl-1">Araç üzerinde aktif zimmet bulunmamaktadır.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {dists.filter(d => d.plaka !== "GARAJ").map(d => (
                                      <div key={d.plaka} className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                                        <span className="font-mono text-xs text-slate-400 font-bold">{d.plaka}</span>
                                        <span className="font-mono text-xs text-cyan-400 font-extrabold bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">{d.adet}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Master stock pivot table matrix (Excel layout) */}
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-950/40 border-b border-white/10 p-5 flex justify-between items-center flex-row">
                  <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2 tracking-tight">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    <span>Sivas İtfaiyesi Genel Stok Durumu</span>
                  </CardTitle>
                  <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-3 py-1 rounded-lg text-xs font-bold">
                    Genel Çeşitlilik: {filteredInventory.length} Kalem
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-800 relative">
                    <table className="w-full text-xs min-w-[1600px] border-collapse">
                      <thead className="bg-slate-950/90 text-xs text-slate-400 uppercase tracking-wider border-b border-white/10 font-mono sticky top-0 z-20 backdrop-blur-md">
                        <tr>
                          <th className="px-4 py-4 text-left font-semibold w-16 sticky left-0 bg-slate-950 z-30 border-r border-white/10">S.No</th>
                          <th className="px-4 py-4 text-left font-semibold min-w-[240px] sticky left-16 bg-slate-950 z-30 border-r border-white/10">Malzeme (Cinsi)</th>
                          {/* Dynamically mapped vehicles */}
                          {vehicleColumns.map(plaka => (
                            <th key={plaka} className="px-3 py-4 text-center font-semibold w-28 border-r border-white/5 whitespace-nowrap">
                              {renderPlateHeader(plaka)}
                            </th>
                          ))}
                          {/* Warehouse branches */}
                          <th className="px-3 py-4 text-center font-bold w-24 border-r border-white/5 bg-slate-900/40 text-slate-300">MERKEZ</th>
                          <th className="px-3 py-4 text-center font-bold w-24 border-r border-white/5 bg-slate-900/40 text-slate-300">ESENTEPE</th>
                          <th className="px-3 py-4 text-center font-bold w-24 border-r border-white/5 bg-slate-900/40 text-slate-300">ORGANİZE</th>
                          <th className="px-3 py-4 text-center font-bold w-24 border-r border-white/5 bg-slate-900/40 text-slate-300">DEPO</th>
                          <th className="px-4 py-4 text-right font-black w-32 bg-cyan-950/40 text-cyan-400 sticky right-0 z-30 border-l border-cyan-500/20">TOPLAM STOK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {filteredInventory.length === 0 ? (
                          <tr>
                            <td colSpan={vehicleColumns.length + 7} className="py-12 text-center text-slate-500 italic font-mono text-xs">
                              Gösterilecek malzeme cinsi bulunmamaktadır.
                            </td>
                          </tr>
                        ) : (
                          filteredInventory.map((item, idx) => {
                            // Find allocations for this specific row in inventory
                            const rowAllocations = allVehicleInventory.filter(vi => vi.inventory_id === item.id);
                            const vehicleCountMap: Record<string, number> = {};
                            rowAllocations.forEach(a => {
                              vehicleCountMap[a.plaka] = a.adet;
                            });

                            // Quantities sum of active vehicle columns (excluding GARAJ)
                            const activeVehicleSum = Object.entries(vehicleCountMap)
                              .filter(([plaka]) => plaka !== "GARAJ")
                              .reduce((sum, [_, val]) => sum + val, 0);

                            // Calculate dynamically verified absolute total
                            const liveTotal = (item.merkez || 0) + (item.esentepe || 0) + (item.organize || 0) + (item.depo || 0) + activeVehicleSum;

                            return (
                              <tr key={item.id} className="hover:bg-white/5 transition-colors duration-150 border-b border-white/5">
                                {/* Sticky columns */}
                                <td className="px-4 py-3 text-slate-400 font-mono text-xs sticky left-0 bg-slate-950/95 z-10 border-r border-white/10">{idx + 1}</td>
                                <td className="px-4 py-3 text-slate-100 font-bold text-sm sticky left-16 bg-slate-950/95 z-10 border-r border-white/10 truncate max-w-[240px]" title={item.malzeme_adi}>
                                  {item.malzeme_adi}
                                </td>
                                {/* Vehicle Cells */}
                                {vehicleColumns.map(plaka => {
                                  const qty = vehicleCountMap[plaka] || 0;
                                  return (
                                    <td 
                                      key={plaka} 
                                      className="px-3 py-3 text-center font-mono border-r border-white/5 align-middle"
                                    >
                                      {qty > 0 ? (
                                        <span className="inline-flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold px-2 py-0.5 rounded-md text-xs min-w-[24px]">
                                          {qty}
                                        </span>
                                      ) : (
                                        <span className="text-slate-700/40 select-none">·</span>
                                      )}
                                    </td>
                                  )
                                })}
                                {/* Branch Cells */}
                                <td className="px-3 py-3 text-center font-mono border-r border-white/5 bg-slate-900/20 align-middle">
                                  {item.merkez > 0 ? (
                                    <span className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold px-2 py-0.5 rounded-md text-xs min-w-[24px]">
                                      {item.merkez}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700/40 select-none">·</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center font-mono border-r border-white/5 bg-slate-900/20 align-middle">
                                  {item.esentepe > 0 ? (
                                    <span className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold px-2 py-0.5 rounded-md text-xs min-w-[24px]">
                                      {item.esentepe}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700/40 select-none">·</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center font-mono border-r border-white/5 bg-slate-900/20 align-middle">
                                  {item.organize > 0 ? (
                                    <span className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold px-2 py-0.5 rounded-md text-xs min-w-[24px]">
                                      {item.organize}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700/40 select-none">·</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center font-mono border-r border-white/5 bg-slate-900/20 align-middle">
                                  {item.depo > 0 ? (
                                    <span className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold px-2 py-0.5 rounded-md text-xs min-w-[24px]">
                                      {item.depo}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700/40 select-none">·</span>
                                  )}
                                </td>
                                {/* Sticky Dynamic Verified Total */}
                                <td className="px-4 py-3 text-right bg-cyan-950/20 sticky right-0 z-10 border-l border-cyan-500/20 align-middle">
                                  <span className="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-2.5 py-0.5 rounded-lg text-xs min-w-[28px]">
                                    {liveTotal}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* standalone Garaj Deposu list (Müstakil Rapor) */}
              <Card className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden mt-6">
                <CardHeader className="bg-slate-950/40 border-b border-white/10 p-5 flex justify-between items-center flex-row">
                  <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2 tracking-tight">
                    <Warehouse className="w-5 h-5 text-amber-500" />
                    <span>🏠 Garaj Deposu Zimmet Listesi (Müstakil Rapor)</span>
                  </CardTitle>
                  <span className="font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3 py-1 rounded-lg text-xs font-bold">
                    Toplam Çeşitlilik: {garajInventory.length} Kalem
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[40vh] scrollbar-thin scrollbar-thumb-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 font-mono sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="px-5 py-3.5 text-left font-semibold w-16">Sıra No</th>
                          <th className="px-5 py-3.5 text-left font-semibold">Malzeme Cinsi</th>
                          <th className="px-5 py-3.5 text-left font-semibold w-48">Bulunduğu Bölme / Detay</th>
                          <th className="px-5 py-3.5 text-right font-semibold w-32">Miktar (Adet)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {garajInventory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-slate-500 italic font-mono text-xs">
                              Garaj deposuna zimmetli herhangi bir malzeme bulunmamaktadır.
                            </td>
                          </tr>
                        ) : (
                          garajInventory.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors duration-150">
                              <td className="px-5 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                              <td className="px-5 py-3 text-slate-200 font-bold">{item.malzeme_adi}</td>
                              <td className="px-5 py-3 text-slate-400 font-mono text-xs">{item.bolme_kapak}</td>
                              <td className="px-5 py-3 text-right text-amber-400 font-mono font-bold text-sm">{item.adet}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

            </div>
          )
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
