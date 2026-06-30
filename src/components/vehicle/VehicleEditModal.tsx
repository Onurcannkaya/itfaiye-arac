"use client"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Loader2, X, AlertTriangle, Truck, Save } from "lucide-react"

interface VehicleEditModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: any
  onSuccess: () => void
}

export function VehicleEditModal({ isOpen, onClose, vehicle, onSuccess }: VehicleEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    arac_tipi: "",
    marka: "",
    durum: "",
    sigortaBitis: "",
    muayeneBitis: "",
    km: "",
    motorSaatiPTO: "",
    filo_no: "",
    aciklama: "",
  })

  useEffect(() => {
    if (vehicle) {
      setFormData({
        arac_tipi: vehicle.arac_tipi || "",
        marka: vehicle.marka || "",
        durum: vehicle.durum || "aktif",
        sigortaBitis: vehicle.sigortaBitis ? new Date(vehicle.sigortaBitis).toISOString().split('T')[0] : "",
        muayeneBitis: vehicle.muayeneBitis ? new Date(vehicle.muayeneBitis).toISOString().split('T')[0] : "",
        km: vehicle.km?.toString() || "0",
        motorSaatiPTO: vehicle.motorSaatiPTO?.toString() || "0",
        filo_no: vehicle.filo_no?.toString() || "",
        aciklama: vehicle.aciklama || "",
      })
    }
  }, [vehicle, isOpen])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updates = {
        arac_tipi: formData.arac_tipi,
        marka: formData.marka,
        durum: formData.durum,
        sigortaBitis: formData.sigortaBitis || null,
        muayeneBitis: formData.muayeneBitis || null,
        km: parseInt(formData.km, 10) || 0,
        motorSaatiPTO: parseInt(formData.motorSaatiPTO, 10) || 0,
        filo_no: formData.filo_no ? parseInt(formData.filo_no, 10) : null,
        aciklama: formData.aciklama || null,
      }

      const { error: updErr } = await api.update('vehicles', updates, { plaka: vehicle.plaka })

      if (updErr) throw updErr

      onSuccess()
    } catch (err: any) {
      console.error(err)
      setError("Kaydetme işlemi başarısız: " + (err.message || ""))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !vehicle) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[var(--fd-surface)] border border-[var(--fd-border)] w-full max-w-lg rounded-2xl shadow-[var(--fd-shadow-lg)] animate-in slide-in-from-bottom-4 zoom-in-95 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--fd-border)]/50 bg-[var(--fd-surface2)]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--fd-accent)]/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-[var(--fd-accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--fd-text)]">Araç Düzenle</h2>
              <p className="text-sm text-[var(--fd-text3)] font-mono">{vehicle.plaka}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--fd-text3)] hover:text-[var(--fd-text)] bg-[var(--fd-surface2)] hover:bg-[var(--fd-surface3)] transition-colors border-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-[var(--fd-text)]">
          {error && (
            <div className="p-3 bg-[var(--fd-danger)]/10 border border-[var(--fd-danger)]/20 rounded-xl text-[var(--fd-danger)] text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)]">Filo Numarası</label>
              <Input type="number" value={formData.filo_no} onChange={e => setFormData({...formData, filo_no: e.target.value})} placeholder="Örn: 3" className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)]">Açıklama / Çağrı Adı</label>
              <Input value={formData.aciklama} onChange={e => setFormData({...formData, aciklama: e.target.value})} placeholder="Örn: Ford Kargo Merdiven" className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)]">Araç Tipi</label>
              <Input value={formData.arac_tipi} onChange={e => setFormData({...formData, arac_tipi: e.target.value})} placeholder="Örn: Arazöz" className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)]">Marka</label>
              <Input value={formData.marka} onChange={e => setFormData({...formData, marka: e.target.value})} placeholder="Örn: Mercedes" className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)]">Kilometre</label>
              <Input type="number" value={formData.km} onChange={e => setFormData({...formData, km: e.target.value})} className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fd-text3)]">Motor / PTO Saati</label>
              <Input type="number" value={formData.motorSaatiPTO} onChange={e => setFormData({...formData, motorSaatiPTO: e.target.value})} className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fd-text3)]">Durum</label>
            <select 
              className="w-full h-10 px-3 py-2 rounded-xl border border-[var(--fd-border)] bg-[var(--fd-surface2)] text-sm text-[var(--fd-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fd-accent)]/50 cursor-pointer"
              value={formData.durum} 
              onChange={e => setFormData({...formData, durum: e.target.value})}
            >
              <option value="aktif" className="bg-[var(--fd-surface)] text-[var(--fd-text)]">Aktif</option>
              <option value="arizali" className="bg-[var(--fd-surface)] text-[var(--fd-text)]">Arızalı</option>
              <option value="bakimda" className="bg-[var(--fd-surface)] text-[var(--fd-text)]">Bakımda</option>
              <option value="gorevde" className="bg-[var(--fd-surface)] text-[var(--fd-text)]">Görevde</option>
            </select>
          </div>

          <div className="border-t border-[var(--fd-border)]/50 pt-4 mt-2">
            <div className="text-sm font-bold text-[var(--fd-text)] mb-3 flex items-center gap-2">
              <Badge variant="outline" className="px-1.5 py-0 border-[var(--fd-accent)]/30 bg-[var(--fd-accent)]/5 text-[var(--fd-accent)]">Önemli</Badge> Belge Geçerlilik Tarihleri
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--fd-text3)]">Sigorta Bitiş</label>
                <Input type="date" value={formData.sigortaBitis} onChange={e => setFormData({...formData, sigortaBitis: e.target.value})} className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--fd-text3)]">Muayene Bitiş</label>
                <Input type="date" value={formData.muayeneBitis} onChange={e => setFormData({...formData, muayeneBitis: e.target.value})} className="bg-[var(--fd-surface2)] border-[var(--fd-border)] text-[var(--fd-text)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--fd-border)]/50 bg-[var(--fd-surface2)]/40 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)] hover:text-[var(--fd-text)] hover:bg-[var(--fd-surface3)]"
          >
            İptal
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="rounded-xl font-semibold bg-[var(--fd-accent)] hover:opacity-90 text-white shadow-[0_0_10px_var(--fd-accent-glow)] border-0 gap-2 px-5 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  )
}
