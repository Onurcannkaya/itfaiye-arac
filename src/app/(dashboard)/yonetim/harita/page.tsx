"use client"

import { useState, useEffect, useRef, Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import PageGuard from "@/components/PageGuard"
import dynamic from "next/dynamic"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Loader2, Map as MapIcon, Flame, Droplets, Target, Search, Plus, MapPin, X, Sparkles } from "lucide-react"
import { useAuthStore } from "@/lib/authStore"

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
type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  class: string
}

// ─── PostGIS WKB parser helpers for real-time focus ─────────
const parseWKBPoint = (wkbHex: string): [number, number] | null => {
  if (!wkbHex || typeof wkbHex !== 'string') return null
  const cleanHex = wkbHex.trim()
  if (cleanHex.length < 42) return null
  
  const isLittleEndian = cleanHex.substring(0, 2) === '01'
  const type = cleanHex.substring(2, 10)
  
  let coordsHex = ''
  if (type === '01000020' || type === '20000001') {
    coordsHex = cleanHex.substring(18)
  } else if (type === '01000000' || type === '00000001') {
    coordsHex = cleanHex.substring(10)
  } else {
    if (cleanHex.length === 50) {
      coordsHex = cleanHex.substring(18)
    } else if (cleanHex.length === 42) {
      coordsHex = cleanHex.substring(10)
    } else {
      return null
    }
  }

  if (coordsHex.length < 32) return null

  const xHex = coordsHex.substring(0, 16)
  const yHex = coordsHex.substring(16, 32)

  const hexToDouble = (hexStr: string): number => {
    const bytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) {
      const byteHex = hexStr.substring(i * 2, i * 2 + 2)
      bytes[isLittleEndian ? i : 7 - i] = parseInt(byteHex, 16)
    }
    const view = new DataView(bytes.buffer)
    return view.getFloat64(0, true)
  }

  const x = hexToDouble(xHex)
  const y = hexToDouble(yHex)

  return [x, y]
}

const parseLocation = (loc: any): [number, number] | null => {
  if (!loc) return null
  if (typeof loc === 'string') {
    const trimmed = loc.trim()
    if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      const parsed = parseWKBPoint(trimmed)
      if (parsed) return parsed
    }
    try {
      const parsed = JSON.parse(loc)
      if (parsed.coordinates) {
        return [parsed.coordinates[0], parsed.coordinates[1]]
      }
    } catch {
      return null
    }
  }
  if (loc.coordinates) {
    return [loc.coordinates[0], loc.coordinates[1]]
  }
  return null
}

// Türkçe karakterleri her ortamda (locale desteği eksik sunucularda dahi) doğru şekilde büyük harfe dönüştüren yardımcı fonksiyon
function toTurkishUpperCase(str: string): string {
  const map: { [key: string]: string } = {
    'i': 'İ',
    'ı': 'I',
    'ş': 'Ş',
    'ğ': 'Ğ',
    'ç': 'Ç',
    'ö': 'Ö',
    'ü': 'Ü'
  };
  return str.split('').map(char => map[char] || char.toUpperCase()).join('');
}

function HaritaContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const incidentId = searchParams.get('incidentId')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [hydrants, setHydrants] = useState<Hydrant[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [personnelList, setPersonnelList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Search Engine State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null)
  const [hasFetchedAddress, setHasFetchedAddress] = useState(false)

  // Map Interactivity State
  const [interactionMode, setInteractionMode] = useState<'idle' | 'add_incident' | 'add_hydrant'>('idle')
  
  // Modals Data State
  const [showModal, setShowModal] = useState<'none' | 'incident' | 'hydrant' | 'mufreze_cikis'>('none')
  const [clickedCoords, setClickedCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Incident Form & Dispatch States
  const [incidentForm, setIncidentForm] = useState({ olay_turu: "Ev Yangını", mahalle: "", adres: "" })
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null)
  const [selectedVehiclePlakas, setSelectedVehiclePlakas] = useState<string[]>([])
  const [checkedPersonnel, setCheckedPersonnel] = useState<string[]>([])
  const [personnelSearch, setPersonnelSearch] = useState("")
  
  // Hydrant Form
  const [hydrantForm, setHydrantForm] = useState({ no: "", tip: "Yer üstü", durum: "Aktif", mahalle: "" })

  // ─── İnteraktif Adres Arama (Geocoding) State ─────────
  const [incidentSearchQuery, setIncidentSearchQuery] = useState("")
  const [incidentSearchResults, setIncidentSearchResults] = useState<NominatimResult[]>([])
  const [isIncidentSearching, setIsIncidentSearching] = useState(false)
  const [hasIncidentSearched, setHasIncidentSearched] = useState(false)
  const incidentSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Nöbetçi Posta & Personel Hesaplama ───────────────────
  const activePostaNumber = useMemo(() => {
    const referenceDate = new Date("2026-06-04");
    referenceDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - referenceDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const index = ((1 + (diffDays % 3) + 3) % 3) + 1;
    return index;
  }, []);

  const activePostaPersonnel = useMemo(() => {
    return personnelList.filter(p => p.posta_no === activePostaNumber && p.aktif !== false);
  }, [personnelList, activePostaNumber]);

  const sortedMufrezePersonnel = useMemo(() => {
    const activeStations = vehicles
      .filter(v => selectedVehiclePlakas.includes(v.plaka))
      .map(v => v.istasyon || "")
      .filter(Boolean)
      .map(s => s.toLowerCase().split(' ')[0]);
    
    return [...activePostaPersonnel].sort((a, b) => {
      const stationA = (a.istasyon || '').toLowerCase().split(' ')[0];
      const stationB = (b.istasyon || '').toLowerCase().split(' ')[0];
      
      const matchA = activeStations.includes(stationA);
      const matchB = activeStations.includes(stationB);
      
      if (matchA !== matchB) {
        return matchA ? -1 : 1;
      }
      return (a.ad || '').localeCompare(b.ad || '', 'tr');
    });
  }, [activePostaPersonnel, selectedVehiclePlakas, vehicles]);

  const filteredPersonnel = useMemo(() => {
    if (!personnelSearch.trim()) return sortedMufrezePersonnel;
    const q = toTurkishUpperCase(personnelSearch.trim());
    return sortedMufrezePersonnel.filter(p => {
      const fullName = toTurkishUpperCase(`${p.ad || ''} ${p.soyad || ''}`);
      const sicil = toTurkishUpperCase(p.sicil_no || '');
      return fullName.includes(q) || sicil.includes(q);
    });
  }, [sortedMufrezePersonnel, personnelSearch]);

  useEffect(() => {
    fetchData()

    // ─── Real-Time Canlı Vaka Polling Dinleyicisi ─────────
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/harita-canli-vaka')
        const data = await res.json()
        if (data.success && data.incidents) {
          const newIncidents = data.incidents as Incident[]
          
          setIncidents(prev => {
            const currentIds = new Set(prev.map(i => String(i.id)))
            let newlyDetectedIncident: Incident | null = null
            
            for (const inc of newIncidents) {
              if (!currentIds.has(String(inc.id))) {
                newlyDetectedIncident = inc
                break
              }
            }
            
            if (newlyDetectedIncident) {
              const coords = parseLocation(newlyDetectedIncident.location)
              if (coords) {
                // Focus on new incident: [lat, lng] -> [coords[1], coords[0]]
                setFocusLocation([coords[1], coords[0]])
                console.log('[Real-Time] Yeni Vaka Tespit Edildi, Odaklanılıyor:', newlyDetectedIncident)
              }
            }
            
            return newIncidents
          })
        }
      } catch (err) {
        console.warn('[Real-Time] Canlı vaka sorgulama hatası:', err)
      }
    }, 5000) // 5 saniyede bir sorgula

    return () => clearInterval(intervalId)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: incData } = await api.from('incidents').select('*').neq('location', null)
      const { data: hydData } = await api.from('fire_hydrants').select('*')
      const { data: vehData } = await api.from('vehicles').select('*')
      const { data: persData } = await api.from('personnel').select('*').eq('aktif', true)

      if (incData) setIncidents(incData)
      if (hydData) setHydrants(hydData)
      if (vehData) setVehicles(vehData)
      if (persData) setPersonnelList(persData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Focus on incident if incidentId is passed in URL query params
  useEffect(() => {
    if (incidentId && incidents.length > 0) {
      const targetInc = incidents.find(i => String(i.id) === String(incidentId))
      if (targetInc) {
        const coords = parseLocation(targetInc.location)
        if (coords) {
          // Focus on target incident: [lat, lng] -> [coords[1], coords[0]]
          setFocusLocation([coords[1], coords[0]])
          console.log('[URL Param] Fokuslanılan Vaka:', targetInc)
        }
      }
    }
  }, [incidentId, incidents])

  const handleUpdateHydrantStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await api.update('fire_hydrants', { durum: newStatus }, { id })
      if (error) throw error
      
      // Update state locally immediately
      setHydrants(prev => prev.map(hyd => hyd.id === id ? { ...hyd, durum: newStatus } : hyd))
    } catch (error) {
      console.error("Hidrant durumu güncellenirken hata oluştu:", error)
      alert("Hidrant durumu güncellenemedi.")
    }
  }

  // Handle Nominatim (OSM) Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim() || searchQuery.length < 3) return
    
    setIsSearching(true)
    setHasSearched(false)
    try {
      const searchTerm = encodeURIComponent(`${searchQuery.trim()} Sivas`)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}&addressdetails=1&limit=5`

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'tr-TR',
          'User-Agent': 'SivasItfaiyeKomuta/1.0'
        }
      })

      if (!response.ok) throw new Error(`Nominatim API hatası: ${response.status}`)
      
      const data: NominatimResult[] = await response.json()
      setSearchResults(data || [])
      setHasSearched(true)
    } catch (error) {
      console.error("Arama hatası:", error)
      setSearchResults([])
      setHasSearched(true)
    } finally {
      setIsSearching(false)
    }
  }

  // Enter key handler for search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleSelectAddress = (result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      setFocusLocation([lat, lon])
      setSearchResults([])
      setHasSearched(false)
      setSearchQuery(result.display_name)
    }
  }

  // ─── İnteraktif Adres Arama (Geocoding) - İhbar Formu İçi ────────
  const handleIncidentSearch = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setIncidentSearchResults([])
      setHasIncidentSearched(false)
      return
    }
    
    setIsIncidentSearching(true)
    setHasIncidentSearched(false)
    try {
      const searchTerm = encodeURIComponent(`${query.trim()} Sivas`)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}&addressdetails=1&limit=5`
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'tr-TR',
          'User-Agent': 'SivasItfaiyeKomuta/1.0'
        }
      })
      if (!response.ok) throw new Error(`Nominatim API hatası: ${response.status}`)
      const data: NominatimResult[] = await response.json()
      setIncidentSearchResults(data || [])
      setHasIncidentSearched(true)
    } catch (error) {
      console.error('[Geocoding] İhbar arama hatası:', error)
      setIncidentSearchResults([])
      setHasIncidentSearched(true)
    } finally {
      setIsIncidentSearching(false)
    }
  }

  const handleIncidentSearchInput = (value: string) => {
    setIncidentSearchQuery(value)
    setHasIncidentSearched(false)
    
    // Debounce: 400ms sonra otomatik arama tetikle
    if (incidentSearchTimerRef.current) {
      clearTimeout(incidentSearchTimerRef.current)
    }
    incidentSearchTimerRef.current = setTimeout(() => {
      handleIncidentSearch(value)
    }, 400)
  }

  const handleIncidentSelectAddress = (result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      // 1. Harita kamerasını sinematik flyTo ile odakla
      setFocusLocation([lat, lon])
      // 2. Koordinatları formun lat/lng alanına yaz
      setClickedCoords({ lat, lng: lon })
      // 3. Adres alanını otomatik doldur
      setIncidentForm(prev => ({ ...prev, adres: result.display_name }))
      setHasFetchedAddress(true)
      // 4. Arama sonuçlarını temizle
      setIncidentSearchResults([])
      setHasIncidentSearched(false)
      setIncidentSearchQuery(result.display_name.split(',')[0] || '')
    }
  }

  // Map Click Handler
  const handleMapClick = async (lat: number, lng: number) => {
    setClickedCoords({ lat, lng })
    setHasFetchedAddress(false)
    
    let fetchedAddress = ""
    let fetchedMahalle = ""
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data) {
        fetchedAddress = data.display_name || ""
        if (data.address) {
          fetchedMahalle = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.quarter || data.address.district || ""
          fetchedMahalle = fetchedMahalle.replace(/\s*Mahallesi$/i, "").trim()
        }
        setHasFetchedAddress(true)
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e)
    }

    if (interactionMode === 'add_incident') {
      try {
        const locationWKT = `POINT(${lng} ${lat})`
        const draftPayload = {
          olay_turu: "Müfreze Çıkışı (Hazırlanıyor)",
          mahalle: fetchedMahalle || "Alibaba",
          adres: fetchedAddress || "İhbar Konumu",
          location: locationWKT,
          ihbar_saati: new Date().toISOString(),
          cikis_saati: new Date().toISOString(),
          status: "active",
          kullanilan_su_ton: 0,
          kullanilan_kopuk_litre: 0,
          kullanilan_kkt_kg: 0
        }
        const res = await api.insert('incidents', draftPayload)
        if (res && res.data) {
          const insertedRow = Array.isArray(res.data) ? res.data[0] : res.data
          if (insertedRow && insertedRow.id) {
            setActiveIncidentId(insertedRow.id)
            setIncidentForm({
              olay_turu: "Ev Yangını",
              mahalle: fetchedMahalle || "Alibaba",
              adres: fetchedAddress || "İhbar Konumu"
            })
            
            // Auto-select first active vehicle if available
            if (vehicles.length > 0) {
              const activeVeh = vehicles.find(v => (v.durum || '').toLowerCase() === 'aktif') || vehicles[0]
              setSelectedVehiclePlakas([activeVeh.plaka])
              
              // Filter personnel of the same station
              const station = activeVeh.istasyon || ""
              const defChecked = personnelList
                .filter(p => p.posta_no === activePostaNumber && p.aktif !== false)
                .filter(p => {
                  if (!station) return true
                  const vStationWord = station.toLowerCase().split(' ')[0]
                  const pStationWord = (p.istasyon || '').toLowerCase().split(' ')[0]
                  return vStationWord === pStationWord
                })
                .map(p => p.sicil_no)
              setCheckedPersonnel(defChecked)
            } else {
              setSelectedVehiclePlakas([])
              setCheckedPersonnel([])
            }
            
            setShowModal('mufreze_cikis')
          }
        }
      } catch (err) {
        console.error("Draft incident creation error:", err)
        alert("Konum işaretlenirken hata oluştu.")
      }
    } else if (interactionMode === 'add_hydrant') {
      setShowModal('hydrant')
    }
    
    // Reset mode back to idle after click
    setInteractionMode('idle')
  }

  const handleVehicleToggle = (plaka: string, checked: boolean) => {
    let newPlakas: string[] = []
    if (checked) {
      newPlakas = [...selectedVehiclePlakas, plaka]
    } else {
      newPlakas = selectedVehiclePlakas.filter(p => p !== plaka)
    }
    setSelectedVehiclePlakas(newPlakas)

    // Auto-update personnel based on matching stations of selected vehicles
    const stations = vehicles
      .filter(v => newPlakas.includes(v.plaka))
      .map(v => v.istasyon || "")
      .filter(Boolean)
    const stationWords = stations.map(s => s.toLowerCase().split(' ')[0])

    const defChecked = activePostaPersonnel
      .filter(p => {
        if (stationWords.length === 0) return false
        const pStationWord = (p.istasyon || '').toLowerCase().split(' ')[0]
        return stationWords.includes(pStationWord)
      })
      .map(p => p.sicil_no)
    setCheckedPersonnel(defChecked)
  }

  const handleSaveMufrezeCikis = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeIncidentId) return
    setIsSubmitting(true)
    try {
      const payload = {
        olay_turu: incidentForm.olay_turu,
        mahalle: incidentForm.mahalle,
        adres: incidentForm.adres,
        ek16_araclar: JSON.stringify(selectedVehiclePlakas),
        ek16_personel: JSON.stringify(checkedPersonnel),
        cikis_saati: new Date().toISOString()
      }

      const { error: updErr } = await api.update('incidents', payload, { id: activeIncidentId })
      if (updErr) throw updErr

      // Delete existing vehicles and personnel linkages first to prevent unique constraint violations
      await Promise.all([
        api.remove('incident_vehicles', { incident_id: activeIncidentId }),
        api.remove('incident_personnel', { incident_id: activeIncidentId })
      ]);

      // Link vehicles to incident
      if (selectedVehiclePlakas.length > 0) {
        const vPayload = selectedVehiclePlakas.map(plaka => ({
          incident_id: activeIncidentId,
          plaka,
          gorev_turu: "Müdahale Aracı"
        }))
        await api.insert('incident_vehicles', vPayload)
      }

      // Link personnel to incident
      if (checkedPersonnel.length > 0) {
        const pPayload = checkedPersonnel.map(sicil_no => ({
          incident_id: activeIncidentId,
          sicil_no,
          gorev: "Müdahale Personeli"
        }))
        await api.insert('incident_personnel', pPayload)
      }

      setShowModal('none')
      setActiveIncidentId(null)
      setPersonnelSearch("")
      fetchData() // Refresh map data
    } catch (err) {
      console.error("Mufreze cikis error:", err)
      alert("Müfreze çıkış kaydı oluşturulurken hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save to DB
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clickedCoords) return
    setIsSubmitting(true)
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

      const { error } = await api.insert('incidents', payload)
      if (error) throw error

      setShowModal('none')
      setIncidentForm({ olay_turu: "Ev Yangını", mahalle: "", adres: "" })
      fetchData() // Refresh map
    } catch (error) {
      console.error(error)
      alert("Kayıt oluşturulurken hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteIncident = (id: string) => {
    setIncidents(prev => prev.filter(inc => String(inc.id) !== String(id)))
  }

  const handleEditIncident = async (incident: Incident) => {
    setActiveIncidentId(incident.id)
    setIncidentForm({
      olay_turu: incident.olay_turu || "Ev Yangını",
      mahalle: incident.mahalle || "",
      adres: incident.adres || ""
    })

    try {
      // Fetch currently linked vehicles
      const { data: vData } = await api.from('incident_vehicles')
        .select('plaka')
        .eq('incident_id', incident.id)
      
      if (vData && Array.isArray(vData)) {
        setSelectedVehiclePlakas(vData.map(v => v.plaka))
      } else {
        setSelectedVehiclePlakas([])
      }

      // Fetch currently linked personnel
      const { data: pData } = await api.from('incident_personnel')
        .select('sicil_no')
        .eq('incident_id', incident.id)

      if (pData && Array.isArray(pData)) {
        setCheckedPersonnel(pData.map(p => p.sicil_no))
      } else {
        setCheckedPersonnel([])
      }

      // Open the dispatch/mufreze_cikis modal
      setShowModal('mufreze_cikis')
    } catch (err) {
      console.error("Error loading incident links for edit:", err)
    }
  }

  const handleSaveHydrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clickedCoords) return
    setIsSubmitting(true)
    try {
      const locationWKT = `POINT(${clickedCoords.lng} ${clickedCoords.lat})`
      
      const payload = {
        no: hydrantForm.no,
        tip: hydrantForm.tip,
        durum: hydrantForm.durum,
        mahalle: hydrantForm.mahalle,
        location: locationWKT
      }

      const { error } = await api.insert('fire_hydrants', payload)
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
    <PageGuard pageId="harita">
      <div className="flex flex-col h-[calc(100vh-8rem)] sm:space-y-4 space-y-2 max-w-[1600px] mx-auto w-full relative px-2 sm:px-0">
      {interactionMode === 'add_incident' && <div className="emergency-glow-overlay" />}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/5 shadow-2xl shrink-0 z-10 relative">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-4 whitespace-nowrap bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)]">
            <MapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            Komuta Kontrol Haritası
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 font-medium hidden sm:block whitespace-nowrap">
            İnteraktif mekansal analiz and saha yönetimi
          </p>
        </div>
        
        <div className="flex flex-row flex-wrap items-center gap-2 shrink-0">
          <Button 
            variant={interactionMode === 'add_incident' ? 'default' : 'outline'}
            className={`min-h-[44px] text-xs sm:text-sm whitespace-nowrap ${interactionMode === 'add_incident' ? 'bg-danger hover:bg-danger/90' : 'border-danger/50 text-danger hover:bg-danger/10'}`}
            onClick={() => setInteractionMode(interactionMode === 'add_incident' ? 'idle' : 'add_incident')}
          >
            <Flame className="w-4 h-4 mr-1 sm:mr-2" /> 
            {interactionMode === 'add_incident' ? 'Haritaya Tıklayın...' : 'Yeni Olay'}
          </Button>
          
          <Button 
            variant={interactionMode === 'add_hydrant' ? 'default' : 'outline'}
            className={`min-h-[44px] text-xs sm:text-sm whitespace-nowrap ${interactionMode === 'add_hydrant' ? 'bg-blue-500 hover:bg-blue-600' : 'border-blue-500/50 text-blue-500 hover:bg-blue-500/10'}`}
            onClick={() => setInteractionMode(interactionMode === 'add_hydrant' ? 'idle' : 'add_hydrant')}
          >
            <Droplets className="w-4 h-4 mr-1 sm:mr-2" /> 
            {interactionMode === 'add_hydrant' ? 'Haritaya Tıklayın...' : 'Yeni Hidrant'}
          </Button>

          {interactionMode !== 'idle' && (
            <Button variant="ghost" size="icon" onClick={() => setInteractionMode('idle')} className="text-muted-foreground min-h-[44px] min-w-[44px] whitespace-nowrap" title="İşlemi İptal Et">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-1 border-border overflow-hidden shadow-md relative">
        <CardContent className="p-0 h-full w-full relative">
          
          {/* Arama Çubuğu (Search Engine) */}
          <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[400] w-[95%] sm:w-full sm:max-w-md sm:px-4">
            <form onSubmit={handleSearch} className="relative bg-background rounded-full shadow-lg border flex items-center overflow-hidden">
              <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
              <input 
                type="text" 
                placeholder="Sivas içi Mahalle, Sokak veya Cadde Ara..." 
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-3 text-sm"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setHasSearched(false) }}
                onKeyDown={handleSearchKeyDown}
              />
              <Button type="button" variant="ghost" className="rounded-full mr-1 h-11 w-11 sm:h-10 sm:w-10 p-0 shrink-0" onClick={() => handleSearch()}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>

            {/* Yükleniyor durumu */}
            {isSearching && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-background border shadow-xl rounded-xl overflow-hidden animate-in slide-in-from-top-2">
                <div className="flex items-center justify-center gap-2 px-4 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Aranıyor...</span>
                </div>
              </div>
            )}

            {/* Arama Sonuçları Modal/Dropdown */}
            {!isSearching && searchResults.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-background border shadow-xl rounded-xl overflow-hidden max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-surface/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arama Sonuçları ({searchResults.length})</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setSearchResults([]); setHasSearched(false) }}>Kapat</Button>
                </div>
                {searchResults.map(res => (
                  <div 
                    key={res.place_id} 
                    className="px-4 py-3 hover:bg-surface cursor-pointer border-b last:border-0 transition-colors"
                    onClick={() => handleSelectAddress(res)}
                  >
                    <div className="font-medium text-sm flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="line-clamp-2">{res.display_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sonuç bulunamadı geri bildirimi */}
            {!isSearching && hasSearched && searchResults.length === 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-background border shadow-xl rounded-xl overflow-hidden animate-in slide-in-from-top-2">
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-4">
                  <Search className="w-5 h-5 text-muted-foreground/50" />
                  <span className="text-sm font-medium text-muted-foreground">Sonuç bulunamadı</span>
                  <span className="text-xs text-muted-foreground/70">Farklı bir mahalle veya sokak adı deneyin</span>
                </div>
              </div>
            )}
          </div>

          {/* Harita Katman ve Bilgi Kontrolü - Sol panele (Map.tsx) entegre edildi */}

          <Map 
            incidents={incidents} 
            hydrants={hydrants} 
            vehicles={vehicles}
            mode={interactionMode} 
            onMapClick={handleMapClick} 
            focusLocation={focusLocation}
            onUpdateHydrantStatus={handleUpdateHydrantStatus}
            onDeleteIncident={handleDeleteIncident}
            onEditIncident={handleEditIncident}
          />
          
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* İNTERAKTİF İŞARETLEME (PIN DROPPING) FORMLARI / MODALLAR  */}
      {/* ========================================================= */}
      
      {showModal === 'incident' && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <Card className="w-full sm:max-w-md shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-danger" /> Olay İşaretle</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal('none')} className="min-h-[44px] min-w-[44px]"><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSaveIncident} className="p-4 sm:p-6 space-y-4">
              {/* ─── İnteraktif Adres Arama Motoru (Geocoding) ─────── */}
              <div className="space-y-2 relative">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Adres veya Önemli Yer Ara</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none">
                    {isIncidentSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base">🔍</span>}
                  </div>
                  <input
                    type="text"
                    placeholder="Adres veya Önemli Yer Ara..."
                    value={incidentSearchQuery}
                    onChange={(e) => handleIncidentSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleIncidentSearch(incidentSearchQuery); } }}
                    className="w-full h-11 rounded-xl border border-cyan-500/30 bg-slate-950/60 backdrop-blur-sm pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all shadow-[0_0_12px_rgba(6,182,212,0.08)]"
                  />
                </div>

                {/* Geocoding Sonuç Dropdown */}
                {!isIncidentSearching && incidentSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/20 rounded-xl shadow-[0_8px_32px_rgba(6,182,212,0.15)] max-h-52 overflow-y-auto">
                    <div className="px-3 py-1.5 border-b border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">Bulunan Adresler ({incidentSearchResults.length})</span>
                      <button type="button" onClick={() => { setIncidentSearchResults([]); setHasIncidentSearched(false); }} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Kapat</button>
                    </div>
                    {incidentSearchResults.map(res => (
                      <button
                        key={res.place_id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-cyan-500/10 border-b border-slate-800/30 last:border-0 transition-colors flex items-start gap-2 min-h-[44px]"
                        onClick={() => handleIncidentSelectAddress(res)}
                      >
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-200 leading-snug line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sonuç bulunamadı */}
                {!isIncidentSearching && hasIncidentSearched && incidentSearchResults.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-700/40 rounded-xl shadow-lg">
                    <div className="flex items-center justify-center gap-2 px-4 py-3">
                      <Search className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-slate-500">Sonuç bulunamadı — farklı bir adres deneyin</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-cyan-500/20 via-slate-800/40 to-transparent" />

              <div className="space-y-2">
                <label className="text-sm font-semibold">Olay Türü</label>
                <select name="olay_turu" value={incidentForm.olay_turu} onChange={(e) => setIncidentForm({...incidentForm, olay_turu: e.target.value})} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <optgroup label="🔴 Kritik (Seviye 3)">
                    <option value="Ev Yangını">Ev Yangını</option>
                    <option value="Bina/Fabrika Yangını">Bina/Fabrika Yangını</option>
                    <option value="Sıkışmalı Trafik Kazası">Sıkışmalı Trafik Kazası</option>
                    <option value="KBRN Sızıntısı">KBRN Sızıntısı</option>
                  </optgroup>
                  <optgroup label="🟡 Orta (Seviye 2)">
                    <option value="Araç Yangını">Araç Yangını</option>
                    <option value="İşyeri Yangını">İşyeri Yangını</option>
                    <option value="Kurtarma Operasyonları">Kurtarma Operasyonları</option>
                  </optgroup>
                  <optgroup label="🟢 Düşük (Seviye 1)">
                    <option value="Çöp Yangını">Çöp Yangını</option>
                    <option value="Ot/Anız Yangını">Ot/Anız Yangını</option>
                    <option value="Kapı Açma">Kapı Açma</option>
                    <option value="Hayvan Kurtarma">Hayvan Kurtarma</option>
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Mahalle</label>
                <Input value={incidentForm.mahalle} onChange={(e) => setIncidentForm({...incidentForm, mahalle: e.target.value})} required placeholder="Örn: Alibaba" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center justify-between w-full">
                  <span>Adres / Detay</span>
                  {hasFetchedAddress && (
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-500 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      <Sparkles className="w-3 h-3" />
                      Yapay Zeka Tarafından Doğrulandı
                    </span>
                  )}
                </label>
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
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <Card className="w-full sm:max-w-md shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-500" /> Yangın Hidrantı Ekle</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal('none')} className="min-h-[44px] min-w-[44px]"><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSaveHydrant} className="p-4 sm:p-6 space-y-4">
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
      
      {showModal === 'mufreze_cikis' && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <Card className="w-full sm:max-w-lg shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col border border-white/10 bg-slate-900/90 text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-danger">
                <Flame className="w-5 h-5 animate-pulse text-danger" /> 
                Müfreze Çıkış Paneli (Vaka No: {activeIncidentId})
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal('none')} className="min-h-[44px] min-w-[44px] hover:bg-white/10 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSaveMufrezeCikis} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Olay Türü</label>
                <select 
                  name="olay_turu" 
                  value={incidentForm.olay_turu} 
                  onChange={(e) => setIncidentForm({...incidentForm, olay_turu: e.target.value})} 
                  required 
                  className="flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent"
                >
                  <optgroup label="🔴 Kritik (Seviye 3)" className="bg-slate-900 text-danger">
                    <option value="Ev Yangını">Ev Yangını</option>
                    <option value="Bina/Fabrika Yangını">Bina/Fabrika Yangını</option>
                    <option value="Sıkışmalı Trafik Kazası">Sıkışmalı Trafik Kazası</option>
                    <option value="KBRN Sızıntısı">KBRN Sızıntısı</option>
                  </optgroup>
                  <optgroup label="🟡 Orta (Seviye 2)" className="bg-slate-900 text-amber-500">
                    <option value="Araç Yangını">Araç Yangını</option>
                    <option value="İşyeri Yangını">İşyeri Yangını</option>
                    <option value="Kurtarma Operasyonları">Kurtarma Operasyonları</option>
                  </optgroup>
                  <optgroup label="🟢 Düşük (Seviye 1)" className="bg-slate-900 text-emerald-500">
                    <option value="Çöp Yangını">Çöp Yangını</option>
                    <option value="Ot/Anız Yangını">Ot/Anız Yangını</option>
                    <option value="Kapı Açma">Kapı Açma</option>
                    <option value="Hayvan Kurtarma">Hayvan Kurtarma</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Mahalle</label>
                  <Input 
                    value={incidentForm.mahalle} 
                    onChange={(e) => setIncidentForm({...incidentForm, mahalle: e.target.value})} 
                    required 
                    className="h-11 rounded-xl bg-slate-950/80 border-white/10 text-white placeholder:text-slate-600 focus:ring-danger" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Adres / Konum Detayı</label>
                  <Input 
                    value={incidentForm.adres} 
                    onChange={(e) => setIncidentForm({...incidentForm, adres: e.target.value})} 
                    required 
                    className="h-11 rounded-xl bg-slate-950/80 border-white/10 text-white placeholder:text-slate-600 focus:ring-danger" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Çıkış Yapacak Araçlar (Birden fazla seçilebilir)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-white/10 rounded-xl bg-slate-950/60 p-2 max-h-[140px] overflow-y-auto">
                  {vehicles.map(v => {
                    const isSelected = selectedVehiclePlakas.includes(v.plaka);
                    return (
                      <label
                        key={v.plaka}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border text-xs ${
                          isSelected
                            ? 'bg-danger/10 border-danger/40 text-white'
                            : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleVehicleToggle(v.plaka, e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-danger focus:ring-danger w-3.5 h-3.5"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold">{v.plaka}</span>
                            <span className="text-[10px] opacity-75">{v.arac_tipi}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          v.durum === 'Bakımda' || v.status === 'maintenance'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {v.durum === 'Bakımda' || v.status === 'maintenance' ? 'BAKIMDA' : 'AKTİF'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col min-h-[220px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span>Aktif Nöbetçi Personeller (Posta {activePostaNumber})</span>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-300">
                      Seçili: {checkedPersonnel.length}
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const allSicils = sortedMufrezePersonnel.map(p => p.sicil_no);
                        setCheckedPersonnel(allSicils);
                      }}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-white/5 px-2 py-1 rounded border border-cyan-500/20 cursor-pointer"
                    >
                      Tümünü Seç
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckedPersonnel([])}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors bg-white/5 px-2 py-1 rounded border border-rose-500/20 cursor-pointer"
                    >
                      Temizle
                    </button>
                  </div>
                </div>

                {/* Personel Arama Kutusu */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Personel ara (İsim, soyisim veya sicil no)..."
                    value={personnelSearch}
                    onChange={(e) => setPersonnelSearch(e.target.value)}
                    className="w-full h-9 rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-8 text-xs text-white focus:outline-none focus:ring-1 focus:ring-danger"
                  />
                  {personnelSearch && (
                    <button
                      type="button"
                      onClick={() => setPersonnelSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs border-0 bg-transparent cursor-pointer"
                    >
                      Temizle
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-slate-950/60 p-2 space-y-1.5 max-h-[220px]">
                  {filteredPersonnel.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-6">
                      {personnelSearch ? 'Arama kriterine uygun nöbetçi personel bulunamadı.' : 'Aktif nöbetçi posta personeli bulunamadı.'}
                    </div>
                  ) : (
                    filteredPersonnel.map(p => {
                      const isChecked = checkedPersonnel.includes(p.sicil_no);
                      const activeStations = vehicles
                        .filter(v => selectedVehiclePlakas.includes(v.plaka))
                        .map(v => v.istasyon || "")
                        .filter(Boolean)
                        .map(s => s.toLowerCase().split(' ')[0]);
                      
                      const isSameStation = p.istasyon && activeStations.includes(p.istasyon.toLowerCase().split(' ')[0]);
                      
                      return (
                        <label 
                          key={p.id} 
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                            isChecked 
                              ? 'bg-danger/10 border-danger/40 text-white' 
                              : isSameStation 
                                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200' 
                                : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCheckedPersonnel(prev => [...prev, p.sicil_no]);
                                } else {
                                  setCheckedPersonnel(prev => prev.filter(id => id !== p.sicil_no));
                                }
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-danger focus:ring-danger w-4 h-4"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold">{p.ad} {p.soyad}</span>
                              <span className="text-[10px] opacity-75">{p.sicil_no} - {p.rol}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
                              {p.istasyon || 'İstasyon Belirtilmemiş'}
                            </span>
                            {isSameStation && (
                              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Aynı Şube
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowModal('none')} className="border-white/10 text-slate-300 hover:bg-white/10">
                  İptal
                </Button>
                <Button type="submit" className="bg-danger hover:bg-danger/90 text-white font-semibold" disabled={isSubmitting || selectedVehiclePlakas.length === 0}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flame className="w-4 h-4 mr-2" />}
                  Müfreze Çıkışını Başlat
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
    </PageGuard>
  )
}

export default function HaritaPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-surface/50 border rounded-xl border-dashed">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-sm font-medium text-muted-foreground">Harita Yükleniyor...</span>
      </div>
    }>
      <HaritaContent />
    </Suspense>
  )
}
