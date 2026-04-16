import { InventoryItem } from "@/types"
import { Badge } from "@/components/ui/Badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export function InventoryList({ items }: { items: InventoryItem[] }) {
  if (!items || items.length === 0) {
    return <p className="text-muted-foreground text-sm p-4">Bu bölmede kayıtlı malzeme bulunmuyor.</p>
  }

  return (
    <ul className="divide-y divide-border/30">
      {items.map((item, idx) => {
        const isOk = item.durum === 'Tam'
        return (
          <li key={idx} className="flex items-center justify-between py-3.5 px-4 sm:px-6 hover:bg-muted/20 transition-colors">
            <div className="flex items-center space-x-4">
              {isOk ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 drop-shadow-sm" />
              ) : (
                <AlertCircle className="w-5 h-5 text-danger shrink-0 drop-shadow-sm" />
              )}
              <div>
                <p className="text-sm font-semibold">{item.malzeme}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Miktar: {item.adet}</p>
              </div>
            </div>
            {!isOk && (
              <Badge variant="danger" className="text-[10px] shrink-0 ml-2 animate-pulse shadow-sm">
                {item.durum}
              </Badge>
            )}
          </li>
        )
      })}
    </ul>
  )
}
