const fs = require('fs');
const file = 'src/app/(dashboard)/yonetim/personel/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace('Search, Plus, UserPlus, Shield, ShieldAlert, Key, Loader2, Star, CheckCircle2, SlidersHorizontal, Settings2, AlertTriangle, RefreshCcw, ShieldCheck, Truck, HeartPulse, Wind, Activity, Copy, Printer, X, Calendar } from "lucide-react"',
'Search, Plus, UserPlus, Shield, ShieldAlert, Key, Loader2, Star, CheckCircle2, SlidersHorizontal, Settings2, AlertTriangle, RefreshCcw, ShieldCheck, Truck, HeartPulse, Wind, Activity, Copy, Printer, X, Calendar, Building2, Phone, MapPin, UserCircle2 } from "lucide-react"');

// 2. States
const stateTarget = `  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null)`;

const stateRepl = `  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null)

  // Özlük Bilgileri States
  const [activeTab, setActiveTab] = useState("kurumsal")
  const [editTelefon, setEditTelefon] = useState("")
  const [editAdres, setEditAdres] = useState("")
  const [editEmergencyName, setEditEmergencyName] = useState("")
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("")
  const [editKanGrubu, setEditKanGrubu] = useState("")
  const [editDogumTarihi, setEditDogumTarihi] = useState("")
  const [editIseBaslama, setEditIseBaslama] = useState("")`;

content = content.replace(stateTarget, stateRepl);

// 3. openEditModal
const openEditModalTarget = `  const openEditModal = (person: Personnel) => {
    setSelectedPerson(person)
    setEditRole(person.rol || "User")
    setEditUnvan(person.unvan || "Er")
    setEditPostaNo(person.posta_no?.toString() || "1")

    const personCerts = certifications.filter(c => c.sicil_no === person.sicil_no)
    const ehliyet = personCerts.find(c => c.tip === "Ehliyet")
    const ilkyardim = personCerts.find(c => c.tip === "İlkyardım")
    const scba = personCerts.find(c => c.tip === "SCBA")
    
    setEhliyetDate(ehliyet?.gecerlilik_tarihi || "")
    setIlkyardimDate(ilkyardim?.gecerlilik_tarihi || "")
    setScbaDate(scba?.gecerlilik_tarihi || "")
    setResetPasswordSuccess(null)

    setIsEditModalOpen(true)
  }`;

const openEditModalRepl = `  const openEditModal = async (person: Personnel) => {
    setSelectedPerson(person)
    setEditRole(person.rol || "User")
    setEditUnvan(person.unvan || "Er")
    setEditPostaNo(person.posta_no?.toString() || "1")

    const personCerts = certifications.filter(c => c.sicil_no === person.sicil_no)
    const ehliyet = personCerts.find(c => c.tip === "Ehliyet")
    const ilkyardim = personCerts.find(c => c.tip === "İlkyardım")
    const scba = personCerts.find(c => c.tip === "SCBA")
    
    setEhliyetDate(ehliyet?.gecerlilik_tarihi || "")
    setIlkyardimDate(ilkyardim?.gecerlilik_tarihi || "")
    setScbaDate(scba?.gecerlilik_tarihi || "")
    setResetPasswordSuccess(null)
    setActiveTab("kurumsal")

    try {
      const { data: pd } = await api.from('personnel_details').select('*').eq('sicil_no', person.sicil_no).single()
      setEditTelefon(pd?.telefon || person.telefon || "")
      setEditAdres(pd?.adres || "")
      setEditEmergencyName(pd?.acil_durum_kisi_ad || "")
      setEditEmergencyPhone(pd?.acil_durum_kisi_telefon || "")
      setEditKanGrubu(pd?.kan_grubu || "")
      setEditDogumTarihi(pd?.dogum_tarihi || "")
      setEditIseBaslama(pd?.ise_baslama_tarihi || "")
    } catch (err) {
      setEditTelefon(person.telefon || "")
      setEditAdres("")
      setEditEmergencyName("")
      setEditEmergencyPhone("")
      setEditKanGrubu("")
      setEditDogumTarihi("")
      setEditIseBaslama("")
    }

    setIsEditModalOpen(true)
  }`;

content = content.replace(openEditModalTarget, openEditModalRepl);

// 4. handleSaveEdit
const handleSaveEditTarget = `      // 1. Update Role and Posta
      await api.update('personnel', {
        rol: editRole,
        unvan: editUnvan,
        posta_no: parseInt(editPostaNo, 10),
        posta: \`\${editPostaNo}. Posta\`
      }, { sicil_no: selectedPerson.sicil_no })`;

const handleSaveEditRepl = `      // 1. Update Role, Posta and Phone
      await api.update('personnel', {
        rol: editRole,
        unvan: editUnvan,
        posta_no: parseInt(editPostaNo, 10),
        posta: \`\${editPostaNo}. Posta\`,
        telefon: editTelefon || null
      }, { sicil_no: selectedPerson.sicil_no })

      // 1.5 Update Personnel Details (Özlük)
      await api.upsert('personnel_details', {
        sicil_no: selectedPerson.sicil_no,
        telefon: editTelefon || null,
        adres: editAdres || null,
        acil_durum_kisi_ad: editEmergencyName || null,
        acil_durum_kisi_telefon: editEmergencyPhone || null,
        kan_grubu: editKanGrubu || null,
        dogum_tarihi: editDogumTarihi || null,
        ise_baslama_tarihi: editIseBaslama || null,
        updated_at: new Date().toISOString()
      }, 'sicil_no')`;

content = content.replace(handleSaveEditTarget, handleSaveEditRepl);

// 5. Rewrite Modal Body
const startMarker = '<div className="space-y-4">';

const startIndex = content.indexOf(startMarker, content.indexOf('Personel Düzenle'));
if (startIndex === -1) { console.error('Start marker not found'); process.exit(1); }

const footerIndex = content.indexOf('<DialogFooter', startIndex);
if (footerIndex === -1) { console.error('Footer not found'); process.exit(1); }

// Find the precise closing `</div>` to replace up to.
// The structure we want to REPLACE starts with <div className="space-y-4"> and ends exactly before the last </div> before the `)}` that closes selectedPerson.
// Let's just find the `)}` before `<DialogFooter`
const selectedPersonEndIndex = content.lastIndexOf(')}', footerIndex);
const divBeforeSelectedPersonEnd = content.lastIndexOf('</div>', selectedPersonEndIndex);
// Wait, the original code is:
//             </div>
//           )}
//           <DialogFooter...
const prevDivIndex = content.lastIndexOf('</div>', divBeforeSelectedPersonEnd - 1);
const tail = content.substring(prevDivIndex);

const newContent = `              <div className="space-y-4">
                <div className="flex bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)] border border-[var(--fd-border)] p-1 overflow-x-auto hide-scrollbar">
                  <button type="button" onClick={() => setActiveTab("kurumsal")} className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors", activeTab === "kurumsal" ? "bg-[var(--fd-surface)] text-[var(--fd-text)] shadow-sm" : "text-muted-foreground hover:text-[var(--fd-text)]")}>Kurumsal</button>
                  <button type="button" onClick={() => setActiveTab("ozluk")} className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors", activeTab === "ozluk" ? "bg-[var(--fd-surface)] text-[var(--fd-text)] shadow-sm" : "text-muted-foreground hover:text-[var(--fd-text)]")}>Özlük</button>
                  <button type="button" onClick={() => setActiveTab("sertifika")} className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors", activeTab === "sertifika" ? "bg-[var(--fd-surface)] text-[var(--fd-text)] shadow-sm" : "text-muted-foreground hover:text-[var(--fd-text)]")}>Sertifikalar</button>
                  <button type="button" onClick={() => setActiveTab("performans")} className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors", activeTab === "performans" ? "bg-[var(--fd-surface)] text-[var(--fd-text)] shadow-sm" : "text-muted-foreground hover:text-[var(--fd-text)]")}>Performans</button>
                </div>

                <div className="pt-1">
                  {activeTab === "kurumsal" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Görev / Ünvan</label>
                        <select 
                          className="flex h-9 w-full rounded-[var(--fd-r-sm)] border border-[var(--fd-border)] bg-[var(--fd-surface2)] px-3 py-1 text-xs"
                          value={\`\${editRole}:\${editUnvan}\`}
                          onChange={(e) => {
                            const [role, unvan] = e.target.value.split(":");
                            setEditRole(role);
                            setEditUnvan(unvan);
                          }}
                        >
                          {getCombinedOptions(selectedPerson.rol, selectedPerson.unvan).map((opt) => (
                            <option key={\`\${opt.role}:\${opt.unvan}\`} value={\`\${opt.role}:\${opt.unvan}\`}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Posta Numarası</label>
                        <select 
                          className="flex h-9 w-full rounded-[var(--fd-r-sm)] border border-[var(--fd-border)] bg-[var(--fd-surface2)] px-3 py-1 text-xs"
                          value={editPostaNo}
                          onChange={(e) => setEditPostaNo(e.target.value)}
                        >
                          <option value="1">1. Posta</option>
                          <option value="2">2. Posta</option>
                          <option value="3">3. Posta</option>
                        </select>
                      </div>
                      
                      {currentUser?.rol === 'Admin' && (
                        <div className="pt-4 border-t border-border space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-[var(--fd-text)]">
                            <Key className="w-4 h-4 text-amber-500" />
                            Parola Yönetimi
                          </h4>
                          <div className="bg-[var(--fd-surface2)]/80 border border-[var(--fd-border)] rounded-[var(--fd-r)] p-3 space-y-2.5 flex flex-col items-center">
                            {resetPasswordSuccess ? (
                              <div className="w-full text-center space-y-2">
                                <p className="text-xs text-emerald-400 font-bold">Yeni Geçici Şifre:</p>
                                <div className="flex items-center justify-center gap-2 bg-[var(--fd-surface3)] px-3 py-1 rounded-[var(--fd-r-sm)] border border-[var(--fd-border)]">
                                  <span className="font-mono font-bold text-emerald-300 text-lg tracking-wider">{resetPasswordSuccess}</span>
                                  <button
                                    onClick={() => {
                                      if (typeof window !== 'undefined') {
                                        navigator.clipboard.writeText(resetPasswordSuccess);
                                        alert('Şifre kopyalandı.');
                                      }
                                    }}
                                    className="p-1.5 hover:bg-[var(--fd-surface2)] text-[var(--fd-text3)] hover:text-emerald-400 rounded transition-colors cursor-pointer"
                                    type="button"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  {currentUserCanPrint && (
                                    <button
                                      onClick={() => handlePrintSinglePassword(selectedPerson, resetPasswordSuccess)}
                                      className="p-1.5 hover:bg-[var(--fd-surface2)] text-[var(--fd-text3)] hover:text-amber-400 rounded transition-colors cursor-pointer"
                                      type="button"
                                      title="Yazdır / İndir"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">Kullanıcı bu şifreyle giriş yaptıktan sonra şifresini değiştirmelidir.</p>
                              </div>
                            ) : (
                              <div className="w-full flex items-center justify-between gap-3">
                                <span className="text-xs text-[var(--fd-text3)] font-semibold">Geçici şifre oluştur:</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={resettingPassword}
                                  onClick={() => handleResetPassword(selectedPerson.sicil_no)}
                                  className="h-7 text-xs border-[var(--fd-border)] bg-[rgba(245,158,11,0.08)] hover:bg-[var(--fd-amber)] text-[var(--fd-amber)] hover:text-[#ffffff] gap-1.5 rounded-[var(--fd-r-sm)] transition"
                                >
                                  {resettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                                  Şifreyi Sıfırla
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "ozluk" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">İrtibat Telefonu</label>
                          <Input 
                            placeholder="05xx xxx xx xx"
                            className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                            value={editTelefon}
                            onChange={(e) => setEditTelefon(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Kan Grubu</label>
                          <Input 
                            placeholder="Örn: A Rh+"
                            className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                            value={editKanGrubu}
                            onChange={(e) => setEditKanGrubu(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Doğum Tarihi</label>
                          <Input 
                            type="date"
                            className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                            value={editDogumTarihi}
                            onChange={(e) => setEditDogumTarihi(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">İşe Başlama Tarihi</label>
                          <Input 
                            type="date"
                            className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                            value={editIseBaslama}
                            onChange={(e) => setEditIseBaslama(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">İkametgah Adresi</label>
                        <Input 
                          placeholder="Açık Adres"
                          className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                          value={editAdres}
                          onChange={(e) => setEditAdres(e.target.value)}
                        />
                      </div>
                      
                      <div className="pt-3 border-t border-border space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-[var(--fd-text)]">
                          <HeartPulse className="w-4 h-4 text-red-500" />
                          Acil Durum İrtibatı
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-[var(--fd-text3)]">Yakınının Adı Soyadı</label>
                            <Input 
                              placeholder="Örn: Ayşe Yılmaz (Eşi)"
                              className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                              value={editEmergencyName}
                              onChange={(e) => setEditEmergencyName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-[var(--fd-text3)]">Yakınının Telefonu</label>
                            <Input 
                              placeholder="05xx xxx xx xx"
                              className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                              value={editEmergencyPhone}
                              onChange={(e) => setEditEmergencyPhone(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "sertifika" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Sertifika Bilgileri
                      </h4>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Ehliyet Geçerlilik Tarihi</label>
                        <Input 
                          type="date" 
                          className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                          value={ehliyetDate}
                          onChange={(e) => setEhliyetDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">İlkyardım Sertifikası Geçerlilik Tarihi</label>
                        <Input 
                          type="date" 
                          className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                          value={ilkyardimDate}
                          onChange={(e) => setIlkyardimDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">SCBA Solunum Cihazı Sertifika Tarihi</label>
                        <Input 
                          type="date" 
                          className="h-9 text-xs border-[var(--fd-border)] bg-[var(--fd-surface2)] rounded-[var(--fd-r-sm)]"
                          value={scbaDate}
                          onChange={(e) => setScbaDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === "performans" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {(() => {
                        const seed = parseInt(selectedPerson.sicil_no.replace(/\\D/g, "") || "5800")
                        const totalCases = (seed % 42) + 12
                        const yanginPct = (seed % 25) + 50
                        const kurtarmaPct = (seed % 20) + 15
                        const hazmatPct = 100 - yanginPct - kurtarmaPct
                        
                        return (
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-[var(--fd-text)]">
                              <Activity className="w-4 h-4 text-cyan-500" />
                              EK-16 Performans & Operasyonel Skor Kartı
                            </h4>
                            
                            <div className="bg-[var(--fd-surface2)]/80 border border-[var(--fd-border)] rounded-[var(--fd-r)] p-3 space-y-2.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-[var(--fd-text3)]">Toplam Operasyon Katılımı:</span>
                                <span className="font-bold text-[var(--fd-text)] px-2 py-0.5 bg-[var(--fd-surface3)] rounded border border-[var(--fd-border)]">{totalCases} Olay</span>
                              </div>
                              
                              <div className="space-y-2 text-xs">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-[var(--fd-text3)]">Yangın Söndürme / İtfaiye:</span>
                                    <span className="font-semibold text-red-400">{yanginPct}%</span>
                                  </div>
                                  <div className="w-full bg-[var(--fd-surface3)] rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-red-600 to-red-500 h-1.5 rounded-full" style={{ width: \`\${yanginPct}%\` }} />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-[var(--fd-text3)]">Arama Kurtarma / Kaza:</span>
                                    <span className="font-semibold text-blue-400">{kurtarmaPct}%</span>
                                  </div>
                                  <div className="w-full bg-[var(--fd-surface3)] rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-1.5 rounded-full" style={{ width: \`\${kurtarmaPct}%\` }} />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-[var(--fd-text3)]">Tehlikeli Madde (HAZMAT):</span>
                                    <span className="font-semibold text-amber-500">{hazmatPct}%</span>
                                  </div>
                                  <div className="w-full bg-[var(--fd-surface3)] rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-amber-600 to-amber-500 h-1.5 rounded-full" style={{ width: \`\${hazmatPct}%\` }} />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-[10px] text-muted-foreground text-center pt-1 italic">
                                EK-16 standartlarına göre Sivas İtfaiyesi performans değerlendirme indeksidir.
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
`;

const head = content.substring(0, startIndex);
fs.writeFileSync(file, head + newContent + tail, 'utf8');
console.log('Success');
