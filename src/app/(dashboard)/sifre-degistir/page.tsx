"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/authStore'
import { Key, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert, User } from 'lucide-react'

export default function SifreDegistirPage() {
  const { user } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Lütfen tüm alanları doldurun.")
      return
    }

    if (newPassword.length < 4) {
      setError("Yeni parola en az 4 karakter olmalıdır.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Yeni parolalar uyuşmuyor.")
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error || 'Parola değiştirme işlemi başarısız.')
        return
      }

      setSuccess("Parolanız başarıyla güncellenmiştir.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError("Sunucuyla bağlantı kurulamadı.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 py-6 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Güvenlik Ayarları</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hesap güvenliğiniz için şifrenizi buradan yenileyebilirsiniz.
        </p>
      </div>

      {user && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Aktif Kullanıcı</p>
            <p className="text-sm font-bold text-slate-200">{user.ad} {user.soyad} ({user.sicilNo})</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
              <Key className="w-5 h-5" />
            </div>
            <CardTitle className="text-base font-bold text-slate-100">Şifre Güncelleme</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Mevcut Şifre */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Mevcut Şifre</label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Mevcut şifrenizi girin"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 pr-10 text-slate-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Yeni Şifre */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Yeni Şifre</label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="En az 4 karakter"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 pr-10 text-slate-200"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Yeni Şifre Tekrar */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Yeni Şifre Tekrar</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Yeni şifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 pr-10 text-slate-200"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition duration-200 shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                "Parolayı Güncelle"
              )}
            </Button>

          </form>
        </CardContent>
      </Card>

      {/* Safe area padding */}
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))]" />
    </div>
  )
}
