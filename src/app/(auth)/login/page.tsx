"use client"
import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Loader2, ShieldAlert, LogIn, Flame, FileText, CheckCircle2, Copy, Check, Info, X, Users } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState<'baca' | 'olur'>('baca')
  const [citizenLoading, setCitizenLoading] = useState(false)
  const [citizenError, setCitizenError] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [copied, setCopied] = useState(false)

  // Baca Form State (KVKK Temizliği Yapıldı)
  const [bacaName, setBacaName] = useState("")
  const [bacaPhone, setBacaPhone] = useState("")
  const [bacaAddress, setBacaAddress] = useState("")
  const [bacaType, setBacaType] = useState("Konut")

  // Olur Raporu Form State (KVKK Temizliği Yapıldı)
  const [olurName, setOlurName] = useState("")
  const [olurPhone, setOlurPhone] = useState("")
  const [olurAddress, setOlurAddress] = useState("")
  const [olurType, setOlurType] = useState("İşyeri")
  const [olurBizName, setOlurBizName] = useState("")

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
    } catch (err: unknown) {
      setLoginError("Sunucuyla bağlantı kurulamadı.")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCitizenError("")
    setTrackingCode("")
    setCitizenLoading(true)

    await new Promise(r => setTimeout(r, 500))

    try {
      const payload = activeTab === 'baca' ? {
        type: 'baca_temizligi',
        ad_soyad: bacaName,
        telefon: bacaPhone,
        adres: bacaAddress,
        bina_tipi: bacaType
      } : {
        type: 'yangin_olur_raporu',
        ad_soyad: olurName,
        telefon: olurPhone,
        adres: olurAddress,
        bina_tipi: olurType,
        isyeri_adi_turu: olurBizName
      };

      const res = await fetch('/api/citizen-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setCitizenError(data.error || "Başvuru sırasında bir hata oluştu.")
        return;
      }

      setTrackingCode(data.trackingCode);

      // Formları sıfırla
      if (activeTab === 'baca') {
        setBacaName("");
        setBacaPhone("");
        setBacaAddress("");
        setBacaType("Konut");
      } else {
        setOlurName("");
        setOlurPhone("");
        setOlurAddress("");
        setOlurType("İşyeri");
        setOlurBizName("");
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
    <div className="min-h-screen h-screen w-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950 text-slate-100 box-border">
      
      {/* Sol Panel: Premium Görsel (Masaüstü Özel - Asil Eski Düzen) */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 relative h-full flex-col justify-between p-12 overflow-hidden select-none">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/login_bg_sivas_itfaiye.jpg" 
            alt="Sivas İtfaiye Filosu" 
            fill 
            className="object-cover object-center filter brightness-50 contrast-110 transition-all duration-700"
            priority 
          />
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[0.5px] transition-colors duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950/30" />
        </div>

        {/* Üst Logolar */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-white/95 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
            <Image src="/logo-belediye.png" alt="Sivas Belediyesi" width={48} height={48} className="object-contain w-10 h-10 lg:w-12 lg:h-12" />
          </div>
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-white/95 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
            <Image src="/logo-itfaiye.png" alt="Sivas İtfaiyesi" width={48} height={48} className="object-contain w-10 h-10 lg:w-12 lg:h-12" />
          </div>
          <div className="h-6 w-px bg-white/20" />
          <span className="text-xs lg:text-lg xl:text-xl font-black tracking-widest text-slate-200 uppercase transition-all duration-300">SİVAS BELEDİYESİ</span>
        </div>

        {/* Alt Tipografi */}
        <div className="relative z-10 max-w-3xl mt-auto">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-none text-white drop-shadow-lg transition-all duration-300">
              Sivas İtfaiyesi<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-amber-500">Bilgi Yönetim Sistemi</span>
            </h1>
            <p className="text-sm lg:text-base xl:text-lg text-slate-300 font-semibold leading-relaxed max-w-2xl transition-all duration-300">
              Canlı komuta kontrol haritası, akıllı araç envanteri, solunum uzmanlığı takipleri ve anlık postane devirlerini yöneten merkezi otomasyon portali.
            </p>
          </div>
        </div>

        {/* En Alt Bilgi */}
        <div className="relative z-10 mt-12 flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-6">
          <span className="font-bold">Sivas İtfaiye Komuta Merkez</span>
          <span className="font-semibold">© 2026 Tüm Hakları Saklıdır</span>
        </div>
      </div>

      {/* Sağ Panel: Giriş Formu (Bütün Cihazlarda Kompakt Asil Düzen) */}
      <div className="lg:col-span-5 xl:col-span-4 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-slate-950 relative overflow-hidden h-full">
        {/* Arka plan siber neon ışıltıları */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-cyan-600/5 rounded-full filter blur-[100px] pointer-events-none z-0" />

        <div className="w-full max-w-sm mx-auto space-y-8 z-10 flex flex-col h-full justify-between lg:justify-center py-4 box-border">
          
          {/* Mobil Logo / Başlık Bölümü */}
          <div className="text-center lg:hidden space-y-3">
            <div className="flex justify-center items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center p-1 shadow-lg">
                <Image src="/logo-belediye.png" alt="Sivas Belediyesi" width={32} height={32} className="object-contain" />
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center p-1 shadow-lg">
                <Image src="/logo-itfaiye.png" alt="Sivas İtfaiyesi" width={32} height={32} className="object-contain" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-white">Sivas İtfaiyesi</h2>
              <p className="text-xs text-slate-400 font-semibold">Bilgi ve Envanter Yönetim Portalı</p>
            </div>
          </div>

          {/* Masaüstü Başlık */}
          <div className="hidden lg:block space-y-2">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white transition-all duration-300">Personel Girişi</h2>
            <p className="text-xs lg:text-sm text-slate-400 font-semibold transition-all duration-300">Devam etmek için sicil bilginizle oturum açın.</p>
          </div>

          {/* Cam Morfolojili Form Kartı */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden my-auto w-full box-border">
            <form onSubmit={handleLogin} className="space-y-4">
              
              {loginError && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-semibold leading-snug">{loginError}</span>
                </div>
              )}

              {searchParams.get("redirect") && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] leading-snug">
                  <Info className="w-4 h-4 shrink-0 animate-pulse text-amber-500" />
                  <span className="font-semibold">Bu alana erişmek için personel oturumu açmanız gerekmektedir.</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] lg:text-xs font-black text-slate-300 uppercase tracking-widest transition-all">Kullanıcı Adı veya Sicil No</label>
                <Input 
                  placeholder="Kullanıcı adı veya sicil no" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="h-11 lg:h-12 bg-slate-950/60 border-slate-800 focus:border-red-500 focus:ring-red-500/20 rounded-xl text-slate-100 lg:text-base font-semibold placeholder-slate-600 lg:placeholder-slate-400 pl-4 w-full text-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] lg:text-xs font-black text-slate-300 uppercase tracking-widest transition-all">Giriş Parolası</label>
                <Input 
                  type="password" 
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 lg:h-12 bg-slate-950/60 border-slate-800 focus:border-red-500 focus:ring-red-500/20 rounded-xl text-slate-100 lg:text-base font-semibold placeholder-slate-600 lg:placeholder-slate-400 pl-4 w-full text-sm transition-all"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/25 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 border-0 text-sm cursor-pointer" 
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

            <div className="h-px bg-slate-800/80 my-4" />

            {/* Vatandaş Başvuru Modalı Tetikleyici Butonu */}
            <button
              type="button"
              onClick={() => { setIsModalOpen(true); setCitizenError(""); setTrackingCode(""); }}
              className="w-full h-10 border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-[0.98]"
            >
              <Users className="w-4 h-4" />
              Vatandaş Hizmet Başvuruları
            </button>
          </div>

          {/* Belediye Akıllı Şehir Künyesi */}
          <div className="text-center space-y-2 pt-2 lg:pt-4">
            <div className="relative w-40 lg:w-48 h-10 lg:h-12 mx-auto opacity-95 lg:opacity-100 transition-all duration-200">
              <Image 
                src="/logo-akilli-sehir.png" 
                alt="Akıllı Şehir Logosu" 
                fill 
                className="object-contain"
              />
            </div>
            <p className="text-[10px] lg:text-xs text-slate-500 lg:text-slate-400 font-semibold max-w-[280px] lg:max-w-xs mx-auto leading-relaxed transition-colors duration-200">
              Sivas Belediyesi Akıllı Şehir ve Kent Bilgi Sistemleri Müdürlüğü tarafından geliştirilmiştir.
            </p>
          </div>
        </div>
      </div>

      {/* VATANDAŞ HİZMETLERİ MOBİL UYUMLU POP-UP MODAL (%100 MOBİL UYUMLULUK ZIRHI) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-x-hidden overflow-y-auto box-border">
          
          <div className="relative w-full max-w-md max-h-[90vh] bg-slate-900/95 border border-cyan-500/25 p-6 rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-y-auto box-border scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            
            {/* Modal Kapatma Butonu */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 rounded-xl p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer z-20"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Başlık */}
            <div className="mb-4 pr-10">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                Vatandaş Hizmet Başvuruları
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Şifresiz, anlık siber komuta başvuru modülü.
              </p>
            </div>

            {/* Modal İçerik */}
            <div className="w-full box-border flex-1">
              
              {trackingCode ? (
                /* Başarı Ekranı (Neon Yeşil Gösterim) */
                <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-100">Başvurunuz Alınmıştır</h3>
                    <p className="text-[10px] text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                      Sürecinizi izlemek üzere lütfen takip kodunu not ediniz.
                    </p>
                  </div>

                  <div className="bg-slate-950/90 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 max-w-xs mx-auto shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]">
                    <div className="text-left">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block leading-none">Takip Kodu</span>
                      <span className="text-base font-black font-mono text-emerald-400 tracking-wider drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">
                        {trackingCode}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-pointer"
                      title="Kopyala"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="pt-2 flex gap-2 justify-center">
                    <Button 
                      type="button"
                      onClick={() => setTrackingCode("")}
                      className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold rounded-lg text-[10px] py-1.5 px-3 cursor-pointer"
                    >
                      Yeni Başvuru
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] py-1.5 px-3 cursor-pointer border-0"
                    >
                      Kapat
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form Gösterimi */
                <div className="space-y-4 w-full box-border">
                  {/* Sekme Seçiciler */}
                  <div className="grid grid-cols-2 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => { setActiveTab('baca'); setCitizenError(""); }}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'baca' 
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-200'
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
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      İtfaiye Olur Raporu
                    </button>
                  </div>

                  <form onSubmit={handleCitizenSubmit} className="space-y-3 w-full box-border">
                    {citizenError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold leading-snug">{citizenError}</span>
                      </div>
                    )}

                    {activeTab === 'baca' ? (
                      /* BACA FORMU */
                      <>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ad Soyad</label>
                          <Input 
                            placeholder="Adınızı ve Soyadınızı Yazınız" 
                            value={bacaName}
                            onChange={(e) => setBacaName(e.target.value)}
                            required
                            className="h-9 bg-slate-950/60 border-slate-800 focus:border-red-500 focus:ring-red-500/20 rounded-md text-slate-100 text-[11px] pl-3 w-full box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">İrtibat Telefonu</label>
                          <Input 
                            type="tel"
                            placeholder="Telefon Numaranızı Giriniz" 
                            value={bacaPhone}
                            onChange={(e) => setBacaPhone(e.target.value)}
                            required
                            className="h-9 bg-slate-950/60 border-slate-800 focus:border-red-500 focus:ring-red-500/20 rounded-md text-slate-100 text-[11px] pl-3 w-full box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Temizlik Yapılacak Adres</label>
                          <textarea 
                            placeholder="Temizlik yapılacak binanın tam açık adresi..." 
                            value={bacaAddress}
                            onChange={(e) => setBacaAddress(e.target.value)}
                            required
                            rows={2}
                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 rounded-md text-slate-100 text-[11px] p-2.5 placeholder-slate-600 resize-none font-sans box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Bina Tipi</label>
                          <select 
                            value={bacaType}
                            onChange={(e) => setBacaType(e.target.value)}
                            className="w-full h-9 bg-slate-950/60 border border-slate-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 rounded-md text-slate-100 text-[11px] px-2 font-sans box-border"
                          >
                            <option value="Konut" className="bg-slate-950">Müstakil Ev</option>
                            <option value="Apartman" className="bg-slate-950">Apartman / Site</option>
                            <option value="İşyeri" className="bg-slate-950">İşyeri / Fabrika</option>
                            <option value="Kamu Binası" className="bg-slate-950">Kamu Kuruluşu</option>
                          </select>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full h-10 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold rounded-lg transition-all shadow-lg active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5 border-0 text-[11px] cursor-pointer box-border" 
                          disabled={citizenLoading}
                        >
                          {citizenLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Gönderiliyor...
                            </>
                          ) : (
                            <>
                              <Flame className="w-3.5 h-3.5 animate-pulse" />
                              Baca Temizlik Başvurusu Yap
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      /* OLUR RAPORU FORMU */
                      <>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ad Soyad (İşyeri Yetkilisi)</label>
                          <Input 
                            placeholder="Adınızı ve Soyadınızı Yazınız" 
                            value={olurName}
                            onChange={(e) => setOlurName(e.target.value)}
                            required
                            className="h-9 bg-slate-950/60 border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-md text-slate-100 text-[11px] pl-3 w-full box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">İşyeri Unvanı ve Faaliyet Türü</label>
                          <Input 
                            placeholder="İşyeri Ticari Unvanı ve Türü" 
                            value={olurBizName}
                            onChange={(e) => setOlurBizName(e.target.value)}
                            required
                            className="h-9 bg-slate-950/60 border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-md text-slate-100 text-[11px] pl-3 w-full box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">İrtibat Telefonu</label>
                          <Input 
                            type="tel"
                            placeholder="Telefon Numaranızı Giriniz" 
                            value={olurPhone}
                            onChange={(e) => setOlurPhone(e.target.value)}
                            required
                            className="h-9 bg-slate-950/60 border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-md text-slate-100 text-[11px] pl-3 w-full box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">İşyeri Adresi</label>
                          <textarea 
                            placeholder="İşyerinin tam açık adresi..." 
                            value={olurAddress}
                            onChange={(e) => setOlurAddress(e.target.value)}
                            required
                            rows={2}
                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 rounded-md text-slate-100 text-[11px] p-2.5 placeholder-slate-600 resize-none font-sans box-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Bina Yapı Tipi</label>
                          <select 
                            value={olurType}
                            onChange={(e) => setOlurType(e.target.value)}
                            className="w-full h-9 bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 rounded-md text-slate-100 text-[11px] px-2 font-sans box-border"
                          >
                            <option value="İşyeri" className="bg-slate-950">Bağımsız İşyeri / Dükkan</option>
                            <option value="Apartman Altı" className="bg-slate-950">Apartman Altı İşyeri</option>
                            <option value="Fabrika" className="bg-slate-950">Fabrika / Sanayi Tesisi</option>
                            <option value="Konut" className="bg-slate-950">Mesken / Ortak Alan</option>
                          </select>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full h-10 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-lg transition-all shadow-lg active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5 border-0 text-[11px] cursor-pointer box-border" 
                          disabled={citizenLoading}
                        >
                          {citizenLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Gönderiliyor...
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 animate-pulse" />
                              Ruhsat Uygunluk Başvurusu Yap
                            </>
                          )}
                        </Button>
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
