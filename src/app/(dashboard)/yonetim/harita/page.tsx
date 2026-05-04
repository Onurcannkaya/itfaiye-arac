"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Loader2, Map as MapIcon, Flame, Droplets, Target, Search, Plus, MapPin, X } from "lucide-react"

const Map = dynamic(() => import("@/components/map/Map"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface/50 border rounded-xl border-dashed">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
      <span className="text-sm font-medium text-muted-foreground">Harita Yükleniyor...</span>
    </div>
  )
})

type Incident = any
type Hydrant = any
type Address = any

export default function HaritaPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [hydrants, setHydrants] = useState<Hydrant[]>([])
  const [loading, setLoading] = useState(true)

  // Search Engine State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Address[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null)

  // Map Interactivity State
  const [mode, setMode] = useState<'idle' | 'add_incident' | 'add_hydrant'>('idle')
  
  // Modals Data State
  const [showModal, setShowModal] = useState<'none' | 'incident' | 'hydrant'>('none')
  const [clickedCoords, setClickedCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Incident Form
  const [incidentForm, setIncidentForm] = useState({ olay_turu: "Yangın", mahalle: "", adres: "" })
  
  // Hydrant Form
  const [hydrantForm, setHydrantForm] = useState({ no: "", tip: "Yer üstü", durum: "Aktif", mahalle: "" })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: incData } = await supabase.from('incidents').select('*').not('location', 'is', null)
      const { data: hydData } = await supabase.from('fire_hydrants').select('*')

      if (incData) setIncidents(incData)
      if (hydData) setHydrants(hydData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Local Database Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.length < 3) return
    
    setIsSearching(true)
    const supabase = createClient()
    try {
      // Fuzzy search on spatial_addresses table (using the GIN index we created)
      const { data, error } = await supabase
        .from('spatial_addresses')
        .select('*')
        .or(`abs_mahalle_adi.ilike.%${searchQuery}%,adi.ilike.%${searchQuery}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error("Arama hatası:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectAddress = (addr: Address) => {
    if (addr.location) {
      try {
        let coords: [number, number] | null = null;
        if (typeof addr.location === 'string') {
          const parsed = JSON.parse(addr.location);
          if (parsed.coordinates) coords = [parsed.coordinates[1], parsed.coordinates[0]];
        } else if (addr.location.coordinates) {
          coords = [addr.location.coordinates[1], addr.location.coordinates[0]];
        }

        if (coords) {
          setFocusLocation(coords)
          setSearchResults([])
          setSearchQuery(addr.adi ? `${addr.adi}, ${addr.abs_mahalle_adi}` : addr.abs_mahalle_adi)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Map Click Handler
  const handleMapClick = (lat: number, lng: number) => {
    setClickedCoords({ lat, lng })
    
    if (mode === 'add_incident') {
      setShowModal('incident')
    } else if (mode === 'add_hydrant') {
      setShowModal('hydrant')
    }
    
    // Reset mode back to idle after click
    setMode('idle')
  }

  // Save to DB
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clickedCoords) return
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // WKT format for inserting Point geometry
      const locationWKT = `POINT(${clickedCoords.lng} ${clickedCoords.lat})`
      
      const payload = {
        olay_turu: incidentForm.olay_turu,
        mahalle: incidentForm.mahalle,
        adres: incidentForm.adres,
        location: locationWKT,
        ihbar_saati: new Date().toISOString(),
        cikis_saati: new Date().toISOString(),
        kullanilan_su_ton: 0,
        kullanilan_kopuk_litre: 0,
        kullanilan_kkt_kg: 0
      }

      const { error } = await supabase.from('incidents').insert(payload)
      if (error) throw error

      setShowModal('none')
      setIncidentForm({ olay_turu: "Yangın", mahalle: "", adres: "" })
      fetchData() // Refresh map
    } catch (error) {
      console.error(error)
      alert("Kayıt oluşturulurken hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveHydrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clickedCoords) return
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const locationWKT = `POINT(${clickedCoords.lng} ${clickedCoords.lat})`
      
      const payload = {
        no: hydrantForm.no,
        tip: hydrantForm.tip,
        durum: hydrantForm.durum,
        mahalle: hydrantForm.mahalle,
        location: locationWKT
      }

      const { error } = await supabase.from('fire_hydrants').insert(payload)
      if (error) throw error

      setShowModal('none')
      setHydrantForm({ no: "", tip: "Yer üstü", durum: "Aktif", mahalle: "" })
      fetchData() // Refresh map
    } catch (error) {
      console.error(error)
      alert("Kayıt oluşturulurken hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4 max-w-[1600px] mx-auto w-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapIcon className="w-6 h-6 text-primary" /> Komuta Kontrol Haritası (CBS)</h1>
          <p className="text-muted-foreground text-sm">İnteraktif mekansal analiz ve saha yönetimi</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant={mode === 'add_incident' ? 'default' : 'outline'}
            className={mode === 'add_incident' ? 'bg-danger hover:bg-danger/90' : 'border-danger/50 text-danger hover:bg-danger/10'}
            onClick={() => setMode(mode === 'add_incident' ? 'idle' : 'add_incident')}
          >
            <Flame className="w-4 h-4 mr-2" /> 
            {mode === 'add_incident' ? 'Haritaya Tıklayın...' : 'Yeni Olay İşaretle'}
          </Button>
          
          <Button 
            variant={mode === 'add_hydrant' ? 'default' : 'outline'}
            className={mode === 'add_hydrant' ? 'bg-blue-500 hover:bg-blue-600' : 'border-blue-500/50 text-blue-500 hover:bg-blue-500/10'}
            onClick={() => setMode(mode === 'add_hydrant' ? 'idle' : 'add_hydrant')}
          >
            <Droplets className="w-4 h-4 mr-2" /> 
            {mode === 'add_hydrant' ? 'Haritaya Tıklayın...' : 'Yeni Hidrant Ekle'}
          </Button>

          {mode !== 'idle' && (
            <Button variant="ghost" size="icon" onClick={() => setMode('idle')} className="text-muted-foreground" title="İşlemi İptal Et">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-1 border-border overflow-hidden shadow-md relative">
        <CardContent className="p-0 h-full w-full relative">
          
          {/* Arama Çubuğu (Search Engine) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] w-full max-w-md px-4">
            <form onSubmit={handleSearch} className="relative bg-background rounded-full shadow-lg border flex items-center overflow-hidden">
              <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
              <input 
                type="text" 
                placeholder="Sivas içi Mahalle, Sokak veya Cadde Ara..." 
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-3 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" variant="ghost" className="rounded-full mr-1 h-10 w-10 p-0 shrink-0">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </Button>
            </form>

            {/* Arama Sonuçları Modal/Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-background border shadow-xl rounded-xl overflow-hidden max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-surface/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arama Sonuçları</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSearchResults([])}>Kapat</Button>
                </div>
                {searchResults.map(res => (
                  <div 
                    key={res.id} 
                    className="px-4 py-3 hover:bg-surface cursor-pointer border-b last:border-0 transition-colors"
                    onClick={() => handleSelectAddress(res)}
                  >
                    <div className="font-medium text-sm flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" /> {res.abs_mahalle_adi}</div>
                    {res.adi && <div className="text-xs text-muted-foreground ml-5">{res.adi}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Harita Katman ve Bilgi Kontrolü */}
          <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
            <div className="bg-background/90 backdrop-blur-md border shadow-lg rounded-xl p-3 space-y-2 w-48 pointer-events-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">Canlı Katmanlar</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2"><Flame className="w-4 h-4 text-danger" /> Vakalar</span>
                <Badge variant="outline" className="bg-danger/10 text-danger border-none">{incidents.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /> Hidrantlar</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none">{hydrants.length}</Badge>
              </div>
            </div>
          </div>

          <Map 
            incidents={incidents} 
            hydrants={hydrants} 
            mode={mode} 
            onMapClick={handleMapClick} 
            focusLocation={focusLocation}
          />
          
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* İNTERAKTİF İŞARETLEME (PIN DROPPING) FORMLARI / MODALLAR  */}
      {/* ========================================================= */}
      
      {showModal === 'incident' && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-danger" /> Olay İşaretle</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal('none')}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSaveIncident} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Olay Türü</label>
                <select name="olay_turu" value={incidentForm.olay_turu} onChange={(e) => setIncidentForm({...incidentForm, olay_turu: e.target.value})} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="Yangın">Yangın</option>
                  <option value="Trafik Kazası">Trafik Kazası</option>
                  <option value="Kurtarma">Kurtarma</option>
                  <option value="Su Baskını">Su Baskını</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Mahalle</label>
                <Input value={incidentForm.mahalle} onChange={(e) => setIncidentForm({...incidentForm, mahalle: e.target.value})} required placeholder="Örn: Alibaba" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Adres / Detay</label>
                <Input value={incidentForm.adres} onChange={(e) => setIncidentForm({...incidentForm, adres: e.target.value})} required placeholder="Sokak, Bina detayları..." />
              </div>
              
              <div className="text-xs text-muted-foreground font-mono bg-surface p-2 rounded border mt-4">
                Seçilen Konum: {clickedCoords?.lat.toFixed(6)}, {clickedCoords?.lng.toFixed(6)}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowModal('none')}>İptal</Button>
                <Button type="submit" className="bg-danger hover:bg-danger/90 text-white" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Haritaya Kaydet
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showModal === 'hydrant' && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-500" /> Yangın Hidrantı Ekle</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal('none')}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSaveHydrant} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Hidrant / Şube No</label>
                <Input value={hydrantForm.no} onChange={(e) => setHydrantForm({...hydrantForm, no: e.target.value})} required placeholder="Örn: H-128" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Tip</label>
                  <select value={hydrantForm.tip} onChange={(e) => setHydrantForm({...hydrantForm, tip: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Yer üstü">Yer üstü</option>
                    <option value="Yer altı">Yer altı</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Durum</label>
                  <select value={hydrantForm.durum} onChange={(e) => setHydrantForm({...hydrantForm, durum: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Aktif">Aktif</option>
                    <option value="Arızalı">Arızalı</option>
                    <option value="Bakımda">Bakımda</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Bulunduğu Mahalle</label>
                <Input value={hydrantForm.mahalle} onChange={(e) => setHydrantForm({...hydrantForm, mahalle: e.target.value})} required placeholder="Örn: Esentepe" />
              </div>
              
              <div className="text-xs text-muted-foreground font-mono bg-surface p-2 rounded border mt-4">
                Seçilen Konum: {clickedCoords?.lat.toFixed(6)}, {clickedCoords?.lng.toFixed(6)}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowModal('none')}>İptal</Button>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Sisteme Ekle
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}
