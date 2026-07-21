"use client"
import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Loader2, ShieldAlert, LogIn, Flame, FileText, CheckCircle2, Copy, Check, Info, X, Users, GraduationCap } from "lucide-react"
import Image from "next/image"
import { useAuthStore } from "@/lib/authStore"

function LoginForm() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, setRedirectUrl } = useAuthStore()

  // Vatandaş Hizmetleri Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'baca' | 'olur' | 'egitim' | 'yangin_raporu'>('baca')
  const [citizenLoading, setCitizenLoading] = useState(false)
  const [citizenError, setCitizenError] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [copied, setCopied] = useState(false)

  // Ortak Kimlik Doğrulama Alanları
  const [citizenTc, setCitizenTc] = useState("")
  const [citizenAd, setCitizenAd] = useState("")
  const [citizenSoyad, setCitizenSoyad] = useState("")
  const [citizenDogumYili, setCitizenDogumYili] = useState("")
  const [citizenPhone, setCitizenPhone] = useState("")
  const [citizenAddress, setCitizenAddress] = useState("")

  // Sekme Özel Alanları
  const [bacaType, setBacaType] = useState("Konut")
  const [olurType, setOlurType] = useState("İşyeri")
  const [olurBizName, setOlurBizName] = useState("")
  const [egitimTuru, setEgitimTuru] = useState("Yangın Önleme ve Temel Yangın Eğitimi")
  const [egitimKisiSayisi, setEgitimKisiSayisi] = useState("30")
  const [yanginAciklama, setYanginAciklama] = useState("")
  const [yanginBinaTipi, setYanginBinaTipi] = useState("Konut")

  const [isOtpSent, setIsOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [simulatedOtp, setSimulatedOtp] = useState("")

  // Store redirect URL from query param
  useEffect(() => {
    const redirect = searchParams.get("redirect")
    if (redirect) {
      setRedirectUrl(redirect)
    }
  }, [searchParams, setRedirectUrl])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)

    await new Promise(r => setTimeout(r, 400))

    try {
      const result = await login(identifier, password)

      if (result.success) {
        if (result.token) {
          localStorage.setItem('auth_token', result.token)
        }
        await new Promise(r => setTimeout(r, 200))
        const redirectTarget = searchParams.get("redirect") || '/yonetim'
        window.location.replace(redirectTarget)
      } else {
        setLoginError(result.error || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.")
      }
    } catch (err: any) {
      console.error("Login try-catch error:", err)
      const errorMsg = err?.message || ""
      if (errorMsg.includes("setItem") || errorMsg.includes("Storage") || errorMsg.includes("quota") || errorMsg.includes("localStorage")) {
        setLoginError("Tarayıcınız çerezlere veya yerel depolamaya izin vermiyor. Lütfen 'Gizli Sekme' kullanmadığınızdan emin olun veya tarayıcı ayarlarından çerezlere izin verin.")
      } else {
        setLoginError(`Kritik Hata: ${errorMsg || "Sunucuyla bağlantı kurulamadı."}`)
      }
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCitizenError("")
    setCitizenLoading(true)

    try {
      if (!isOtpSent) {
        // 1. Aşama: Bilgileri Nüfus ve Vatandaşlık İşlerine doğrulat ve OTP üret
        const payload = {
          action: 'send-otp',
          tc: citizenTc,
          ad: citizenAd,
          soyad: citizenSoyad,
          dogum_yili: citizenDogumYili,
          telefon: citizenPhone
        };

        const res = await fetch('/api/citizen-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setCitizenError(data.error || "Kimlik doğrulama veya OTP gönderim hatası.");
          return;
        }

        setSimulatedOtp(data.otp || "");
        setIsOtpSent(true);
      } else {
        // 2. Aşama: OTP Doğrula ve Başvuruyu Kaydet
        let typeVal = 'baca_temizligi';
        let extraPayload = {};
        if (activeTab === 'olur') {
          typeVal = 'yangin_olur_raporu';
          extraPayload = {
            bina_tipi: olurType,
            isyeri_adi_turu: olurBizName
          };
        } else if (activeTab === 'egitim') {
          typeVal = 'egitim_talebi';
          extraPayload = {
            bina_tipi: 'Eğitim Kurumu',
            isyeri_adi_turu: egitimTuru,
            kisi_sayisi: Number(egitimKisiSayisi) || 30
          };
        } else if (activeTab === 'yangin_raporu') {
          typeVal = 'yangin_raporu';
          extraPayload = {
            bina_tipi: yanginBinaTipi,
            isyeri_adi_turu: yanginAciklama
          };
        } else {
          // baca
          typeVal = 'baca_temizligi';
          extraPayload = {
            bina_tipi: bacaType
          };
        }

        const payload = {
          action: 'verify-and-save',
          otp: otpCode,
          type: typeVal,
          tc: citizenTc,
          ad: citizenAd,
          soyad: citizenSoyad,
          dogum_yili: citizenDogumYili,
          telefon: citizenPhone,
          adres: citizenAddress,
          ...extraPayload
        };

        const res = await fetch('/api/citizen-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setCitizenError(data.error || "OTP doğrulama veya başvuru kaydetme hatası.");
          return;
        }

        setTrackingCode(data.trackingCode);
        
        // Formu sıfırla
        setCitizenTc("");
        setCitizenAd("");
        setCitizenSoyad("");
        setCitizenDogumYili("");
        setCitizenPhone("");
        setCitizenAddress("");
        setBacaType("Konut");
        setOlurType("İşyeri");
        setOlurBizName("");
        setEgitimTuru("Yangın Önleme ve Temel Yangın Eğitimi");
        setEgitimKisiSayisi("30");
        setYanginAciklama("");
        setYanginBinaTipi("Konut");
        setOtpCode("");
        setIsOtpSent(false);
        setSimulatedOtp("");
      }
    } catch (err: unknown) {
      setCitizenError("İnternet veya sunucu bağlantı hatası oluştu.")
    } finally {
      setCitizenLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (typeof window !== 'undefined' && trackingCode) {
      navigator.clipboard.writeText(trackingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center justify-between p-6 overflow-y-auto bg-[var(--fd-bg)] text-[var(--fd-text)] box-border pb-[calc(1.5rem+env(safe-area-inset-bottom)] pt-[calc(1.5rem+env(safe-area-inset-top)] pl-[calc(1rem+env(safe-area-inset-left)] pr-[calc(1rem+env(safe-area-inset-right)]">
      
      {/* Arka Plan Görseli (Tüm Ekrana Yayılmış) */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <Image 
          src="/login_bg_sivas_itfaiye.jpg" 
          alt="Sivas İtfaiye Filosu" 
          fill 
          className="object-cover object-center filter brightness-[0.75] contrast-[1.05]"
          priority 
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] transition-colors duration-500" />
      </div>

      {/* Üst Logo ve Başlık Alanı */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-3 text-center pt-4 lg:pt-8 select-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center p-1 shadow-[var(--fd-shadow-lg)] border border-[var(--fd-border)]">
            <Image src="/logo-belediye.png" alt="Sivas Belediyesi" width={40} height={40} className="object-contain" />
          </div>
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center p-1 shadow-[var(--fd-shadow-lg)] border border-[var(--fd-border)]">
            <Image src="/logo-itfaiye.png" alt="Sivas İtfaiyesi" width={40} height={40} className="object-contain" />
          </div>
        </div>
        <div className="space-y-0.5">
          <h1 className="text-xl lg:text-2xl font-black tracking-widest text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Sivas İtfaiyesi</h1>
          <span className="text-[10px] lg:text-xs text-white/70 font-bold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Yönetim Bilgi Sistemi</span>
        </div>
      </div>

      {/* Merkez Giriş Kartı */}
      <div className="relative z-10 w-full max-w-[360px] my-auto py-6">
        <div className="bg-[var(--fd-surface)]/75 backdrop-blur-xl border border-[var(--fd-border)]/50 p-6 sm:p-8 rounded-[var(--fd-r)] shadow-[var(--fd-shadow-lg)] space-y-6">
          <div className="space-y-1 text-center select-none">
            <h2 className="text-xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Personel Girişi</h2>
            <p className="text-xs text-[var(--fd-text3)] font-semibold">Devam etmek için sicil bilginizle oturum açın.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {loginError && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--fd-danger)]/10 border border-[var(--fd-danger)]/20 text-[var(--fd-danger)] text-xs animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="font-semibold leading-snug">{loginError}</span>
              </div>
            )}

            {searchParams.get("redirect") && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--fd-amber)]/10 border border-[var(--fd-amber)]/20 text-[var(--fd-amber)] text-[11px] leading-snug">
                <Info className="w-4 h-4 shrink-0 animate-pulse text-[var(--fd-amber)]" />
                <span className="font-semibold">Bu alana erişmek için personel oturumu açmanız gerekmektedir.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--fd-text2)] uppercase tracking-wider">Kullanıcı Adı veya Sicil No</label>
              <Input 
                placeholder="Kullanıcı adı veya sicil no" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="h-11 bg-[var(--fd-surface2)]/85 border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] font-semibold placeholder-[var(--fd-text3)] pl-4 w-full text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--fd-text2)] uppercase tracking-wider">Giriş Parolası</label>
              <Input 
                type="password" 
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-[var(--fd-surface2)]/85 border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] font-semibold placeholder-[var(--fd-text3)] pl-4 w-full text-sm transition-all"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-[var(--fd-danger)] hover:opacity-90 text-white font-bold rounded-[var(--fd-r-sm)] transition-all shadow-[var(--fd-shadow-sm)] active:scale-[0.98] mt-2 flex items-center justify-center gap-2 border-0 text-sm cursor-pointer" 
              disabled={loginLoading}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Oturum Açılıyor...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sisteme Giriş Yap
                </>
              )}
            </Button>
          </form>

          <div className="h-px bg-[var(--fd-border)] my-4" />

          {/* Vatandaş Başvuru Modalı Tetikleyici Butonu */}
          <button
            type="button"
            onClick={() => { setIsModalOpen(true); setCitizenError(""); setTrackingCode(""); }}
            className="w-full h-10 border border-[var(--fd-accent)]/30 hover:bg-[var(--fd-accent)]/10 text-[var(--fd-accent)] font-bold rounded-[var(--fd-r-sm)] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.98]"
          >
            <Users className="w-4 h-4" />
            Vatandaş Hizmet Başvuruları
          </button>
        </div>
      </div>

      {/* Alt Belediye Bilgi Künyesi */}
      <div className="relative z-10 w-full max-w-md text-center space-y-3 pt-4 select-none">
        <div className="relative w-40 h-10 mx-auto opacity-95">
          <Image 
            src="/logo-akilli-sehir.png" 
            alt="Akıllı Şehir Logosu" 
            fill 
            className="object-contain"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-white/90 font-bold max-w-xs mx-auto leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            Sivas Belediyesi Akıllı Şehir ve Kent Bilgi Sistemleri Müdürlüğü tarafından geliştirilmiştir.
          </p>
          <div className="text-[9px] text-white/70 font-bold flex items-center justify-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span>Sivas İtfaiye Komuta Merkez</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>© 2026 Tüm Hakları Saklıdır</span>
          </div>
        </div>
      </div>

      {/* VATANDAŞ HİZMETLERİ POP-UP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] bg-black/60 backdrop-blur-sm overflow-x-hidden overflow-y-auto box-border">
          
          <div className="relative w-full max-w-md max-h-[calc(100vh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] my-auto bg-[var(--fd-surface)] border border-[var(--fd-border)] p-6 rounded-[var(--fd-r)] shadow-[var(--fd-shadow-lg)] flex flex-col text-[var(--fd-text)] overflow-y-auto box-border scrollbar-thin scrollbar-thumb-[var(--fd-border)] scrollbar-track-transparent animate-in zoom-in-95 duration-200">
            
            {/* Modal Kapatma Butonu */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 rounded-[var(--fd-r-sm)] p-2 bg-[var(--fd-surface2)] border border-[var(--fd-border)] text-[var(--fd-text3)] hover:text-[var(--fd-danger)] hover:border-[var(--fd-danger)]/30 transition-all cursor-pointer z-20"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Başlık */}
            <div className="mb-4 pr-10">
              <h2 className="text-base sm:text-lg font-bold text-[var(--fd-text)] tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--fd-accent)] animate-pulse" />
                Vatandaş Hizmet Başvuruları
              </h2>
              <p className="text-[10px] text-[var(--fd-text3)] mt-0.5 leading-relaxed">
                Şifresiz, anlık siber komuta başvuru modülü.
              </p>
            </div>

            {/* Modal İçerik */}
            <div className="w-full box-border flex-1">
              
              {trackingCode ? (
                /* Başarı Ekranı (Neon Yeşil Gösterim) */
                <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-[var(--fd-success)]/10 border border-[var(--fd-success)]/20 text-[var(--fd-success)] rounded-full flex items-center justify-center mx-auto shadow-[var(--fd-shadow)]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[var(--fd-text)]">Başvurunuz Alınmıştır</h3>
                    <p className="text-[10px] text-[var(--fd-text3)] max-w-[260px] mx-auto leading-relaxed">
                      Sürecinizi izlemek üzere lütfen takip kodunu not ediniz.
                    </p>
                  </div>
                  <div className="bg-[var(--fd-surface2)] border border-[var(--fd-success)]/30 p-3.5 rounded-[var(--fd-r-sm)] flex items-center justify-between gap-3 max-w-xs mx-auto shadow-inner">
                    <div className="text-left">
                      <span className="text-[8px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block leading-none">Takip Kodu</span>
                      <span className="text-base font-bold font-mono text-[var(--fd-success)] tracking-wider drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">
                        {trackingCode}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg bg-[var(--fd-surface3)] border border-[var(--fd-border)] text-[var(--fd-text3)] hover:text-[var(--fd-success)] hover:border-[var(--fd-success)]/30 transition-all cursor-pointer"
                      title="Kopyala"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[var(--fd-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="pt-2 flex gap-2 justify-center">
                    <Button 
                      type="button"
                      onClick={() => setTrackingCode("")}
                      className="bg-[var(--fd-surface2)] border border-[var(--fd-border)] hover:bg-[var(--fd-surface3)] text-[var(--fd-text2)] font-bold rounded-lg text-[10px] py-1.5 px-3 cursor-pointer"
                    >
                      Yeni Başvuru
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="bg-[var(--fd-success)] hover:opacity-90 text-white font-bold rounded-lg text-[10px] py-1.5 px-3 cursor-pointer border-0"
                    >
                      Kapat
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form Gösterimi */
                <div className="space-y-4 w-full box-border">
                  {/* Sekme Seçiciler */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--fd-surface2)] border border-[var(--fd-border)] rounded-lg">
                    <button 
                      type="button"
                      onClick={() => { setActiveTab('baca'); setCitizenError(""); }}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'baca' 
                          ? 'bg-[var(--fd-accent)] text-white shadow-[var(--fd-shadow-sm)]' 
                          : 'text-[var(--fd-text3)] hover:text-[var(--fd-text2)]'
                      }`}
                    >
                      <Flame className="w-3 h-3" />
                      Baca Temizliği
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setActiveTab('olur'); setCitizenError(""); }}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'olur' 
                          ? 'bg-[var(--fd-accent)] text-white shadow-[var(--fd-shadow-sm)]' 
                          : 'text-[var(--fd-text3)] hover:text-[var(--fd-text2)]'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      İtfaiye Olur Raporu
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setActiveTab('egitim'); setCitizenError(""); }}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'egitim' 
                          ? 'bg-[var(--fd-accent)] text-white shadow-[var(--fd-shadow-sm)]' 
                          : 'text-[var(--fd-text3)] hover:text-[var(--fd-text2)]'
                      }`}
                    >
                      <GraduationCap className="w-3 h-3" />
                      Eğitim Talebi
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setActiveTab('yangin_raporu'); setCitizenError(""); }}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'yangin_raporu' 
                          ? 'bg-[var(--fd-accent)] text-white shadow-[var(--fd-shadow-sm)]' 
                          : 'text-[var(--fd-text3)] hover:text-[var(--fd-text2)]'
                      }`}
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Yangın Raporu
                    </button>
                  </div>
 
                  <form onSubmit={handleCitizenSubmit} className="space-y-3 w-full box-border">
                    {citizenError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--fd-danger)]/10 border border-[var(--fd-danger)]/20 text-[var(--fd-danger)] text-[10px]">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold leading-snug">{citizenError}</span>
                      </div>
                    )}

                    {!isOtpSent ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1 col-span-2">
                            <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">T.C. Kimlik No</label>
                            <Input 
                              placeholder="11 haneli T.C. Kimlik No" 
                              value={citizenTc}
                              onChange={(e) => setCitizenTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                              required
                              maxLength={11}
                              className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Ad (NVİ)</label>
                            <Input 
                              placeholder="Adınız" 
                              value={citizenAd}
                              onChange={(e) => setCitizenAd(e.target.value)}
                              required
                              className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Soyad (NVİ)</label>
                            <Input 
                              placeholder="Soyadınız" 
                              value={citizenSoyad}
                              onChange={(e) => setCitizenSoyad(e.target.value)}
                              required
                              className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Doğum Yılı</label>
                            <Input 
                              placeholder="Örn: 1990" 
                              value={citizenDogumYili}
                              onChange={(e) => setCitizenDogumYili(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              required
                              maxLength={4}
                              className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">İrtibat Telefonu</label>
                            <Input 
                              type="tel"
                              placeholder="Telefon Numaranız" 
                              value={citizenPhone}
                              onChange={(e) => setCitizenPhone(e.target.value)}
                              required
                              className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Açık Adres</label>
                          <textarea 
                            placeholder="Açık adresiniz..." 
                            value={citizenAddress}
                            onChange={(e) => setCitizenAddress(e.target.value)}
                            required
                            rows={2}
                            className="w-full bg-[var(--fd-surface2)] border border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] p-2.5 placeholder-[var(--fd-text3)] resize-none font-sans box-border"
                          />
                        </div>

                        {/* Sekme Özel Alanları */}
                        {activeTab === 'baca' && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Bina Tipi</label>
                            <select 
                              value={bacaType}
                              onChange={(e) => setBacaType(e.target.value)}
                              className="w-full h-9 bg-[var(--fd-surface2)] border border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] px-2 font-sans box-border cursor-pointer"
                            >
                              <option value="Konut" className="bg-[var(--fd-surface)]">Müstakil Ev</option>
                              <option value="Apartman" className="bg-[var(--fd-surface)]">Apartman / Site</option>
                              <option value="İşyeri" className="bg-[var(--fd-surface)]">İşyeri / Fabrika</option>
                              <option value="Kamu Binası" className="bg-[var(--fd-surface)]">Kamu Kuruluşu</option>
                            </select>
                          </div>
                        )}

                        {activeTab === 'olur' && (
                          <>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">İşyeri Unvanı ve Faaliyet Türü</label>
                              <Input 
                                placeholder="Örn: Sivas Un Fabrikası - Gıda İmalatı" 
                                value={olurBizName}
                                onChange={(e) => setOlurBizName(e.target.value)}
                                required
                                className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Bina Yapı Tipi</label>
                              <select 
                                value={olurType}
                                onChange={(e) => setOlurType(e.target.value)}
                                className="w-full h-9 bg-[var(--fd-surface2)] border border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] px-2 font-sans box-border cursor-pointer"
                              >
                                <option value="İşyeri" className="bg-[var(--fd-surface)]">Bağımsız İşyeri / Dükkan</option>
                                <option value="Apartman Altı" className="bg-[var(--fd-surface)]">Apartman Altı İşyeri</option>
                                <option value="Fabrika" className="bg-[var(--fd-surface)]">Fabrika / Sanayi Tesisi</option>
                                <option value="Konut" className="bg-[var(--fd-surface)]">Mesken / Ortak Alan</option>
                              </select>
                            </div>
                          </>
                        )}

                        {activeTab === 'egitim' && (
                          <>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Eğitim Türü</label>
                              <select 
                                value={egitimTuru}
                                onChange={(e) => setEgitimTuru(e.target.value)}
                                className="w-full h-9 bg-[var(--fd-surface2)] border border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] px-2 font-sans box-border cursor-pointer"
                              >
                                <option value="Yangın Önleme ve Temel Yangın Eğitimi" className="bg-[var(--fd-surface)]">Yangın Önleme ve Temel Yangın Eğitimi</option>
                                <option value="Arama Kurtarma Eğitimi" className="bg-[var(--fd-surface)]">Arama Kurtarma Eğitimi</option>
                                <option value="İlkyardım ve Afet Bilinci" className="bg-[var(--fd-surface)]">İlkyardım ve Afet Bilinci</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Planlanan Katılımcı Sayısı</label>
                              <Input 
                                type="number" 
                                placeholder="Örn: 30" 
                                value={egitimKisiSayisi}
                                onChange={(e) => setEgitimKisiSayisi(e.target.value)}
                                required
                                className="h-9 bg-[var(--fd-surface2)] border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] pl-3 w-full box-border"
                              />
                            </div>
                          </>
                        )}

                        {activeTab === 'yangin_raporu' && (
                          <>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Rapor Talep Gerekçesi / Açıklama</label>
                              <textarea 
                                placeholder="Yangın olayının tarihi ve detaylı gerekçe açıklaması..." 
                                value={yanginAciklama}
                                onChange={(e) => setYanginAciklama(e.target.value)}
                                required
                                rows={2}
                                className="w-full bg-[var(--fd-surface2)] border border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] p-2.5 placeholder-[var(--fd-text3)] resize-none font-sans box-border"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--fd-text3)] uppercase tracking-wider block">Bina Yapı Tipi</label>
                              <select 
                                value={yanginBinaTipi}
                                onChange={(e) => setYanginBinaTipi(e.target.value)}
                                className="w-full h-9 bg-[var(--fd-surface2)] border border-[var(--fd-border)] focus:border-[var(--fd-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-[11px] px-2 font-sans box-border cursor-pointer"
                              >
                                <option value="Konut" className="bg-[var(--fd-surface)]">Müstakil Ev / Apartman</option>
                                <option value="İşyeri" className="bg-[var(--fd-surface)]">İşyeri / Ticari Alan</option>
                                <option value="Fabrika" className="bg-[var(--fd-surface)]">Fabrika / Depo / Sanayi</option>
                              </select>
                            </div>
                          </>
                        )}

                        <Button 
                          type="submit" 
                          className="w-full h-10 bg-gradient-to-r from-[var(--fd-accent)] to-[var(--fd-accent-soft)] hover:opacity-95 text-white font-bold rounded-[var(--fd-r-sm)] transition-all shadow-[var(--fd-shadow-sm)] active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5 border-0 text-[11px] cursor-pointer box-border" 
                          disabled={citizenLoading}
                        >
                          {citizenLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Kimlik Doğrulanıyor...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                              Kimliği Doğrula & SMS Kodu Gönder
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* SMS OTP Paneli — kod yalnızca geliştirme ortamında ekranda gösterilir;
                            üretimde kod SMS ile telefona gönderilir ve ekranda gösterilmez. */}
                        <div className="bg-[var(--fd-accent)]/10 border border-[var(--fd-accent)]/20 p-3.5 rounded-[var(--fd-r-sm)] text-[var(--fd-accent)] text-xs font-mono text-center flex flex-col gap-2 my-2 animate-in slide-in-from-top-2">
                          {simulatedOtp ? (
                            <>
                              <span className="font-bold uppercase tracking-wider text-[9px] text-[var(--fd-accent)]">Simüle Edilen SMS Paneli (Geliştirme)</span>
                              <span className="text-[11px] leading-relaxed text-[var(--fd-text)]">
                                Sivas Bld: <span className="font-semibold text-white px-1.5 py-0.5 rounded bg-[var(--fd-surface2)] border border-[var(--fd-accent)]/30 text-sm tracking-wider">{simulatedOtp}</span> doğrulama kodu ile başvurunuzu tamamlayabilirsiniz.
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] leading-relaxed text-[var(--fd-text)]">
                              Doğrulama kodu telefonunuza SMS ile gönderildi. Lütfen aşağıya girin.
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 py-2">
                          <label className="text-[10px] font-bold text-[var(--fd-text2)] uppercase tracking-wider text-center block">6 Haneli SMS Doğrulama Kodu</label>
                          <Input 
                            type="text"
                            placeholder="SMS Kodunu Giriniz" 
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            maxLength={6}
                            className="h-11 bg-[var(--fd-surface2)] border-[var(--fd-accent)]/40 focus:border-[var(--fd-accent)] focus:ring-[var(--fd-accent)]/20 rounded-[var(--fd-r-sm)] text-[var(--fd-text)] text-base font-black text-center tracking-widest placeholder-[var(--fd-text3)] pl-3 w-full box-border"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full h-11 bg-[var(--fd-success)] hover:opacity-90 text-white font-bold rounded-[var(--fd-r-sm)] transition-all shadow-[var(--fd-shadow-sm)] active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5 border-0 text-xs cursor-pointer box-border" 
                          disabled={citizenLoading || otpCode.length < 6}
                        >
                          {citizenLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Başvuru Kaydediliyor...
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              Başvuruyu Tamamla ve Gönder
                            </>
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => { setIsOtpSent(false); setOtpCode(""); }}
                          className="w-full mt-2 text-center text-[10px] text-[var(--fd-text3)] hover:text-[var(--fd-text2)] transition-colors bg-transparent border-0 cursor-pointer"
                        >
                          ← Bilgileri Düzenle / Yeniden Kod İste
                        </button>
                      </>
                    )}
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
