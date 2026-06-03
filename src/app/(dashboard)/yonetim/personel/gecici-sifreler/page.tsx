"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Key, Loader2, ShieldAlert, RefreshCcw, CheckCircle2, Copy, Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'

interface TempPasswordRow {
  sicil_no: string
  username: string | null
  ad: string
  soyad: string
  plain_password: string
  created_at: string
  created_by: string
  used: boolean
}

export default function GeciciSifrelerPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<TempPasswordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [resetting, setResetting] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ sicil: string; password: string } | null>(null)
  const [copiedSicil, setCopiedSicil] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/auth/temp-passwords', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || 'Veriler yüklenemedi.')
        return
      }
      setData(json.data || [])
    } catch (err: any) {
      setError('Sunucu bağlantı hatası.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleReset = async (sicil_no: string) => {
    setResetting(sicil_no)
    setResetResult(null)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sicil_no }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || 'Şifre sıfırlama başarısız.')
        return
      }
      setResetResult({ sicil: sicil_no, password: json.newPassword })
      await fetchData()
    } catch (err: any) {
      setError('Sunucu bağlantı hatası.')
    } finally {
      setResetting(null)
    }
  }

  const copyPassword = (sicil: string, password: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(password)
      setCopiedSicil(sicil)
      setTimeout(() => setCopiedSicil(null), 2000)
    }
  }

  // Access guard
  if (user?.rol !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-slate-400 text-sm font-semibold">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    )
  }

  const filtered = data.filter(row => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      row.sicil_no.toLowerCase().includes(q) ||
      (row.username || '').toLowerCase().includes(q) ||
      row.ad.toLowerCase().includes(q) ||
      row.soyad.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geçici Şifreler</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Admin tarafından sıfırlanan geçici personel şifreleri.
          </p>
        </div>
        <Button onClick={fetchData} variant="secondary" size="sm" className="gap-1.5 shrink-0">
          <RefreshCcw className="w-3.5 h-3.5" /> Yenile
        </Button>
      </div>

      {/* Reset Result Banner */}
      {resetResult && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">{resetResult.sicil}</span> için yeni geçici şifre:
            <span className="ml-2 font-mono font-black text-emerald-300 text-base tracking-widest">{resetResult.password}</span>
          </div>
          <button
            onClick={() => copyPassword(resetResult.sicil, resetResult.password)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-pointer"
          >
            {copiedSicil === resetResult.sicil ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-100">Geçici Şifre Kayıtları</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toplam {data.length} kayıt bulunmaktadır.
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Sicil, kullanıcı adı veya isim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-slate-950/60 border-slate-800 focus:border-amber-500 focus:ring-amber-500/20 rounded-lg text-slate-100 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground text-sm">Geçici şifreler yükleniyor...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Key className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-semibold">
                {searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz geçici şifre kaydı bulunmuyor.'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Personel yönetimi sayfasından şifre sıfırlama işlemi yapabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/30">
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sicil No</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kullanıcı Adı</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ad Soyad</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Geçici Şifre</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.sicil_no}
                      className="border-b border-slate-800/50 hover:bg-slate-900/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-200 text-xs">{row.sicil_no}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 text-xs">{row.username || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-200 text-xs">{row.ad} {row.soyad}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 tracking-widest text-sm">{row.plain_password}</span>
                          <button
                            onClick={() => copyPassword(row.sicil_no, row.plain_password)}
                            className="p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-all cursor-pointer"
                            title="Kopyala"
                          >
                            {copiedSicil === row.sicil_no ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.used ? (
                          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px]">Kullanıldı</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px]">Aktif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(row.sicil_no)}
                          disabled={resetting === row.sicil_no}
                          className="gap-1.5 h-7 text-[10px] bg-slate-950/40 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                        >
                          {resetting === row.sicil_no ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Key className="w-3 h-3" />
                          )}
                          Şifreyi Sıfırla
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safe area bottom padding */}
      <div className="pb-[calc(8rem+env(safe-area-inset-bottom))]" />
    </div>
  )
}
