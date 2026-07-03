"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Key, Loader2, ShieldAlert, RefreshCcw, CheckCircle2, Copy, Check, Search, Download, Printer } from 'lucide-react'
import { Input } from '@/components/ui/Input'

const normalizeTextForSearch = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g").replace(/Ğ/g, "g")
    .replace(/ü/g, "u").replace(/Ü/g, "u")
    .replace(/ş/g, "s").replace(/Ş/g, "s")
    .replace(/ö/g, "o").replace(/Ö/g, "o")
    .replace(/ç/g, "c").replace(/Ç/g, "c")
    .toLowerCase();
}

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

  const downloadCSV = () => {
    const headers = ["Sicil No", "Kullanici Adi", "Ad Soyad", "Gecici Sifre", "Durum", "Olusturulma Tarihi"]
    const rows = filtered.map(row => [
      row.sicil_no,
      row.username || '—',
      `${row.ad} ${row.soyad}`,
      row.plain_password,
      row.used ? "Kullanildi" : "Aktif",
      new Date(row.created_at).toLocaleDateString('tr-TR')
    ])

    const csvContent = [
      headers.join(";"),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(";"))
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `gecici_sifreler_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = filtered.map(row => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-family: monospace; font-weight: bold;">${row.sicil_no}</td>
        <td style="padding: 10px;">${row.ad} ${row.soyad}</td>
        <td style="padding: 10px;">${row.username || '—'}</td>
        <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #b45309; letter-spacing: 2px;">${row.plain_password}</td>
        <td style="padding: 10px;">${row.used ? 'Kullanıldı' : 'Aktif'}</td>
        <td style="padding: 10px; font-size: 11px;">${new Date(row.created_at).toLocaleDateString('tr-TR')}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Geçici Şifre Teslim Listesi</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 20px; margin: 5px 0; text-transform: uppercase; }
            .header h2 { font-size: 16px; margin: 5px 0; font-weight: normal; }
            .meta-info { margin-bottom: 20px; font-size: 14px; display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { border-bottom: 2px solid #333; padding: 10px; text-align: left; background-color: #f5f5f5; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; font-size: 14px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { margin-top: 60px; border-top: 1px solid #333; padding-top: 5px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>T.C. SİVAS BELEDİYESİ</h1>
            <h2>İtfaiye Müdürlüğü Bilgi İşlem Birimi</h2>
            <h2 style="font-weight: bold; margin-top: 15px;">PERSONEL GEÇİCİ ŞİFRE TESLİM FORMU</h2>
          </div>
          <div class="meta-info">
            <div><strong>Tarih:</strong> \${new Date().toLocaleDateString('tr-TR')}</div>
            <div><strong>Teslim Eden Amir:</strong> \${user?.ad} \${user?.soyad}</div>
          </div>
          <p style="font-size: 14px; line-height: 1.5;">
            Aşağıda sicil numaraları ve isimleri belirtilen personellere ait geçici sistem giriş şifreleri, 
            güvenli bir şekilde teslim edilmek üzere imza altına alınmıştır. Şifrelerin ilk girişten sonra değiştirilmesi zorunludur.
          </p>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Sicil No</th>
                <th style="width: 25%;">Ad Soyad</th>
                <th style="width: 20%;">Kullanıcı Adı</th>
                <th style="width: 15%;">Geçici Şifre</th>
                <th style="width: 13%;">Durum</th>
                <th style="width: 12%;">Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              \${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <div class="signature-box">
              <strong>TESLİM EDEN</strong>
              <div style="font-size: 12px; margin-top: 5px;">\${user?.ad} \${user?.soyad}</div>
              <div class="signature-line">İmza</div>
            </div>
            <div class="signature-box">
              <strong>TESLİM ALAN</strong>
              <div style="font-size: 12px; margin-top: 5px;">Sorumlu Amir</div>
              <div class="signature-line">İmza</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Access guard
  if (user?.rol !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-[var(--fd-danger)] mx-auto" />
          <p className="text-[var(--fd-text3)] text-sm font-semibold">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    )
  }

  const filtered = data.filter(row => {
    if (!searchQuery) return true
    const q = normalizeTextForSearch(searchQuery)
    return (
      normalizeTextForSearch(row.sicil_no).includes(q) ||
      normalizeTextForSearch(row.username || '').includes(q) ||
      normalizeTextForSearch(row.ad).includes(q) ||
      normalizeTextForSearch(row.soyad).includes(q)
    )
  })


  return (
    <div className="space-y-[var(--fd-sp)] animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[calc(var(--fd-fs)*1.7)] font-bold tracking-tight text-[var(--fd-text)]">Geçici Şifreler</h1>
          <p className="text-[var(--fd-text3)] text-sm mt-1">
            Admin tarafından sıfırlanan geçici personel şifreleri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button onClick={downloadCSV} variant="outline" size="sm" className="gap-1.5 rounded-[var(--fd-r-sm)]">
            <Download className="w-3.5 h-3.5 text-[var(--fd-info)]" /> Excel/CSV İndir
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 rounded-[var(--fd-r-sm)]">
            <Printer className="w-3.5 h-3.5 text-[var(--fd-amber)]" /> Resmi Evrak Yazdır (PDF)
          </Button>
          <Button onClick={fetchData} variant="secondary" size="sm" className="gap-1.5 rounded-[var(--fd-r-sm)]">
            <RefreshCcw className="w-3.5 h-3.5" /> Yenile
          </Button>
        </div>
      </div>

      {/* Reset Result Banner */}
      {resetResult && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--fd-r)] bg-[var(--fd-success)]/10 border border-[var(--fd-success)]/20 text-[var(--fd-success)] text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">{resetResult.sicil}</span> için yeni geçici şifre:
            <span className="ml-2 font-mono font-bold text-[var(--fd-success)] text-base tracking-widest">{resetResult.password}</span>
          </div>
          <button
            onClick={() => copyPassword(resetResult.sicil, resetResult.password)}
            className="p-2 rounded-[var(--fd-r-sm)] bg-[var(--fd-surface2)] border border-[var(--fd-border)] text-[var(--fd-text3)] hover:text-[var(--fd-success)] hover:border-[var(--fd-success)]/30 transition-all cursor-pointer"
          >
            {copiedSicil === resetResult.sicil ? <Check className="w-4 h-4 text-[var(--fd-success)]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--fd-r)] bg-[var(--fd-danger)]/10 border border-[var(--fd-danger)]/20 text-[var(--fd-danger)] text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <Card className="shadow-[var(--fd-shadow-lg)] overflow-hidden">
        <CardHeader className="pb-3 border-b border-[var(--fd-border)]/50 bg-[var(--fd-surface2)]/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--fd-amber)]/10 rounded-[var(--fd-r-sm)] text-[var(--fd-amber)]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-[calc(var(--fd-fs)*1.02)] font-bold text-[var(--fd-text)]">Geçici Şifre Kayıtları</CardTitle>
                <p className="text-[calc(var(--fd-fs)*0.74)] text-[var(--fd-text3)] mt-0.5">
                  Toplam {data.length} kayıt bulunmaktadır.
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fd-text3)]" />
              <Input
                placeholder="Sicil, kullanıcı adı veya isim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-[var(--fd-surface)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--fd-accent)] mx-auto" />
                <p className="text-[var(--fd-text3)] text-sm">Geçici şifreler yükleniyor...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Key className="w-10 h-10 text-[var(--fd-text3)] mb-3" />
              <p className="text-[var(--fd-text2)] text-sm font-semibold">
                {searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz geçici şifre kaydı bulunmuyor.'}
              </p>
              <p className="text-[var(--fd-text3)] text-xs mt-1">
                Personel yönetimi sayfasından şifre sıfırlama işlemi yapabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--fd-border)] bg-[var(--fd-surface2)]">
                    <th className="text-left px-4 py-3 text-[calc(var(--fd-fs)*0.74)] font-bold text-[var(--fd-text3)] uppercase tracking-[0.04em]">Sicil No</th>
                    <th className="text-left px-4 py-3 text-[calc(var(--fd-fs)*0.74)] font-bold text-[var(--fd-text3)] uppercase tracking-[0.04em]">Kullanıcı Adı</th>
                    <th className="text-left px-4 py-3 text-[calc(var(--fd-fs)*0.74)] font-bold text-[var(--fd-text3)] uppercase tracking-[0.04em]">Ad Soyad</th>
                    <th className="text-left px-4 py-3 text-[calc(var(--fd-fs)*0.74)] font-bold text-[var(--fd-text3)] uppercase tracking-[0.04em]">Geçici Şifre</th>
                    <th className="text-left px-4 py-3 text-[calc(var(--fd-fs)*0.74)] font-bold text-[var(--fd-text3)] uppercase tracking-[0.04em]">Durum</th>
                    <th className="text-right px-4 py-3 text-[calc(var(--fd-fs)*0.74)] font-bold text-[var(--fd-text3)] uppercase tracking-[0.04em]">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.sicil_no}
                      className="border-b border-[var(--fd-border)]/50 hover:bg-[var(--fd-surface2)]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[var(--fd-text)] text-xs">{row.sicil_no}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[var(--fd-text2)] text-xs">{row.username || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[var(--fd-text)] text-xs">{row.ad} {row.soyad}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--fd-amber)] tracking-[0.1em] text-sm">{row.plain_password}</span>
                          <button
                            onClick={() => copyPassword(row.sicil_no, row.plain_password)}
                            className="p-1 rounded-[var(--fd-r-sm)] hover:bg-[var(--fd-surface3)] text-[var(--fd-text3)] hover:text-[var(--fd-accent)] transition-all cursor-pointer"
                            title="Kopyala"
                          >
                            {copiedSicil === row.sicil_no ? <Check className="w-3 h-3 text-[var(--fd-success)]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.used ? (
                          <Badge variant="muted">Kullanıldı</Badge>
                        ) : (
                          <Badge variant="warning">Aktif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(row.sicil_no)}
                          disabled={resetting === row.sicil_no}
                          className="gap-1.5 h-7 text-[10px] rounded-[var(--fd-r-sm)]"
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
