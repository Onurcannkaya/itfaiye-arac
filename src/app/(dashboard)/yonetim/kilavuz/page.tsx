"use client"

import { useState, useEffect } from "react"
import PageGuard from "@/components/PageGuard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useAuthStore } from "@/lib/authStore"
import { 
  BookOpen, 
  ShieldCheck, 
  Wrench, 
  Lock,
  Layers,
  FileText,
  Clock,
  ClipboardCheck,
  Milestone,
  ShieldAlert,
  Zap,
  UserCheck
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function KilavuzPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<"saha" | "komuta">("saha")

  // Auto-detect role and set default tab
  useEffect(() => {
    if (user) {
      const isManager = user.rol === "Admin" || user.rol === "Editor" || user.rol === "Shift_Leader" || 
                        user.unvan === "Müdür" || user.unvan === "Amir" || user.unvan?.includes("Çavuş");
      if (isManager) {
        setActiveTab("komuta")
      } else {
        setActiveTab("saha")
      }
    }
  }, [user])

  return (
    <PageGuard pageId="kilavuz">
      <div className="space-y-6 w-full max-w-full px-1.5 md:px-3 pb-12 animate-in fade-in duration-300">
        
        {/* Header Section */}
        <div className="border-b border-[var(--fd-border)] pb-5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--fd-text)] flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[var(--fd-accent)]" />
            Teşkilat Kullanım Kılavuzu
          </h1>
          <p className="text-[var(--fd-text2)] mt-1.5 text-sm font-medium">
            Sivas İtfaiyesi personelinin yetki ve sorumluluklarına göre hazırlanmış en sade ve estetik rehber.
          </p>
        </div>

        {/* Tab Switcher (Saha vs Yönetici) */}
        <div className="border border-[var(--fd-border)] bg-[var(--fd-surface2)] p-1 rounded-[var(--fd-r)] w-full max-w-lg flex gap-1.5">
          <button
            onClick={() => setActiveTab("saha")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "saha"
                ? "bg-[var(--fd-accent)]/15 border border-[var(--fd-accent)]/30 text-[var(--fd-accent)] shadow-[var(--fd-shadow-sm)]"
                : "bg-transparent text-[var(--fd-text2)] border border-transparent hover:text-[var(--fd-text)]"
            )}
          >
            <span>🧑🚒</span>
            <span>Saha Ekipleri (Er & Şoför)</span>
          </button>
          <button
            onClick={() => setActiveTab("komuta")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "komuta"
                ? "bg-[var(--fd-amber)]/15 border border-[var(--fd-amber)]/30 text-[var(--fd-amber)] shadow-[var(--fd-shadow-sm)]"
                : "bg-transparent text-[var(--fd-text2)] border border-transparent hover:text-[var(--fd-text)]"
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
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-accent)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-accent)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-accent)]/10 text-[var(--fd-accent)] text-xs font-bold border border-[var(--fd-accent)]/20">1</span>
                  Nöbet & Vardiya Yönetimi (PDKS Girişleri)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Sisteme giriş yaptıktan sonra üst menüdeki mavi renkli <span className="text-[var(--fd-accent)] bg-[var(--fd-accent)]/10 px-2 py-0.5 rounded border border-[var(--fd-accent)]/20 font-bold text-xs">[🚀 Görevi Başlat]</span> butonuna basın. Konumunuz arka planda batarya dostu şekilde 30 saniyede bir güncellenecektir.
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Nöbetiniz veya vardiyanız bittiğinde, yine sağ üstteki kırmızı <span className="text-[var(--fd-danger)] bg-[var(--fd-danger)]/10 px-2 py-0.5 rounded border border-[var(--fd-danger)]/20 font-bold text-xs">[🛑 Görevi Bitir]</span> butonuna basarak çıkış yapın.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <Clock className="w-4 h-4 text-[var(--fd-accent)] shrink-0" />
                  <span>Görevi başlatmadığınız sürece telsiz odalarına giremez ve haritada aktif görünemezsiniz.</span>
                </div>
              </CardContent>
            </Card>

            {/* Envanter Sayımı */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-accent)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-accent)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-accent)]/10 text-[var(--fd-accent)] text-xs font-bold border border-[var(--fd-accent)]/20">2</span>
                  Vardiya Görevleri & Araç İçi Malzeme Sayımları (ACL Yetki Kilidi)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Sol menüden <span className="text-[var(--fd-text)] font-bold underline">Görevler</span> sayfasına gidip plakanıza veya istasyonunuza atanan form detaylarını açın. Malzemelerinizi kontrol ederek <span className="text-[var(--fd-success)] bg-[var(--fd-success)]/10 px-2 py-0.5 rounded border border-[var(--fd-success)]/20 font-bold text-xs">[Kontrolü Tamamla ve Teslim Et]</span> ile onaylayın.
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Kontrol listelerinde yer alan sorular; **Evet/Hayır (Checkbox)**, **Sayısal Değer (KM, Basınç)**, **Metin Girişi** ve **Kanıt Fotoğrafı** şeklinde olabilir.
                </p>
                <p className="text-xs text-[var(--fd-amber)] bg-[var(--fd-amber)]/10 border border-[var(--fd-amber)]/20 px-3 py-2 rounded font-semibold">
                  ⚠️ YETKİLENDİRME GÜVENLİĞİ: Bir aracın envanter kontrolünü sadece o araca atanan Sorumlu Şoför ve Sorumlu Er yapabilir. Yetkiniz olmayan araç sayımlarında ekran kilitlenecektir.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <ClipboardCheck className="w-4 h-4 text-[var(--fd-success)] shrink-0" />
                  <span>Zorunlu olan alanları doldurmadan ve gerekirse fotoğraf kanıtı eklemeden formu teslim edemezsiniz.</span>
                </div>
              </CardContent>
            </Card>

            {/* Dış Görevler */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-accent)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-accent)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-accent)]/10 text-[var(--fd-accent)] text-xs font-bold border border-[var(--fd-accent)]/20">3</span>
                  Dış Görev Takipleri (Sosyal & Lojistik Sevk)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Sivil ve idari işler için atanan dış görevleri (sosyal çadır kurulumu, lojistik malzeme transferi vb.) yine <span className="text-[var(--fd-text)] font-bold underline">Görevler</span> sayfasındaki **Dış Görevler** sekmesinden takip edin. 
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Adres, atanan personel ve araç bilgileri doğrultusunda görevi tamamladığınızda <span className="text-[var(--fd-success)] bg-[var(--fd-success)]/10 px-2 py-0.5 rounded border border-[var(--fd-success)]/20 font-bold text-xs">[Görevi Sonlandır]</span> butonuna basın.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <Milestone className="w-4 h-4 text-[var(--fd-accent)] shrink-0" />
                  <span>Dış görev bilgileri veritabanında arşivlenerek raporlara yansıtılacaktır.</span>
                </div>
              </CardContent>
            </Card>

            {/* SCBA Solunum Cihazı Takibi */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-accent)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-accent)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-accent)]/10 text-[var(--fd-accent)] text-xs font-bold border border-[var(--fd-accent)]/20">4</span>
                  SCBA Solunum Cihazı & Tüp Takibi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Operasyonda hayati önem taşıyan solunum cihazı ve tüplerinizi sol menüdeki <span className="text-[var(--fd-text)] font-bold underline">SCBA Takip</span> sayfasından yönetin. Barkod veya seri numarasını girip tüp bar basıncını kontrol edin.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <ShieldAlert className="w-4 h-4 text-[var(--fd-danger)] shrink-0" />
                  <span>Basıncı 240 barın altına düşen tüpleri otomatik olarak "🔴 Yetersiz / Dolumda" işaretleyip depoya gönderin.</span>
                </div>
              </CardContent>
            </Card>

            {/* Arıza Bildirimi */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-accent)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-accent)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-accent)]/10 text-[var(--fd-accent)] text-xs font-bold border border-[var(--fd-accent)]/20">5</span>
                  Makine İkmal Arıza Bildirimleri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Araç listesinde kendi aracınızın kartında bulunan veya bakım modülünde yer alan <span className="text-[var(--fd-amber)] bg-[var(--fd-amber)]/10 px-2 py-0.5 rounded border border-[var(--fd-amber)]/20 font-bold text-xs">[⚠️ Arıza Bildir]</span> butonuna basın. Arıza seviyesini (Hafif, Orta, Kritik) ve açıklamasını girip gönderin. Bildiriminiz anlık olarak Makine İkmal Havuzuna düşer.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <Wrench className="w-4 h-4 text-[var(--fd-amber)] shrink-0" />
                  <span>Kritik arızalı olarak bildirilen ve servise alınan araçlar vaka sevkine kapatılır.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ======================================================== */
          /*                  KOMUTA & YÖNETİM REHBERİ                 */
          /* ======================================================== */
          <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
            
            {/* Dinamik Görev Şablonu Oluşturucu */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-amber)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-amber)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-amber)]/10 text-[var(--fd-amber)] text-xs font-bold border border-[var(--fd-amber)]/20">1</span>
                  Dinamik Görev Şablonu Oluşturucu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Vardiyadaki devir-teslim listelerini dinamik kılmak için <span className="text-[var(--fd-text)] font-bold underline">Görev Şablonları</span> sekmesinden yeni şablon oluşturun. 
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Şablon başlığı, periyodu (Günlük, Haftalık, Aylık) ve veri girdisi türlerini (Checkbox, Sayısal Değer, Metin, Fotoğraf Kanıtı) belirleyip, maddeleri **Zorunlu** olarak işaretleyerek teşkilat için yayınlayın.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <Layers className="w-4 h-4 text-[var(--fd-amber)] shrink-0" />
                  <span>Şablonlar yayınlandığı an atama modülünde seçilebilir hale gelecektir.</span>
                </div>
              </CardContent>
            </Card>

            {/* Vaka Sevk ve Yönetim */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-amber)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-amber)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-amber)]/10 text-[var(--fd-amber)] text-xs font-bold border border-[var(--fd-amber)]/20">2</span>
                  Vaka (Olay) Sevk & Yönetim Merkezi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Operasyon merkezindeki olayları yönetmek için <span className="text-[var(--fd-text)] font-bold underline">Olaylar</span> sayfasını kullanın. Yeni vaka ekleme butonu ile koordinatlar, adres ve araç atamalarını modal pencere üzerinden hızlıca yapabilirsiniz.
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Triage öncelik renkleri (Kritik: Kırmızı, Orta: Sarı, Düşük: Mavi) sayesinde vakaların aciliyet durumlarını canlı olarak takip edin ve resmi bildirim için **EK-16 Raporu** çıktısını indirin.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <Zap className="w-4 h-4 text-[var(--fd-accent)] shrink-0" />
                  <span>Harita sayfasıyla entegre olan vakalar canlı Leaflet haritası üzerinde anlık konumlandırılır.</span>
                </div>
              </CardContent>
            </Card>

            {/* Vatandaş Hizmetleri */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-amber)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-amber)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-amber)]/10 text-[var(--fd-amber)] text-xs font-bold border border-[var(--fd-amber)]/20">3</span>
                  Vatandaş Hizmetleri & Başvuru Onay Süreci
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Belediye ve vatandaş taleplerini (İş Yeri Ruhsat İtfaiye Uygunluk Raporu, Baca Temizliği, Sosyal Su Sevkleri, Eğitim Talepleri vb.) <span className="text-[var(--fd-text)] font-bold underline">Hizmetler</span> sayfasından inceleyin.
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Gelişmiş veri tablosundan başvuruları durumuna göre süzün, detay pencerelerini kullanarak onay veya ret kararı verip sistemi güncelleyin.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <UserCheck className="w-4 h-4 text-[var(--fd-success)] shrink-0" />
                  <span>Onaylanan uygunluk raporları otomatik olarak PDF nizamına dönüştürülüp arşive eklenir.</span>
                </div>
              </CardContent>
            </Card>

            {/* Z Raporu Arşivi */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-amber)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-amber)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-amber)]/10 text-[var(--fd-amber)] text-xs font-bold border border-[var(--fd-amber)]/20">4</span>
                  24 Saatlik Müfrez Z Raporu Arşivi & PDKS Günlüğü
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Vardiya bitimlerinde tüm müfreze ve istasyonların özet durumlarını toplu incelemek için <span className="text-[var(--fd-text)] font-bold underline">Raporlar</span> sayfasını kullanın.
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Her vardiyanın bitiminde oluşturulan **Müfrez Z Raporu** formlarında araç sayımları, kayıp malzemeler ve nöbetçi personel listesi yer alır. Sayım uyuşmazlıkları durumunda raporu onaylarken şerh/not ekleyebilirsiniz.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <FileText className="w-4 h-4 text-[var(--fd-amber)] shrink-0" />
                  <span>Şerh eklenen raporlar arşiv ekranında sarı/turuncu uyarı rozetleriyle işaretlenerek teftişe açılır.</span>
                </div>
              </CardContent>
            </Card>

            {/* Personel Siber Sınıflandırması */}
            <Card className="bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-sm)] rounded-[var(--fd-r)] hover:border-[var(--fd-amber)]/20 transition-all duration-300">
              <CardHeader className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] p-5">
                <CardTitle className="text-base md:text-lg font-black text-[var(--fd-amber)] flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--fd-amber)]/10 text-[var(--fd-amber)] text-xs font-bold border border-[var(--fd-amber)]/20">5</span>
                  Personel Siber Sınıflandırması & Yetki Kalkanları (ACL)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Yönetim panelindeki <span className="text-[var(--fd-text)] font-bold underline">Yetkiler</span> sayfasından veya personel detaylarından personellerin **Sadece Görüntüler (View Only)**, **Envanter Onaylar (Can Approve)** ve **Barkod Basabilir (Can Print)** yetkilerini tek tuşla değiştirebilirsiniz.
                </p>
                <p className="text-sm text-[var(--fd-text2)] leading-relaxed font-medium">
                  Ayrıca personellerin ehliyet/SRC belgelerinin bitiş tarihi veya solunum eğitim sertifikalarının güncelliği bu ekranda otomatik uyarılarla denetlenir.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--fd-text3)] font-mono pt-3 border-t border-[var(--fd-border)]/60">
                  <Lock className="w-4 h-4 text-[var(--fd-danger)] shrink-0" />
                  <span>Atamalar veritabanına anlık olarak işlenir ve araç/istasyon zimmet nizamı korunur.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </PageGuard>
  )
}
