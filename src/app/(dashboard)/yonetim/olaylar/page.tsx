"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { 
  AlertCircle, FileText, Clock, Loader2, Plus, X, Trash2
} from "lucide-react"
import { IncidentWizard } from "@/components/incident/IncidentWizard"
import { Incident, Personnel, Vehicle } from "@/types"
import { getTriageInfo } from "@/lib/utils"

export default function OlaylarPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [personnelList, setPersonnelList] = useState<Personnel[]>([])
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [ek16Incident, setEk16Incident] = useState<Incident | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [incRes, perRes, vehRes] = await Promise.all([
        api.from('incidents').select('*').order('created_at', { ascending: false }),
        api.from('personnel').select('*').eq('aktif', true).order('ad', { ascending: true }),
        api.from('vehicles').select('*').order('plaka', { ascending: true })
      ])
      
      if (incRes.data) setIncidents(incRes.data)
      if (perRes.data) setPersonnelList(perRes.data)
      if (vehRes.data) setVehicleList(vehRes.data)
      
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    setIsAdding(false)
    setEk16Incident(null)
    fetchData()
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEk16Incident(null)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu vaka kaydını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return
    
    try {
      // Önce ilişkili yabancı anahtar tablolarını temizleyelim
      await Promise.all([
        api.remove('incident_personnel', { incident_id: id }),
        api.remove('incident_vehicles', { incident_id: id }),
        api.remove('incident_media', { incident_id: id })
      ])

      // Ardından ana vakayı silelim
      const { error } = await api.remove('incidents', { id })
      if (error) throw error
      
      setIncidents(prev => prev.filter(inc => inc.id !== id))
    } catch (error) {
      console.error(error)
      alert("Silme işlemi sırasında bir hata oluştu.")
    }
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor...</div>
  }

  return (
    <div className="flex flex-col min-h-screen space-y-6 max-w-6xl mx-auto pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vaka & Olay Raporları</h1>
          <p className="text-muted-foreground text-sm">Resmi EK-12, EK-16 ve EK-7 İtfaiye Olay Raporu</p>
        </div>
        {!isAdding && !ek16Incident && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Vaka Ekle
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mt-4">
          <IncidentWizard 
            mode="add"
            personnelList={personnelList}
            vehicleList={vehicleList}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {ek16Incident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-background border rounded-xl shadow-2xl relative my-auto">
            <div className="flex items-center justify-between p-4 border-b bg-surface/50 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
              <h2 className="text-lg font-bold">EK-16 Vaka Kapanış Raporu - {ek16Incident.mahalle}</h2>
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
              <IncidentWizard 
                mode={ek16Incident.status === 'closed' ? 'readonly' : 'edit'}
                initialData={ek16Incident}
                personnelList={personnelList}
                vehicleList={vehicleList}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {!isAdding && (
        // ======================= LIST VIEW =======================
        <div className="grid grid-cols-1 gap-4">
          {incidents.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-surface/50">
              Henüz girilmiş bir vaka kaydı bulunmamaktadır.
            </div>
          ) : (
            incidents.map(inc => {
              const triage = getTriageInfo(inc.olay_turu)
              return (
                <Card key={inc.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${triage.color}15`,
                          color: triage.color,
                          borderColor: `${triage.color}25`
                        }}
                      >
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant={inc.olay_turu === 'Asılsız İhbar' ? 'outline' : 'default'} className={inc.olay_turu === 'Yangın' ? 'bg-danger hover:bg-danger/90' : ''}>
                            {inc.olay_turu}
                          </Badge>
                          <Badge className={`${triage.bgClass} font-bold text-xs px-2.5 py-0.5 rounded-full border-none`}>
                            {triage.badgeText}
                          </Badge>
                          <span className="font-semibold text-lg">{inc.mahalle}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{inc.adres}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> İhbar: {new Date(inc.ihbar_saati).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          {inc.cikis_sebebi && <span className="opacity-50">| Sebep: {inc.cikis_sebebi}</span>}
                        </div>
                      </div>
                    </div>
                  
                  {/* Desktop Action Area */}
                  <div className="hidden md:flex md:flex-col gap-2 items-end md:min-w-[170px]">
                    {inc.status === 'closed' && (
                      <Badge className="bg-success/10 text-success border-none text-[10px] mb-1 w-full justify-center">KAPALI</Badge>
                    )}
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`flex-1 text-xs ${inc.status === 'closed' ? 'border-success/30 text-success hover:bg-success/10' : 'border-danger/30 text-danger hover:bg-danger/10'}`}
                        onClick={() => setEk16Incident(inc)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        {inc.status === 'closed' ? 'EK-16 Raporu' : 'Raporu Gör'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-danger/30 text-danger hover:bg-danger/10 h-9 w-9 shrink-0"
                        title="Vakayı Sil"
                        onClick={() => handleDelete(inc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Action Area */}
                  <div className="flex md:hidden flex-col gap-3 w-full border-t border-border/50 pt-4 mt-3 animate-in slide-in-from-bottom-2 duration-200">
                    {inc.status === 'closed' ? (
                      <div className="flex flex-col gap-2.5 w-full">
                        {/* Status & Delete Row */}
                        <div className="flex items-center justify-between w-full">
                          <Badge className="bg-success/10 text-success border-none text-[11px] font-bold px-3 py-1">KAPALI</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-danger/30 text-danger hover:bg-danger/10 text-[11px] px-3 py-1 gap-1.5 h-8 font-medium"
                            onClick={() => handleDelete(inc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Vakayı Sil
                          </Button>
                        </div>
                        
                        {/* Upper Button: Raporu Gör */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs border-muted-foreground/30 text-muted-foreground hover:bg-muted-foreground/10 h-10 gap-1.5"
                          onClick={() => setEk16Incident(inc)}
                        >
                          <FileText className="w-4 h-4 text-sky-500" /> Raporu Gör
                        </Button>
                        
                        {/* Lower Button: EK-16 Raporu */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs border-success/30 text-success hover:bg-success/10 h-10 gap-1.5 font-semibold bg-success/5"
                          onClick={() => setEk16Incident(inc)}
                        >
                          <FileText className="w-4 h-4" /> EK-16 Raporu
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs border-danger/30 text-danger hover:bg-danger/10 h-10 gap-1.5"
                          onClick={() => setEk16Incident(inc)}
                        >
                          <FileText className="w-4 h-4" /> Raporu Gör
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-danger/30 text-danger hover:bg-danger/10 h-10 w-10 shrink-0"
                          title="Vakayı Sil"
                          onClick={() => handleDelete(inc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Mobil Alt Bar Maskeleme Kalkanı - Spacer */}
      <div 
        className="w-full block md:hidden pointer-events-none clear-both" 
        style={{ height: 'calc(7rem + env(safe-area-inset-bottom))' }} 
        aria-hidden="true" 
      />

    </div>
  )
}
