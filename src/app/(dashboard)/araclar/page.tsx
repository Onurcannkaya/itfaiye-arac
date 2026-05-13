"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { VehicleCard } from "@/components/vehicle/VehicleCard"

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVehicles() {
      const { data } = await api.from('vehicles').select('*')
      setVehicles(data || [])
      setLoading(false)
    }
    fetchVehicles()
  }, [])

  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Araçlar ve Envanter</h1>
        <p className="text-muted-foreground mt-1 text-sm">İstasyondaki araçların listesi ve anlık envanter durumları.</p>
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Araçlar yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {vehicles.map(v => (
            <VehicleCard key={v.plaka} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  )
}
