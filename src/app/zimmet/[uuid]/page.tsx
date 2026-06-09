"use client"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { 
  ShieldCheck, 
  Calendar, 
  User, 
  Clock, 
  Building, 
  Phone, 
  Hammer, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle,
  ArrowLeft,
  Truck
} from "lucide-react"
import Link from "next/link"

export default function ZimmetTakipPage() {
  const params = useParams()
  const uuid = params.uuid as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [assignment, setAssignment] = useState<any>(null)
  const [material, setMaterial] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      if (!uuid) return
      setLoading(true)
      try {
        const { data: assignments, error: err } = await api
          .from("temporary_assignments")
          .select("*")
          .eq("uuid", uuid)
          .single()

        if (err || !assignments) {
          throw new Error("Geçersiz veya bulunamayan zimmet takip kodu.")
        }

        setAssignment(assignments)

        const { data: matData } = await api
          .from("inventory")
          .select("*")
          .eq("id", assignments.malzeme_id)
          .single()

        setMaterial(matData)
      } catch (e: any) {
        setError(e.message || "Veriler yüklenirken hata oluştu.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [uuid])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto" />
          <p className="font-mono text-sm tracking-wider text-cyan-400">ZİMMET VERİLERİ DOĞRULANIYOR...</p>
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 p-4">
        <Card className="max-w-md w-full border-red-500/30 bg-slate-900/40 backdrop-blur-md text-center p-6 rounded-2xl shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-red-400 tracking-wide">Doğrulama Başarısız</h2>
          <p className="text-sm text-slate-400 mt-2">
            {error || "Tarattığınız QR koda ait geçici zimmet kaydı sistemde bulunamadı."}
          </p>
          <div className="pt-6">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Ana Sayfaya Dön
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const isOverdue = assignment.durum === "GECIKTI"
  const isReturned = assignment.durum === "IADE_EDILDI"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* High-tech tactical grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      {isOverdue && (
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />
      )}

      <div className="w-full max-w-lg space-y-6 relative z-10">
        
        {/* Header logos */}
        <div className="flex justify-center items-center gap-4 border-b border-white/10 pb-4">
          <img src="/logo-belediye.png" className="w-14 h-14 object-contain" alt="Sivas Belediyesi" />
          <div className="text-center">
            <h1 className="text-sm font-black tracking-widest text-slate-300">SİVAS BELEDİYESİ</h1>
            <h2 className="text-xs font-bold tracking-widest text-slate-400">İTFAİYE MÜDÜRLÜĞÜ</h2>
          </div>
          <img src="/logo-itfaiye.png" className="w-14 h-14 object-contain" alt="Sivas İtfaiyesi" />
        </div>

        {/* Verification Status Card */}
        <Card className={`border-2 backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl transition-all ${
          isReturned 
            ? 'border-emerald-500/30 bg-emerald-950/5' 
            : isOverdue 
              ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
              : 'border-cyan-500/30 bg-cyan-950/5'
        }`}>
          <CardHeader className="bg-slate-900/60 border-b border-white/5 p-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className={`w-5 h-5 ${isReturned ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-cyan-400'}`} />
              <span>Resmi Evrak Doğrulandı</span>
            </CardTitle>
            <Badge 
              variant={isReturned ? "success" : isOverdue ? "danger" : "default"}
              className={`font-bold uppercase font-mono px-3 py-1 text-xs ${
                isReturned 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                  : isOverdue 
                    ? 'bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse' 
                    : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
              }`}
            >
              {assignment.durum === 'AKTIF' ? 'AKTİF ZİMMET' : isReturned ? 'İADE EDİLDİ' : 'GECİKMİŞ'}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Material info banner */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Malzeme Adı / Cinsi</span>
                <p className="font-extrabold text-slate-100 text-lg mt-0.5">{material?.malzeme_adi || "Bilinmeyen Malzeme"}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Miktar</span>
                <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-xl text-sm font-black">
                  1 Adet
                </span>
              </div>
            </div>

            {/* Recipient info details list */}
            <div className="space-y-4 font-sans text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Teslim Edilen Tip</span>
                    <span className="font-semibold text-slate-200">
                      {assignment.teslim_edilen_tip === 'PERSONEL' ? 'Personel' : 
                       assignment.teslim_edilen_tip === 'ARAC' ? 'Araç' : 'Dış Birim / Kurum'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Birim / Kişi Adı</span>
                    <span className="font-semibold text-slate-200">{assignment.birim_adi}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Zimmet Tarihi</span>
                    <span className="font-semibold text-slate-200">
                      {new Date(assignment.teslim_tarihi).toLocaleDateString("tr-TR", { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Tahmini İade Tarihi</span>
                    <span className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-slate-200'}`}>
                      {new Date(assignment.tahmini_iade_tarihi).toLocaleDateString("tr-TR", { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Neon alerts if overdue */}
            {isOverdue && (
              <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-2xl flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Gecikme Uyarısı</p>
                  <p className="text-slate-300 leading-relaxed">
                    Bu malzemenin tahmini iade süresi dolmuştur. Lütfen İtfaiye Lojistik Merkezi ile iletişime geçerek iade işlemlerini gerçekleştirin veya zimmeti uzatın.
                  </p>
                </div>
              </div>
            )}

            {/* Official verification tag */}
            <div className="text-center pt-2 font-mono text-[9px] text-slate-600 border-t border-white/5 space-y-1">
              <p>Döküman Doğrulama Sistemi © 2026 Sivas İtfaiyesi</p>
              <p>Zimmet UUID: {assignment.uuid}</p>
            </div>

          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors font-semibold">
            Sivas Belediyesi Akıllı İtfaiye Portalı
          </Link>
        </div>

      </div>
    </div>
  )
}
