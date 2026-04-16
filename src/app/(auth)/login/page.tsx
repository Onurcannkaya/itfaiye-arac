"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [sicilNo, setSicilNo] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Demo modu: Supabase entegrasyonu sonradan eklenecek.
    await new Promise(r => setTimeout(r, 600))
    router.push("/")
  }

  return (
    <Card className="w-full border-primary/20 shadow-2xl shadow-primary/5">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center items-center gap-4 mb-4">
          <Image src="/logo-belediye.png" alt="Sivas Belediyesi" width={64} height={64} className="object-contain" />
          <Image src="/logo-itfaiye.png" alt="Sivas İtfaiyesi" width={64} height={64} className="object-contain" />
        </div>
        <CardTitle className="text-2xl">Sivas İtfaiyesi</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">Araç ve Envanter Yönetim Portalı</p>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sicil Numarası</label>
              <Input 
                  placeholder="Örn: SIV-0042" 
                  value={sicilNo}
                  onChange={(e) => setSicilNo(e.target.value)}
                  required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Parola</label>
              <Input 
                  type="password" 
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
              />
            </div>
        </CardContent>
        <CardFooter>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                "Sisteme Giriş Yap"
              )}
            </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

