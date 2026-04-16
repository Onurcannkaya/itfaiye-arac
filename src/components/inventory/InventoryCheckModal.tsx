"use client"
import { useState, useEffect } from "react"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Check, X, AlertTriangle, CheckCircle2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

export interface InventoryCheckModalProps {
  isOpen: boolean
  vehiclePlaka: string
  compartmentKey: string
  onClose: () => void
  onSave: (results: any) => void
}

export function InventoryCheckModal({ isOpen, vehiclePlaka, compartmentKey, onClose, onSave }: InventoryCheckModalProps) {
  const [items, setItems] = useState<any[]>([])
  
  // Load items when opened
  useEffect(() => {
    async function fetchInventory() {
      if (isOpen && vehiclePlaka && compartmentKey) {
        const supabase = createClient()
        const { data: vehicle } = await supabase.from('vehicles').select('bolmeler').eq('plaka', vehiclePlaka).single()
        
        if (vehicle && vehicle.bolmeler[compartmentKey]) {
          const initialItems = vehicle.bolmeler[compartmentKey].map((item: any) => ({
            ...item,
            checkStatus: item.durum === "Tam" ? "Tam" : undefined, 
            note: ""
          }))
          setItems(initialItems)
        }
      }
    }
    fetchInventory()
  }, [isOpen, vehiclePlaka, compartmentKey])

  const handleStatusChange = (index: number, status: string) => {
    const newItems = [...items]
    newItems[index].checkStatus = status
    if (status === "Tam") newItems[index].note = "" // Clear note if Tam
    setItems(newItems)
  }

  const handleNoteChange = (index: number, note: string) => {
    const newItems = [...items]
    newItems[index].note = note
    setItems(newItems)
  }

  const markAllComplete = () => {
    setItems(items.map(item => ({ ...item, checkStatus: "Tam", note: "" })))
  }

  const handleSave = () => {
    // Validate if all items are checked
    const unchecked = items.filter(i => !i.checkStatus).length
    if (unchecked > 0) {
      alert(`Lütfen tüm listeyi kontrol edin. İşaretlenmemiş ${unchecked} malzeme var.`)
      return
    }
    onSave(items)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 border-primary/20">
        <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/30">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Bölme Sayımı
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            <strong className="text-foreground">{vehiclePlaka}</strong> — {COMPARTMENT_NAMES[compartmentKey] || compartmentKey} içerisindeki malzemeleri kontrol edin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground font-medium">{items.length} Malzeme Listelendi</span>
            <Button variant="outline" size="sm" onClick={markAllComplete} className="h-8 text-xs bg-success/10 text-success border-success/30 hover:bg-success/20">
              <Check className="w-3.5 h-3.5 mr-1" /> Tümü Tamam
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-xl border transition-colors ${item.checkStatus === 'Tam' ? 'bg-success/5 border-success/30' : item.checkStatus ? 'bg-surface border-border' : 'bg-surface border-border/50'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.malzeme}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sistemde olması gereken: {item.adet} adet</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0 bg-muted/50 p-1 rounded-lg">
                    <button 
                      onClick={() => handleStatusChange(idx, "Tam")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${item.checkStatus === "Tam" ? "bg-success text-success-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <Check className="w-3.5 h-3.5" /> Tam
                    </button>
                    <button 
                      onClick={() => handleStatusChange(idx, "Eksik")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${item.checkStatus === "Eksik" ? "bg-danger text-danger-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <X className="w-3.5 h-3.5" /> Eksik
                    </button>
                    <button 
                      onClick={() => handleStatusChange(idx, "Arızalı")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${item.checkStatus === "Arızalı" ? "bg-warning text-warning-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Arızalı
                    </button>
                  </div>
                </div>

                {(item.checkStatus === "Eksik" || item.checkStatus === "Arızalı") && (
                  <div className="mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                    <Input 
                      placeholder="Neden eksik/arızalı? (Örn: Tamire gönderildi, Depoda unutuldu)"
                      value={item.note || ""}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-5 border-t border-border bg-muted/10">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">İptal</Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">Sayımı Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
