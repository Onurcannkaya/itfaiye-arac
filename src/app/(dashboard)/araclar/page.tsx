"use client"
import { useEffect, useState, useMemo } from "react"
import { api } from "@/lib/api"
import { VehicleCard } from "@/components/vehicle/VehicleCard"
import { QRLabelModal } from "@/components/vehicle/QRLabelModal"
import { VehicleEditModal } from "@/components/vehicle/VehicleEditModal"
import { VehicleAddModal } from "@/components/vehicle/VehicleAddModal"
import { useAuthStore } from "@/lib/authStore"
import { 
  PlusCircle, 
  RefreshCw, 
  Wrench, 
  Truck, 
  FileText, 
  Inbox, 
  Printer, 
  Loader2,
  Edit2,
  Trash2,
  Building2,
  MapPin
} from "lucide-react"
import { Vehicle } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import jsPDF from "jspdf"

interface MaintenanceLog {
  id?: string;
  vehicle_id: string;
  ariza_seviyesi: string;
  aciklama: string;
  bakim_notu?: string;
  durum: string;
  eski_sube: string;
  created_at?: string;
}

export default function VehiclesPage() {
  const [activeTab, setActiveTab] = useState<"active" | "maintenance">("active")
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const { user } = useAuthStore()

  // Faz 28.51: Müfreze Filtresi
  const [branchFilter, setBranchFilter] = useState<string>("Tümü")

  // Fault report modal states
  const [arizaModalOpen, setArizaModalOpen] = useState(false)
  const [reportingPlaka, setReportingPlaka] = useState<string | null>(null)
  const [arizaSeviyesi, setArizaSeviyesi] = useState("Kritik")
  const [arizaAciklama, setArizaAciklama] = useState("")
  const [savingAriza, setSavingAriza] = useState(false)

  // Return/Discharge modal states
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [dischargeItem, setDischargeItem] = useState<{ vehicle: Vehicle; log: MaintenanceLog } | null>(null)
  const [targetBranch, setTargetBranch] = useState("Merkez")
  const [returnNotes, setReturnNotes] = useState("")
  const [savingReturn, setSavingReturn] = useState(false)

  // Edit Log modal states
  const [editLogModalOpen, setEditLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null)
  const [editArizaSeviyesi, setEditArizaSeviyesi] = useState("Kritik")
  const [editAciklama, setEditAciklama] = useState("")
  const [editBakimNotu, setEditBakimNotu] = useState("")
  const [editDurum, setEditDurum] = useState("Bakımda")
  const [editEskiSube, setEditEskiSube] = useState("Merkez")
  const [savingLogEdit, setSavingLogEdit] = useState(false)

  // QR Label Modal state
  const [qrModal, setQrModal] = useState<{ open: boolean; plaka: string; aracTipi: string; marka: string }>({
    open: false,
    plaka: "",
    aracTipi: "",
    marka: "",
  })

  // Edit Modal state
  const [editModal, setEditModal] = useState<{ open: boolean; vehicle: Vehicle | null }>({
    open: false,
    vehicle: null,
  })

  // Add Modal state
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Faz 28.51: Şube Değiştir Modal state
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const [branchChangePlaka, setBranchChangePlaka] = useState<string | null>(null)
  const [newBranch, setNewBranch] = useState("Merkez")
  const [savingBranch, setSavingBranch] = useState(false)

  const fetchVehicles = async () => {
    setLoading(true)
    try {
      const { data } = await api.from('vehicles').select('*')
      const filtered = (data || []).filter((v: Vehicle) => v.plaka !== 'GARAJ')
      
      // Numaratik Sıralama Nizamı: filo_no ASC (küçükten büyüğe, tanımsızlar sonda)
      filtered.sort((a: Vehicle, b: Vehicle) => (a.filo_no || 999) - (b.filo_no || 999))
      setVehicles(filtered)
    } catch (err) {
      console.error("Araçlar yüklenirken hata:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaintenanceLogs = async () => {
    setLoadingLogs(true)
    try {
      const { data } = await api.from('maintenance_logs').select('*')
      if (data) {
        const sorted = [...data].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setMaintenanceLogs(sorted)
      } else {
        setMaintenanceLogs([])
      }
    } catch (err) {
      console.error("Bakım logları yüklenirken hata:", err)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
    fetchMaintenanceLogs()
  }, [])

  const canEdit = user?.rol !== 'User'

  // Turkish character encoding cleaning helper for jsPDF Helvetica font compatibility
  const cleanTurkishChars = (str: string): string => {
    if (!str) return "";
    const map: Record<string, string> = {
      'ş': 's', 'Ş': 'S',
      'ğ': 'g', 'Ğ': 'G',
      'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O',
      'ü': 'u', 'Ü': 'U',
      'ç': 'c', 'Ç': 'C'
    };
    return str.replace(/[şŞğĞıİöÖüÜçÇ]/g, m => map[m] || m);
  };

  const handleSaveAriza = async () => {
    if (!reportingPlaka) return;
    if (!arizaAciklama.trim()) {
      alert("Lütfen arıza açıklamasını girin.");
      return;
    }

    try {
      setSavingAriza(true);
      const targetVehicle = vehicles.find(v => v.plaka === reportingPlaka);
      if (!targetVehicle) {
        alert("Araç bulunamadı.");
        return;
      }

      // 1. Insert into maintenance_logs
      const logData = {
        vehicle_id: targetVehicle.id,
        plaka: targetVehicle.plaka,
        tip: targetVehicle.arac_tipi || targetVehicle.aracTipi || 'İtfaiye Aracı',
        aciklama: arizaAciklama.trim(),
        tarih: new Date().toISOString().split('T')[0],
        yapanKisi: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
        ariza_seviyesi: arizaSeviyesi,
        durum: 'Bakımda',
        eski_sube: targetVehicle.current_branch || 'Merkez',
        bildiren_personel_id: null,
        created_at: new Date().toISOString()
      };
      
      const resLog = await api.insert('maintenance_logs', logData);
      if (resLog.error) throw new Error(resLog.error);

      // 2. Update vehicle's current_branch and status
      const resVeh = await api.update(
        'vehicles',
        { 
          current_branch: 'Makine İkmal Müdürlüğü (Bakım-Onarım)', 
          durum: 'arizali' 
        },
        { id: targetVehicle.id }
      );
      if (resVeh.error) throw new Error(resVeh.error);

      // Audit Log
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'ariza_bildirim',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: reportingPlaka,
          details: {
            ariza_seviyesi: arizaSeviyesi,
            aciklama: arizaAciklama.trim(),
            eski_sube: targetVehicle.current_branch || 'Merkez',
          },
        }),
      }).catch(err => console.error('[AuditLog] Arıza logu gönderilemedi:', err));

      alert("Arıza başarıyla bildirildi. Araç Makine İkmal Müdürlüğü (Bakım-Onarım) şubesine sevk edildi.");
      setArizaModalOpen(false);
      setArizaAciklama("");
      setArizaSeviyesi("Kritik");
      setReportingPlaka(null);
      fetchVehicles();
      fetchMaintenanceLogs();
    } catch (err: any) {
      console.error(err);
      alert("Arıza bildirilirken hata oluştu: " + err.message);
    } finally {
      setSavingAriza(false);
    }
  };

  const handleOpenReturnModal = (item: { vehicle: Vehicle; log: MaintenanceLog }) => {
    setDischargeItem(item);
    setTargetBranch(item.log?.eski_sube || "Merkez");
    setReturnNotes("");
    setReturnModalOpen(true);
  };

  const handleSaveReturn = async () => {
    if (!dischargeItem) return;
    
    try {
      setSavingReturn(true);
      const { vehicle, log } = dischargeItem;
      
      // 1. Update vehicle current_branch to targetBranch and status back to 'aktif'
      const resVeh = await api.update(
        'vehicles',
        { current_branch: targetBranch, durum: 'aktif' },
        { id: vehicle.id }
      );
      if (resVeh.error) throw new Error(resVeh.error);

      // 2. Update maintenance_log status to 'Taburcu Edildi'
      if (log && log.id) {
        const resLog = await api.update(
          'maintenance_logs',
          { durum: 'Taburcu Edildi', bakim_notu: returnNotes.trim() },
          { id: log.id }
        );
        if (resLog.error) throw new Error(resLog.error);
      }

      // Audit Log
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'ariza_taburcu',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: vehicle.plaka,
          details: {
            hedef_sube: targetBranch,
            bakim_notu: returnNotes.trim(),
          },
        }),
      }).catch(err => console.error('[AuditLog] Taburcu logu gönderilemedi:', err));

      alert(`${vehicle.plaka} başarıyla taburcu edildi ve ${targetBranch} şubesine sevk edildi.`);
      setReturnModalOpen(false);
      setDischargeItem(null);
      setReturnNotes("");
      setTargetBranch("Merkez");
      fetchVehicles();
      fetchMaintenanceLogs();
    } catch (err: any) {
      console.error(err);
      alert("Araç taburcu edilirken hata oluştu: " + err.message);
    } finally {
      setSavingReturn(false);
    }
  };

  const handleOpenEditLogModal = (item: { vehicle: Vehicle; log: MaintenanceLog }) => {
    setEditingLog(item.log);
    setEditArizaSeviyesi(item.log.ariza_seviyesi || "Kritik");
    setEditAciklama(item.log.aciklama || "");
    setEditBakimNotu(item.log.bakim_notu || "");
    setEditDurum(item.log.durum || "Bakımda");
    setEditEskiSube(item.log.eski_sube || "Merkez");
    setEditLogModalOpen(true);
  };

  const handleSaveLogEdit = async () => {
    if (!editingLog) return;
    if (!editAciklama.trim()) {
      alert("Lütfen arıza açıklamasını girin.");
      return;
    }
    
    try {
      setSavingLogEdit(true);
      
      const updates = {
        ariza_seviyesi: editArizaSeviyesi,
        aciklama: editAciklama.trim(),
        bakim_notu: editBakimNotu.trim(),
        durum: editDurum,
        eski_sube: editEskiSube
      };
      
      const resLog = await api.update('maintenance_logs', updates, { id: editingLog.id });
      if (resLog.error) throw new Error(resLog.error);
      
      // If durum changed, align vehicle status
      if (editDurum !== editingLog.durum) {
        const vehicle = vehicles.find(v => v.id === editingLog.vehicle_id);
        if (vehicle) {
          if (editDurum === 'Taburcu Edildi') {
            await api.update(
              'vehicles',
              { current_branch: editEskiSube, durum: 'aktif' },
              { id: vehicle.id }
            );
          } else if (editDurum === 'Bakımda') {
            await api.update(
              'vehicles',
              { current_branch: 'Makine İkmal Müdürlüğü (Bakım-Onarım)', durum: 'arizali' },
              { id: vehicle.id }
            );
          }
        }
      }
      
      alert("Arıza kaydı başarıyla güncellendi.");
      setEditLogModalOpen(false);
      setEditingLog(null);
      fetchVehicles();
      fetchMaintenanceLogs();
    } catch (err: any) {
      console.error(err);
      alert("Kayıt güncellenirken hata oluştu: " + err.message);
    } finally {
      setSavingLogEdit(false);
    }
  };

  const handleDeleteLog = async (log: MaintenanceLog) => {
    if (!confirm("Bu arıza kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    
    try {
      const resDel = await api.remove('maintenance_logs', { id: log.id });
      if (resDel.error) throw new Error(resDel.error);
      
      // If deleted log was active (Bakımda), restore vehicle to active branch
      if (log.durum === 'Bakımda') {
        const vehicle = vehicles.find(v => v.id === log.vehicle_id);
        if (vehicle) {
          const resVeh = await api.update(
            'vehicles',
            { current_branch: log.eski_sube || 'Merkez', durum: 'aktif' },
            { id: vehicle.id }
          );
          if (resVeh.error) throw new Error(resVeh.error);
        }
      }
      
      alert("Arıza kaydı başarıyla silindi.");
      fetchVehicles();
      fetchMaintenanceLogs();
    } catch (err: any) {
      console.error(err);
      alert("Kayıt silinirken hata oluştu: " + err.message);
    }
  };
  // Faz 28.51: Şube Değiştir Handler
  const handleSaveBranchChange = async () => {
    if (!branchChangePlaka) return;

    try {
      setSavingBranch(true);
      const targetVehicle = vehicles.find(v => v.plaka === branchChangePlaka);
      if (!targetVehicle) {
        alert("Araç bulunamadı.");
        return;
      }

      const oldBranch = targetVehicle.current_branch || 'Merkez';
      if (newBranch === oldBranch) {
        alert("Araç zaten bu şubede kayıtlı.");
        return;
      }

      const resVeh = await api.update(
        'vehicles',
        { current_branch: newBranch },
        { id: targetVehicle.id }
      );
      if (resVeh.error) throw new Error(resVeh.error);

      // Audit Log
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'sube_degisiklik',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: branchChangePlaka,
          details: {
            eski_sube: oldBranch,
            yeni_sube: newBranch,
          },
        }),
      }).catch(err => console.error('[AuditLog] Şube değişiklik logu gönderilemedi:', err));

      alert(`${branchChangePlaka} başarıyla "${newBranch}" şubesine atandı.`);
      setBranchModalOpen(false);
      setBranchChangePlaka(null);
      setNewBranch("Merkez");
      fetchVehicles();
    } catch (err: any) {
      console.error(err);
      alert("Şube değiştirilirken hata oluştu: " + err.message);
    } finally {
      setSavingBranch(false);
    }
  };

  const handlePrintServiceForm = (item: { vehicle: Vehicle; log: MaintenanceLog }) => {
    const { vehicle, log } = item;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const clean = cleanTurkishChars;

    // Double Border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.7);
    doc.rect(10, 10, 190, 277);
    
    doc.setLineWidth(0.3);
    doc.rect(11.5, 11.5, 187, 274);

    // Header logo & text area
    doc.setLineWidth(0.5);
    doc.line(15, 42, 195, 42);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(clean("SİVAS BELEDİYE BAŞKANLIĞI"), 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(clean("İtfaiye Müdürlüğü"), 105, 26, { align: "center" });
    doc.setFontSize(14);
    doc.text(clean("ARAÇ BAKIM VE SERVİS TALEP FORMU"), 105, 36, { align: "center" });

    // Document Details Table / Fields
    let y = 50;
    const drawRow = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(clean(label) + ":", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(clean(value), 65, y);
      y += 8;
    };

    const plaka = vehicle.plaka || "—";
    const typeStr = vehicle.arac_tipi || vehicle.aracTipi || "—";
    const filo = vehicle.filo_no ? String(vehicle.filo_no) : "—";
    const markaModel = `${vehicle.marka || ""} / ${vehicle.model || vehicle.aciklama || ""}`;
    const arizaSeviyesi = log?.ariza_seviyesi || "Kritik";
    const girisTarihi = log?.created_at ? new Date(log.created_at).toLocaleString("tr-TR") : new Date().toLocaleString("tr-TR");

    drawRow("Araç Plakası", plaka);
    drawRow("Araç Tipi / Filo No", `${typeStr} (Filo No: ${filo})`);
    drawRow("Marka / Model", markaModel);
    drawRow("Arıza Seviyesi", arizaSeviyesi);
    drawRow("Giriş Tarihi / Saat", girisTarihi);

    // Fault description multi-line box
    doc.setFont("helvetica", "bold");
    doc.text(clean("Arıza / Bakım Açıklaması:"), 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    
    const splitText = doc.splitTextToSize(clean(log?.aciklama || "Açıklama girilmemiş."), 165);
    doc.text(splitText, 20, y);
    
    y += splitText.length * 5 + 10;
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;

    // Directives Section
    doc.setFont("helvetica", "bold");
    doc.text(clean("MAKİNE İKMAL MÜDÜRLÜĞÜ İNCELEME NOTLARI:"), 20, y);
    y += 8;
    
    // Draw an empty box for physical notes
    doc.setDrawColor(180, 180, 180);
    doc.rect(20, y, 170, 40);
    
    y += 50;

    // Signatures Section
    const imzaY = y + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    
    doc.text(clean("TESLİM EDEN"), 45, imzaY, { align: "center" });
    doc.text(clean("İstasyon Amiri / Personel"), 45, imzaY + 5, { align: "center" });
    
    doc.text(clean("TESLİM ALAN"), 150, imzaY, { align: "center" });
    doc.text(clean("Makine İkmal Yetkilisi"), 150, imzaY + 5, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.text("İmza: ........................", 45, imzaY + 20, { align: "center" });
    doc.text("İmza: ........................", 150, imzaY + 20, { align: "center" });

    doc.save(`Servis_Talep_Formu_${plaka.replace(/\s+/g, "_")}.pdf`);
  };

  // Filter vehicles by tab
  const activeVehicles = useMemo(() => {
    return vehicles.filter(v => v.current_branch !== 'Makine İkmal Müdürlüğü (Bakım-Onarım)')
  }, [vehicles])

  // Faz 28.51: Müfreze filtresine göre aktif araçları filtrele
  const filteredActiveVehicles = useMemo(() => {
    if (branchFilter === 'Tümü') return activeVehicles;
    return activeVehicles.filter(v => v.current_branch === branchFilter)
  }, [activeVehicles, branchFilter])

  // Faz 28.51: Şube bazlı araç sayıları
  const branchCounts = useMemo(() => {
    return {
      Merkez: activeVehicles.filter(v => v.current_branch === 'Merkez' || !v.current_branch).length,
      Esentepe: activeVehicles.filter(v => v.current_branch === 'Esentepe').length,
      'OSB (Organize)': activeVehicles.filter(v => v.current_branch === 'OSB (Organize)').length,
    }
  }, [activeVehicles])

  const maintenanceVehicles = useMemo(() => {
    return vehicles.filter(v => v.current_branch === 'Makine İkmal Müdürlüğü (Bakım-Onarım)')
  }, [vehicles])

  const renderPlateHeader = (plaka: string) => {
    const isPlate = plaka.match(/(58\s+[A-Z]+\s+\d+)/i);
    if (!isPlate) return <span className="font-bold tracking-tight text-slate-350 font-sans">{plaka}</span>;
    return (
      <div className="inline-flex items-center border border-slate-700/60 rounded bg-slate-900 overflow-hidden text-[10px] font-mono leading-none shadow-[0_2px_5px_rgba(0,0,0,0.4)] border-b-2 border-slate-950">
        <span className="bg-blue-600 text-white px-1 py-1 text-[8px] font-black select-none">TR</span>
        <span className="px-1.5 py-1 text-slate-100 font-black tracking-tight whitespace-nowrap">{plaka}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-100">Araçlar ve Envanter</h1>
          <p className="text-muted-foreground mt-1 text-sm">İstasyondaki aktif araçların listesi, taktik kodları ve anlık envanter durumları.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={() => { fetchVehicles(); fetchMaintenanceLogs(); }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center animate-none"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {canEdit && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2.5 bg-slate-950 border border-emerald-500/40 hover:border-cyan-500/60 text-emerald-400 hover:text-cyan-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_-3px_rgba(34,211,238,0.4)] transition-all duration-300 font-extrabold rounded-xl flex items-center gap-2 text-xs md:text-sm active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <PlusCircle className="w-4 h-4 md:w-5 h-5" />
              <span>Yeni Araç Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Selection Row */}
      <div className="flex gap-2 p-1 bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/5 self-start print:hidden">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === "active" ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Truck className="w-4 h-4" />
          <span>🚒 Aktif Görev Filosu ({activeVehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === "maintenance" ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Wrench className="w-4 h-4" />
          <span>🔧 Makine İkmal / Arıza Havuzu ({maintenanceVehicles.length})</span>
        </button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400">Taktik araçlar yükleniyor...</p>
        </div>
      ) : activeTab === "active" ? (
        /* ════════════════ TAB 1: AKTİF GÖREV FİLOSU ════════════════ */
        <>
          {/* Faz 28.51: Müfreze Filtre Barı */}
          <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
            {[
              { key: 'Tümü', label: '🏢 Tümü', count: activeVehicles.length },
              { key: 'Merkez', label: '📍 Merkez', count: branchCounts.Merkez },
              { key: 'Esentepe', label: '📍 Esentepe', count: branchCounts.Esentepe },
              { key: 'OSB (Organize)', label: '📍 OSB', count: branchCounts['OSB (Organize)'] },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setBranchFilter(item.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  branchFilter === item.key
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
                    : 'bg-slate-900/50 text-slate-400 border border-white/5 hover:text-slate-200 hover:border-white/10'
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                  branchFilter === item.key
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {filteredActiveVehicles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-3xl bg-slate-900/20">
              {branchFilter === 'Tümü'
                ? 'Aktif görevde olan araç bulunmamaktadır.'
                : `"${branchFilter}" şubesinde aktif araç bulunmamaktadır.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredActiveVehicles.map(v => (
                <VehicleCard
                  key={v.plaka}
                  vehicle={v}
                  onPrintQR={(plaka, aracTipi, marka) => setQrModal({ open: true, plaka, aracTipi, marka: marka || "" })}
                  onEdit={canEdit ? (vehicle) => setEditModal({ open: true, vehicle }) : undefined}
                  onReportFault={(plaka) => {
                    setReportingPlaka(plaka);
                    setArizaModalOpen(true);
                  }}
                  onChangeBranch={canEdit ? (plaka) => {
                    const targetVehicle = vehicles.find(veh => veh.plaka === plaka);
                    setBranchChangePlaka(plaka);
                    setNewBranch(targetVehicle?.current_branch || 'Merkez');
                    setBranchModalOpen(true);
                  } : undefined}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ════════════════ TAB 2: MAKİNE İKMAL / ARIZA HAVUZU ════════════════ */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header info */}
          <div className="flex justify-between items-center bg-slate-900/35 border border-slate-800/85 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Makine İkmal Müdürlüğü Bakım Havuzu</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Şu anda serviste/bakımda olan ve vaka sevkine kapatılmış aktif itfaiye araçlarının lojistik takibi.
              </p>
            </div>
            <div className="font-mono bg-orange-500/10 text-orange-400 border border-orange-500/25 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
              Bakımdaki Araç: {maintenanceVehicles.length} Adet
            </div>
          </div>

          {/* Cards for Maintenance Vehicles */}
          {maintenanceVehicles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Bakımdaki Araç Kartları</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {maintenanceVehicles.map(v => (
                  <VehicleCard
                    key={v.plaka}
                    vehicle={v}
                    onPrintQR={(plaka, aracTipi, marka) => setQrModal({ open: true, plaka, aracTipi, marka: marka || "" })}
                    onEdit={canEdit ? (vehicle) => setEditModal({ open: true, vehicle }) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Table of Maintenance Logs */}
          <Card className="bg-slate-950/75 border border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden mt-6">
            <CardHeader className="bg-slate-950/40 border-b border-white/10 p-5 flex justify-between items-center flex-row">
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>Tüm Arıza ve Servis Takip Kayıtları</span>
              </CardTitle>
              <button 
                onClick={fetchMaintenanceLogs}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-white/5"
                title="Yenile"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-slate-500 font-mono text-xs">Bakım havuzu listesi güncelleniyor...</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 font-mono">
                      <tr>
                        <th className="px-5 py-3.5 text-left font-semibold">ARAÇ BİLGİSİ</th>
                        <th className="px-5 py-3.5 text-left font-semibold">ARIZA SEVİYESİ</th>
                        <th className="px-5 py-3.5 text-left font-semibold">ARIZA / BAKIM DETAYI</th>
                        <th className="px-5 py-3.5 text-center font-semibold w-36">SEVK TARİHİ</th>
                        <th className="px-5 py-3.5 text-center font-semibold w-36">ÖNCEKİ ŞUBESİ</th>
                        <th className="px-5 py-3.5 text-center font-semibold w-36">DURUM</th>
                        <th className="px-5 py-3.5 text-center font-semibold w-64">İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {maintenanceLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500 italic font-mono text-xs">
                            Kayıt bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        maintenanceLogs.map((log) => {
                          const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                          if (!vehicle) return null;
                          const isCritical = log.ariza_seviyesi === 'Kritik';
                          const isBakimda = log.durum === 'Bakımda';
                          
                          return (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors duration-150">
                              
                              {/* Araç Plaka & Filo */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  {renderPlateHeader(vehicle.plaka)}
                                  <div className="flex flex-col">
                                    <span className="text-slate-300 text-xs font-bold">
                                      {vehicle.filo_no ? `${vehicle.filo_no} No` : 'Filo No Yok'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {vehicle.aciklama || 'Çağrı adı girilmemiş'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Arıza Seviyesi */}
                              <td className="px-5 py-4 align-middle">
                                <Badge 
                                  className={`font-black font-mono text-[9px] px-2.5 py-1 rounded-md ${
                                    isCritical 
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/25' 
                                      : log.ariza_seviyesi === 'Orta' 
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/25'
                                  }`}
                                >
                                  {log.ariza_seviyesi}
                                </Badge>
                              </td>

                              {/* Arıza Açıklaması */}
                              <td className="px-5 py-4 max-w-[280px] truncate align-middle text-slate-300" title={log.aciklama}>
                                {log.aciklama}
                              </td>

                              {/* Sevk Tarihi */}
                              <td className="px-5 py-4 text-center font-mono text-xs text-slate-400 align-middle">
                                {log.created_at ? new Date(log.created_at).toLocaleDateString("tr-TR") : '—'}
                              </td>

                              {/* Önceki Şubesi */}
                              <td className="px-5 py-4 text-center font-mono text-xs text-slate-400 align-middle">
                                {log.eski_sube || '—'}
                              </td>

                              {/* Durum */}
                              <td className="px-5 py-4 text-center align-middle">
                                <Badge 
                                  className={`font-bold text-[9px] px-2 py-0.5 rounded-md ${
                                    isBakimda 
                                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25 animate-pulse' 
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                  }`}
                                >
                                  {log.durum}
                                </Badge>
                              </td>

                              {/* İşlemler */}
                              <td className="px-5 py-4 text-center align-middle font-sans">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handlePrintServiceForm({ vehicle, log })}
                                    className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all min-h-[36px] cursor-pointer"
                                    title="Servis Formu (PDF) İndir"
                                  >
                                    <Printer className="w-4 h-4 text-orange-400" />
                                    Servis Formu
                                  </button>
                                  {isBakimda && canEdit && (
                                    <button
                                      onClick={() => handleOpenReturnModal({ vehicle, log })}
                                      className="h-9 px-3 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center justify-center gap-1.5 text-xs font-black transition-all min-h-[36px] cursor-pointer"
                                      title="Göreve İade Et / Taburcu Et"
                                    >
                                      <Inbox className="w-4 h-4 text-emerald-400" />
                                      Taburcu Et
                                    </button>
                                  )}
                                  {canEdit && (
                                    <>
                                      <button
                                        onClick={() => handleOpenEditLogModal({ vehicle, log })}
                                        className="h-9 w-9 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                                        title="Kaydı Düzenle"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLog(log)}
                                        className="h-9 w-9 bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                                        title="Kaydı Sil"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>

                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- Arıza Bildirim Modalı --- */}
      <Dialog open={arizaModalOpen} onOpenChange={setArizaModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800/80 shadow-[0_0_30px_rgba(249,115,22,0.15)] text-slate-100 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-orange-500">
              <span>⚠️ Araç Arıza Bildirim Formu</span>
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-1">
              Bu form ile arızalı aracı bakım-onarım havuzuna alabilir ve servis talep fişi oluşturabilirsiniz.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-4 font-sans text-sm">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">BİLDİRİM YAPILAN ARAÇ</span>
              <p className="font-bold text-slate-200 mt-0.5">{reportingPlaka || ""}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">ARIZA SEVİYESİ</label>
              <select
                value={arizaSeviyesi}
                onChange={(e) => setArizaSeviyesi(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
              >
                <option value="Hafif">Hafif (Göreve Engel Değil)</option>
                <option value="Orta">Orta (Kısmi Engel / Gözetim)</option>
                <option value="Kritik">Kritik (Görev Dışı - Makine İkmal Sevk)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">ARIZA AÇIKLAMASI</label>
              <textarea
                placeholder="Arıza detaylarını, belirtilerini ve tespitleri buraya yazın..."
                value={arizaAciklama}
                onChange={(e) => setArizaAciklama(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 font-sans">
            <Button variant="outline" onClick={() => setArizaModalOpen(false)} className="w-full sm:w-auto border-white/10 bg-slate-900 text-slate-200">
              İptal
            </Button>
            <Button onClick={handleSaveAriza} disabled={savingAriza} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              {savingAriza ? "Kaydediliyor..." : "Arıza Kaydını Aç"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Taburcu Etme (Eski şubesine geri atama) Modalı --- */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800/80 shadow-[0_0_30px_rgba(16,185,129,0.15)] text-slate-100 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <span>🔧 Araç Bakım Taburcu Formu</span>
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-1">
              Bakımı biten aracı aktif şubelerden birine sevk ederek göreve iade edebilirsiniz.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-4 font-sans text-sm">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">TABURCU EDİLEN ARAÇ</span>
              <p className="font-bold text-slate-200 mt-0.5">{dischargeItem?.vehicle?.plaka || ""}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">SEVK EDİLECEK ŞUBE</label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
              >
                <option value="Merkez">Merkez Şubesi</option>
                <option value="Esentepe">Esentepe Şubesi</option>
                <option value="OSB (Organize)">Organize Sanayi Şubesi</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">BAKIM & ONARIM NOTLARI</label>
              <textarea
                placeholder="Yapılan işlemler, değişen parçalar ve teknik notları buraya yazın..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 font-sans">
            <Button variant="outline" onClick={() => setReturnModalOpen(false)} className="w-full sm:w-auto border-white/10 bg-slate-900 text-slate-200">
              İptal
            </Button>
            <Button onClick={handleSaveReturn} disabled={savingReturn} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {savingReturn ? "Kaydediliyor..." : "Taburcu Et & Aktif Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Arıza Kaydı Düzenleme Modalı --- */}
      <Dialog open={editLogModalOpen} onOpenChange={setEditLogModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800/80 shadow-[0_0_30px_rgba(59,130,246,0.15)] text-slate-100 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-400">
              <span>✏️ Arıza Kaydı Düzenleme</span>
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-1">
              Yanlış girilmiş arıza takip kayıtlarını bu modal üzerinden güncelleyebilirsiniz.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-4 font-sans text-sm">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">ARIZA SEVİYESİ</label>
              <select
                value={editArizaSeviyesi}
                onChange={(e) => setEditArizaSeviyesi(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="Hafif">Hafif (Göreve Engel Değil)</option>
                <option value="Orta">Orta (Kısmi Engel / Gözetim)</option>
                <option value="Kritik">Kritik (Görev Dışı - Makine İkmal Sevk)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">DURUM</label>
              <select
                value={editDurum}
                onChange={(e) => setEditDurum(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="Bakımda">Bakımda</option>
                <option value="Taburcu Edildi">Taburcu Edildi</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">ÖNCEKİ / ASIL ŞUBESİ</label>
              <select
                value={editEskiSube}
                onChange={(e) => setEditEskiSube(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="Merkez">Merkez Şubesi</option>
                <option value="Esentepe">Esentepe Şubesi</option>
                <option value="OSB (Organize)">Organize Sanayi Şubesi</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">ARIZA AÇIKLAMASI</label>
              <textarea
                placeholder="Arıza detayları..."
                value={editAciklama}
                onChange={(e) => setEditAciklama(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">BAKIM & TAMİR NOTLARI</label>
              <textarea
                placeholder="Yapılan işlemler, teknik notlar..."
                value={editBakimNotu}
                onChange={(e) => setEditBakimNotu(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 font-sans">
            <Button variant="outline" onClick={() => setEditLogModalOpen(false)} className="w-full sm:w-auto border-white/10 bg-slate-900 text-slate-200">
              İptal
            </Button>
            <Button onClick={handleSaveLogEdit} disabled={savingLogEdit} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              {savingLogEdit ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Faz 28.51: Şube Değiştir Modalı --- */}
      <Dialog open={branchModalOpen} onOpenChange={setBranchModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800/80 shadow-[0_0_30px_rgba(34,211,238,0.15)] text-slate-100 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-cyan-400">
              <span>📍 Araç Şube Değiştirme</span>
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-1">
              Seçili aracı farklı bir müfrezeye/şubeye atayabilirsiniz. Bu işlem araç konuşlanma bilgilerini günceller.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-4 font-sans text-sm">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">ŞUBE DEĞİŞTİRİLEN ARAÇ</span>
              <p className="font-bold text-slate-200 mt-0.5">{branchChangePlaka || ""}</p>
              {branchChangePlaka && (() => {
                const v = vehicles.find(veh => veh.plaka === branchChangePlaka);
                return v ? (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Mevcut Şube: <span className="text-cyan-400 font-bold">{v.current_branch || 'Merkez'}</span>
                  </p>
                ) : null;
              })()}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">YENİ ŞUBE</label>
              <select
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="Merkez">Merkez Şubesi</option>
                <option value="Esentepe">Esentepe Şubesi</option>
                <option value="OSB (Organize)">Organize Sanayi Şubesi</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 font-sans">
            <Button variant="outline" onClick={() => setBranchModalOpen(false)} className="w-full sm:w-auto border-white/10 bg-slate-900 text-slate-200">
              İptal
            </Button>
            <Button onClick={handleSaveBranchChange} disabled={savingBranch} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              {savingBranch ? "Kaydediliyor..." : "Şubeyi Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Label Print Modal */}
      <QRLabelModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, plaka: "", aracTipi: "", marka: "" })}
        plaka={qrModal.plaka}
        aracTipi={qrModal.aracTipi}
        marka={qrModal.marka}
      />

      {/* Edit Modal */}
      <VehicleEditModal
        isOpen={editModal.open}
        vehicle={editModal.vehicle}
        onClose={() => setEditModal({ open: false, vehicle: null })}
        onSuccess={() => {
          setEditModal({ open: false, vehicle: null })
          fetchVehicles()
        }}
      />

      {/* Add Modal */}
      <VehicleAddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false)
          fetchVehicles()
        }}
      />

      {/* Mobil Alt Bar Maskeleme Kalkanı - Spacer */}
      <div 
        className="w-full block md:hidden pointer-events-none clear-both" 
        style={{ height: 'calc(7rem + env(safe-area-inset-bottom))' }} 
        aria-hidden="true" 
      />
    </div>
  )
}
