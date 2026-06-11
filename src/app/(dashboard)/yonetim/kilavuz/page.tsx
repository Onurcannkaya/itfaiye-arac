"use client"

import { useState, useEffect } from "react"
import PageGuard from "@/components/PageGuard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { useAuthStore } from "@/lib/authStore"
import { 
  BookOpen, 
  ShieldCheck, 
  Truck, 
  Wrench, 
  Radio, 
  Lock,
  Layers,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function KilavuzPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<"saha" | "komuta">("saha")

  // Auto-detect role and set default tab
  useEffect(() => {
    if (user) {
      const isManager = user.rol === "Admin" || user.rol === "Editor" || user.rol === "Shift_Leader" || 
                        user.unvan === "Müdür" || user.unvan === "Amir" || user.unvan.includes("Çavuş");
      if (isManager) {
        setActiveTab("komuta")
      } else {
        setActiveTab("saha")
      }
    }
  }, [user])

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
            Sivas İtfaiyesi personelinin yetki ve sorumluluklarına göre hazırlanmış en sade ve estetik rehber.
          </p>
        </div>

        {/* Tab Switcher (Saha vs Yönetici) */}
        <div className="bg-slate-900/60 border border-slate-800 p-1.5 rounded-2xl flex gap-2 w-full max-w-lg">
          <button
            onClick={() => setActiveTab("saha")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "saha"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm"
                : "bg-transparent text-slate-400 border border-transparent hover:text-slate-200"
            )}
          >
            <span>🧑🚒</span>
            <span>Saha Ekipleri (Er & Şoför)</span>
          </button>
          <button
            onClick={() => setActiveTab("komuta")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "komuta"
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/25 shadow-sm"
                : "bg-transparent text-slate-400 border border-transparent hover:text-slate-200"
            )}
          >
            <span>👑</span>
            <span>Komuta & Yönetim</span>
          </button>
        </div>

        {/* Tabs Content */}
        {activeTab === "saha" ? (
          /* ======================================================== */
          /*                    SAHA EKİPLERİ REHBERİ                 */
          /* ======================================================== */
          <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
            {/* Vardiya Giriş */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-cyan-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-400 text-xs font-bold border border-cyan-400/20">1</span>
                  Nöbet & Vardiya Yönetimi (Görevi Başlat / Bitir)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Sisteme giriş yaptıktan sonra ekranın sağ üstündeki mavi renkli <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">[🚀 Görevi Başlat]</span> butonuna basın. Konumunuz arka planda batarya dostu şekilde 30 saniyede bir güncellenecektir.
                </p>
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Nöbetiniz veya vardiyanız bittiğinde, yine sağ üstteki kırmızı <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">[🛑 Görevi Bitir]</span> butonuna basarak çıkış yapın.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Görevi başlatmadığınız sürece telsiz odalarına giremez ve haritada aktif görünemezsiniz.</span>
                </div>
              </CardContent>
            </Card>

            {/* Envanter Sayımı */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-cyan-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-400 text-xs font-bold border border-cyan-400/20">2</span>
                  Araç İçi Malzeme Sayımları (ACL Yetki Kilidi)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Sol menüden <span className="text-slate-100 font-bold underline">Araçlar</span> sayfasına gidip plakanıza tıklayın veya envanter formunu açın. Malzemelerinizi kontrol ederek <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">[Sayımı Kaydet]</span> ile onaylayın.
                </p>
                <p className="text-sm md:text-base text-slate-400 italic font-semibold">
                  ⚠️ YETKİLENDİRME GÜVENLİĞİ: Bir aracın envanter kontrolünü sadece o aracın kartına atanan Sorumlu Şoför ve Sorumlu Er yapabilir. Yetkiniz olmayan araç sayımlarında ekran kilitlenecek ve "🔒 YETKİ KİLİDİ" uyarısı gösterilecektir.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Muaf olan malzemeler "🔄 GEÇİCİ ZİMMETTE" ibaresiyle sayım dışı tutulur.</span>
                </div>
              </CardContent>
            </Card>

            {/* Arıza Bildirimi */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-cyan-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-400 text-xs font-bold border border-cyan-400/20">3</span>
                  Makine İkmal Arıza Bildirimleri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Araç listesinde kendi aracınızın kartında bulunan <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 font-bold">[⚠️ Arıza Bildir]</span> butonuna basın. Arıza seviyesini (Hafif, Orta, Kritik) ve açıklamasını girip gönderin. Bildiriminiz otomatik olarak Makine İkmal Havuzuna düşer.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <Wrench className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Kritik arızalı olarak bildirilen ve servise alınan araçlar vaka sevkine kapatılır.</span>
                </div>
              </CardContent>
            </Card>

            {/* Dijital Telsiz */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-cyan-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-cyan-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-400 text-xs font-bold border border-cyan-400/20">4</span>
                  Telsiz Odaları (Sesli / Yazılı Muhabere)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Telsiz menüsünden siber odalara bağlanın. İlgili kanalı seçip mandallama tuşuyla sesli anons yapabilir veya odadaki yazılı telsiz mesaj akışını takip edebilirsiniz.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tüm telsiz anonsları ve mesajları adli veri nizamı için otomatik olarak kayıt altına alınır.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ======================================================== */
          /*                  KOMUTA & YÖNETİM REHBERİ                 */
          /* ======================================================== */
          <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
            {/* Personel Atamaları ve Sınıflandırma */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-amber-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-amber-500 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">1</span>
                  Personel Siber Sınıflandırması & Yetki Kalkanları
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Yönetim panelindeki **Personel** sayfasından teşkilatı `Komuta`, `Sürücü`, `Saha`, `Destek` olarak taktik gruplara ayırabilir; `Esentepe` ve `Organize` şubelerine göre anlık filtreleme yapabilirsiniz.
                </p>
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Personel kartlarındaki toggle butonları ile personellerin **Sadece Görüntüler (View Only)**, **Envanter Onaylar (Can Approve)** ve **Barkod Basabilir (Can Print)** yetkilerini tek tuşla değiştirebilirsiniz.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Kullanıcıların ehliyet ve sertifika bitiş sürelerine dair kritik uyarılar bu ekranda listelenir.</span>
                </div>
              </CardContent>
            </Card>

            {/* Araç Sorumluları ve Şube Değişikliği */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-amber-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-amber-500 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">2</span>
                  Araç Yetki Sorumlusu Atama & Şube Mühürlemesi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Araç envanter sayım yetkilerini kilitlemek için **Araçlar** sayfasındaki araç kartlarının altında yer alan **Sorumlu Şoför** ve **Sorumlu Er** dropdown listelerinden personel ataması yapın. Bu atama yapıldığı an, ilgili aracın envanter formunu doldurma yetkisi o iki personele kilitlenir.
                </p>
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Araçların fiziksel istasyonlarını değiştirmek için şube alanının yanındaki **[📍 Değiştir]** butonuna tıklayıp aracın yeni müfrezesini (Merkez, Esentepe, OSB) güncelleyebilirsiniz.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Atamalar veritabanına anlık olarak işlenir ve araç zimmet nizamı korunur.</span>
                </div>
              </CardContent>
            </Card>

            {/* Vardiya Devir Teslim & Z Raporu */}
            <Card className="bg-slate-950/70 border border-slate-900 shadow-md rounded-2xl hover:border-amber-500/20 transition-all duration-300">
              <CardHeader className="bg-slate-900/20 border-b border-white/5 p-5">
                <CardTitle className="text-lg md:text-xl font-black text-amber-500 flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">3</span>
                  Şerhli Z Raporu & Vardiya Devir Onay Motoru
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Nöbet bitimlerinde teslim alınan malzemelerin durum raporunu kontrol etmek için **Raporlar** sayfasına girin.
                </p>
                <p className="text-sm md:text-base text-slate-350 leading-relaxed font-medium">
                  Sayım uyuşmazlıkları durumunda raporu devralırken ilgili alana şerh/not ekleyerek onay verin. Sistem bu şerhleri Z Raporu kaydına kalıcı olarak mühürler.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-2 border-t border-white/5">
                  <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Şerh eklenen raporlar denetim ekranında sarı/turuncu uyarı rozetleriyle işaretlenir.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </PageGuard>
  )
}
