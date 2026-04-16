import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Truck } from "lucide-react"
import Link from "next/link"
import { Vehicle } from "@/types"

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const idStr = vehicle.plaka.replace(/\s+/g, '-').toLowerCase()
  
  return (
    <Link href={`/araclar/${idStr}`}>
      <Card className="hover:border-primary/40 transition-all duration-200 cursor-pointer group hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                 <Truck className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div>
                 <h3 className="font-bold text-lg">{vehicle.plaka}</h3>
                 <p className="text-muted-foreground text-sm line-clamp-1">{vehicle.aracTipi}</p>
              </div>
            </div>
            <Badge variant="success" className="shadow-sm">Aktif</Badge>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Zimmetli Personel</p>
            <div className="flex flex-wrap gap-2">
                {vehicle.aktifPersonel.map(person => (
                <Badge key={person} variant="outline" className="text-[10px] bg-muted/50">{person}</Badge>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
