import { mockPersonnel } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { User, Shield, Car, Flame } from "lucide-react"

const ROL_LABEL: Record<string, string> = {
  sistem_yoneticisi: "Sistem Yöneticisi",
  vardiya_cavusu: "Vardiya Çavuşu",
  sofor: "Şoför",
  itfaiye_eri: "İtfaiye Eri",
}

const ROL_ICON: Record<string, React.ReactNode> = {
  sistem_yoneticisi: <Shield className="w-5 h-5" />,
  vardiya_cavusu: <Shield className="w-5 h-5" />,
  sofor: <Car className="w-5 h-5" />,
  itfaiye_eri: <Flame className="w-5 h-5" />,
}

export default function PersonelPage() {
  const sergeants = mockPersonnel.filter(p => p.rol === "vardiya_cavusu")
  const others = mockPersonnel.filter(p => p.rol !== "vardiya_cavusu").sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
  const sorted = [...sergeants, ...others]

  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Personel Listesi</h1>
        <p className="text-muted-foreground mt-1 text-sm">İstasyondaki tüm personelin roller ve posta bilgileri. Çavuşlar en üstte sabitlenmiştir.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(p => {
          const isCavus = p.rol === "vardiya_cavusu"
          return (
            <Card key={p.sicil_no} className={`transition-all hover:shadow-md ${isCavus ? "border-primary/30 bg-primary/[0.03]" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${isCavus ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.ad[0]}{p.soyad[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate">{p.ad} {p.soyad}</h3>
                      {isCavus && <Badge variant="default" className="text-[10px]">Çavuş</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{ROL_LABEL[p.rol] || p.rol}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <span className="text-xs text-muted-foreground font-mono">{p.sicil_no}</span>
                      <Badge variant="outline" className="text-[10px]">{p.posta}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
