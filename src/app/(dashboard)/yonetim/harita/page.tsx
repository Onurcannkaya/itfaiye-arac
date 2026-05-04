"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Loader2, Map as MapIcon, Flame, Droplets, Target } from "lucide-react"

// Leaflet haritasını Client-Side Render (SSR: false) ile yükle
const Map = dynamic(() => import("@/components/map/Map"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface/50 border rounded-xl border-dashed">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
      <span className="text-sm font-medium text-muted-foreground">Harita Yükleniyor...</span>
    </div>
  )
})

type Incident = any;
type Hydrant = any;

export default function HaritaPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [hydrants, setHydrants] = useState<Hydrant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      // Vaka verilerini çek
      const { data: incData } = await supabase
        .from('incidents')
        .select('*')
        .not('location', 'is', null) // Sadece konumu olanları getir
      
      // Hidrant verilerini çek
      const { data: hydData } = await supabase
        .from('fire_hydrants')
        .select('*')

      if (incData) setIncidents(incData)
      if (hydData) setHydrants(hydData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapIcon className="w-6 h-6 text-primary" /> Komuta Kontrol Haritası (CBS)</h1>
          <p className="text-muted-foreground text-sm">Vaka yoğunlukları ve su ikmal noktaları mekansal analizi</p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface px-4 py-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger"></div>
            <span className="text-sm font-medium">{incidents.length} Vaka</span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium">{hydrants.length} Hidrant</span>
          </div>
        </div>
      </div>

      {/* Harita Konteyneri */}
      <Card className="flex-1 border-border overflow-hidden shadow-md">
        <CardContent className="p-0 h-full w-full relative">
          
          {/* Overlay Kontrolleri (İleride filtreleme için kullanılabilir) */}
          <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
            <div className="bg-background/90 backdrop-blur-md border shadow-lg rounded-xl p-3 space-y-2 w-48">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">Katmanlar</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2"><Flame className="w-4 h-4 text-danger" /> Vakalar</span>
                <Badge variant="outline" className="bg-danger/10 text-danger border-none">{incidents.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /> Hidrantlar</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none">{hydrants.length}</Badge>
              </div>

              <div className="flex items-center justify-between opacity-50">
                <span className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4 text-warning" /> Riskli Bölgeler</span>
                <Badge variant="outline">0</Badge>
              </div>
            </div>
          </div>

          <Map incidents={incidents} hydrants={hydrants} />
          
        </CardContent>
      </Card>
    </div>
  )
}
