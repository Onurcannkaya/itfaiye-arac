import { createClient } from "@/lib/supabase/server"
import { VehicleCard } from "@/components/vehicle/VehicleCard"

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('vehicles').select('*')
  const vehicles = data || []

  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Araçlar ve Envanter</h1>
        <p className="text-muted-foreground mt-1 text-sm">İstasyondaki araçların listesi ve anlık envanter durumları.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vehicles.map(v => (
          <VehicleCard key={v.plaka} vehicle={v} />
        ))}
      </div>
    </div>
  )
}
