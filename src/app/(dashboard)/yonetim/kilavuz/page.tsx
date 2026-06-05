"use client"

import PageGuard from "@/components/PageGuard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { BookOpen, Award, ArrowRight, ShieldCheck, Flame } from "lucide-react"

export default function KilavuzPage() {
  return (
    <PageGuard pageId="kilavuz">
      <div className="flex flex-col min-h-screen space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-8 max-w-[1200px] mx-auto w-full px-4 sm:px-0">
        
        {/* Header Section */}
        <div className="border-b border-white/10 pb-5">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <BookOpen className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            📖 Teşkilat Kullanım Kılavuzu
          </h1>
          <p className="text-slate-400 mt-2 text-base md:text-lg font-medium">
            Sivas İtfaiyesi personelinin sistemi sıfır hata ile kullanabilmesi için hazırlanmış en sade rehberdir.
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="bg-slate-950/80 backdrop-blur-lg border border-slate-900 shadow-xl rounded-2xl">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">Değerli Teşkilat Mensubumuz,</h2>
              <p className="text-sm text-slate-400 leading-relaxed mt-1">
                Aşağıdaki adımları telsiz mandalına basıp konuşmak kadar kolay ve sade kurguladık. Teknik detaylar veya karmaşık terimler olmadan, görevinizi başarıyla yerine getirmeniz için bu adımları takip etmeniz yeterlidir.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Step 1 */}
          <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
            <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
              <CardTitle className="text-xl md:text-2xl font-black text-cyan-400 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-400/10 text-cyan-400 text-sm font-bold border border-cyan-400/20">1</span>
                Göreve Başlama (Nöbet Girişi)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-semibold">
                Ekranın en üst sağ köşesindeki mavi renkli <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">[🚀 Görevi Başlat]</span> butonuna bir kez basın. Sistem sizin o an nöbete girdiğinizi kaydeder. Nöbetiniz bitene kadar bu buton yeşil renkte parıldar.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs md:text-sm text-slate-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Nöbete girişiniz yapıldığında isminiz canlı vardiya listesinde aktif görünür.</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
            <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
              <CardTitle className="text-xl md:text-2xl font-black text-cyan-400 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-400/10 text-cyan-400 text-sm font-bold border border-cyan-400/20">2</span>
                Araç İçi Malzeme Sayımı
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-semibold">
                Sol menüden <span className="text-slate-100 font-bold underline">Envanter Yönetimi</span> sayfasına girin. Yukarıdaki listeden aracınızın plakasını seçin. Karşınıza gelen listede eksik veya hasarlı malzeme varsa ilgili kutucuktaki sayıyı değiştirin ve en alttaki kırmızı <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">[💾 Kaydet]</span> butonuna basın. İşte bu kadar!
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs md:text-sm text-slate-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Yapılan sayımlar anında kaydedilerek komuta kontrol merkezine raporlanır.</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
            <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
              <CardTitle className="text-xl md:text-2xl font-black text-cyan-400 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-400/10 text-cyan-400 text-sm font-bold border border-cyan-400/20">3</span>
                Nöbeti Devretme (Görev Bitirme)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-semibold">
                Nöbet süreniz dolduğunda veya göreviniz bittiğinde, yine sağ üstteki kırmızı renkli <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">[🛑 Görevi Bitir]</span> butonuna basın. Sistem mesainizi hesaplar ve adınızı canlı nöbet listesinden güvenle kaldırır.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs md:text-sm text-slate-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Görevi bitirdiğinizde günlük çalışma süreniz otomatik olarak çizelgeye işlenir.</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 4 */}
          <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
            <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
              <CardTitle className="text-xl md:text-2xl font-black text-cyan-400 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-400/10 text-cyan-400 text-sm font-bold border border-cyan-400/20">4</span>
                Şifre Değiştirme
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-semibold">
                Sağ üstte kendi adınızın yazdığı alana tıklayın, <span className="text-cyan-400 font-bold">Şifre Değiştir</span> deyin. Unutmayacağınız 6 haneli yeni şifrenizi iki kez yazıp onaylayın.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs md:text-sm text-slate-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Yeni şifrenizi güvenlik sebebiyle başka kimseyle paylaşmamanız rica olunur.</span>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Mobile Navigation bar spacer block */}
        <div className="h-28 w-full block md:hidden pointer-events-none clear-both" aria-hidden="true" />

      </div>
    </PageGuard>
  )
}
