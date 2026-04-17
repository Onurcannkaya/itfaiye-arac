"use client"
import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Loader2, ShieldAlert, LogIn } from "lucide-react"
import Image from "next/image"
import { useAuthStore } from "@/lib/authStore"

function LoginForm() {
  const [sicilNo, setSicilNo] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, setRedirectUrl } = useAuthStore()

  // If user is already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get("redirect") || "/"
      router.push(redirect)
    }
  }, [isAuthenticated, router, searchParams])

  // Store redirect URL from query param
  useEffect(() => {
    const redirect = searchParams.get("redirect")
    if (redirect) {
      setRedirectUrl(redirect)
    }
  }, [searchParams, setRedirectUrl])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Small delay for UX
    await new Promise(r => setTimeout(r, 500))

    const result = login(sicilNo, password)

    if (result.success) {
      const redirect = searchParams.get("redirect") || "/"
      router.push(redirect)
    } else {
      setError(result.error || "Giriş başarısız.")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full border-primary/20 shadow-2xl shadow-primary/5 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center items-center gap-5 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border/50 bg-white flex items-center justify-center shrink-0 shadow-lg">
            <Image src="/logo-belediye.png" alt="Sivas Belediyesi" width={56} height={56} className="object-contain" />
          </div>
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border/50 bg-white flex items-center justify-center shrink-0 shadow-lg">
            <Image src="/logo-itfaiye.png" alt="Sivas İtfaiyesi" width={56} height={56} className="object-contain" />
          </div>
        </div>
        <CardTitle className="text-2xl">Sivas İtfaiyesi</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">Araç ve Envanter Yönetim Portalı</p>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4 pt-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Redirect Notice */}
            {searchParams.get("redirect") && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="text-xs">Bu sayfaya erişmek için giriş yapmanız gerekiyor.</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Sicil Numarası</label>
              <Input 
                  placeholder="Örn: SB5801" 
                  value={sicilNo}
                  onChange={(e) => setSicilNo(e.target.value)}
                  required
                  className="font-mono tracking-wider"
              />
              <p className="text-[10px] text-muted-foreground">Demo: SB5801 — SB5830 arası kullanabilirsiniz.</p>
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
              <p className="text-[10px] text-muted-foreground">Demo parola: <code className="bg-muted px-1 rounded">1234</code></p>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
