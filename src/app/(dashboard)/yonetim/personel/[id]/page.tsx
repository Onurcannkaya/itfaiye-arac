"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, User, Phone, MapPin, Calendar, Briefcase, FileText, Activity, Shield, ActivitySquare, LogOut, CheckCircle2, Clock, AlertTriangle } from "lucide-react"

// Types
type Personel = any; // TODO: Better typing

export default function PersonelProfilPage() {
  const params = useParams()
  const router = useRouter()
  const sicil_no = params.id as string

  const [personel, setPersonel] = useState<Personel | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [leaves, setLeaves] = useState<any[]>([])
  const [equipments, setEquipments] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState("ozet")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      try {
        // Fetch Main Personnel Info
        const { data: pData, error: pErr } = await api
          .from('personnel')
          .select('*')
          .eq('sicil_no', sicil_no)
          .single()
          
        if (pData) setPersonel(pData)

        // Fetch Details
        const { data: dData } = await api.from('personnel_details').select('*').eq('sicil_no', sicil_no).single()
        if (dData) setDetails(dData)

        // Fetch Leaves
        const { data: lData } = await api.from('personnel_leaves').select('*').eq('sicil_no', sicil_no).order('created_at', { ascending: false })
        if (lData) setLeaves(lData)

        // Fetch Equipments
        const { data: eData } = await api.from('personnel_equipment').select('*').eq('sicil_no', sicil_no).order('created_at', { ascending: false })
        if (eData) setEquipments(eData)

        // Fetch Activities
        const { data: aData } = await api.from('personnel_activities').select('*').eq('sicil_no', sicil_no).order('tarih', { ascending: false })
        if (aData) setActivities(aData)

        // Fetch Records
        const { data: rData } = await api.from('personnel_records').select('*').eq('sicil_no', sicil_no).order('tarih', { ascending: false })
        if (rData) setRecords(rData)

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    if (sicil_no) {
      fetchData()
    }
  }, [sicil_no])

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Profil yükleniyor...</div>
  }

  if (!personel) {
    return <div className="p-8 text-center text-danger">Personel bulunamadı!</div>
  }

  const tabs = [
    { id: 'ozet', label: 'Özet', icon: User },
    { id: 'iletisim', label: 'İletişim', icon: Phone },
    { id: 'izinler', label: 'İzinler', icon: Calendar },
    { id: 'zimmet', label: 'Zimmet (Ekipman)', icon: Shield },
    { id: 'hizmet', label: 'Hizmet Dökümü', icon: Briefcase },
    { id: 'faaliyet', label: 'Faaliyetler', icon: ActivitySquare },
  ]

  return (
    <div className="flex flex-col h-full bg-background min-h-screen pb-12">
      {/* Header */}
      <div className="bg-surface border-b border-border p-4 sm:p-6 sm:pb-0">
        <button 
          onClick={() => router.push('/yonetim/personel')} 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Personel Listesine Dön
        </button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-2xl sm:text-3xl font-bold shrink-0">
            {personel.ad.charAt(0)}{personel.soyad.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{personel.ad} {personel.soyad}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="font-mono bg-surface">{personel.sicil_no}</Badge>
              <span>{personel.unvan}</span>
              <span className="opacity-50">|</span>
              <span className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${personel.aktif ? 'bg-success' : 'bg-danger'}`} />
                {personel.aktif ? 'Aktif Görevde' : 'Pasif'}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar gap-1 border-b border-border/50">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
        
        {/* ÖZET SEKMESİ */}
        {activeTab === 'ozet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sicil No</p>
                    <p className="font-medium">{personel.sicil_no}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rol</p>
                    <p className="font-medium">{personel.rol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-posta</p>
                    <p className="font-medium">{personel.posta || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kan Grubu</p>
                    <p className="font-medium text-danger">{details?.kan_grubu || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">İşe Başlama Tarihi</p>
                    <p className="font-medium">{details?.ise_baslama_tarihi ? new Date(details.ise_baslama_tarihi).toLocaleDateString('tr-TR') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Doğum Tarihi</p>
                    <p className="font-medium">{details?.dogum_tarihi ? new Date(details.dogum_tarihi).toLocaleDateString('tr-TR') : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sistem Yetkileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <span>Sadece Görüntüler</span>
                  </div>
                  <Badge variant={personel.view_only ? "success" : "outline"}>{personel.view_only ? 'Evet' : 'Hayır'}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                    <span>Envanter Onaylayabilir</span>
                  </div>
                  <Badge variant={personel.can_approve ? "success" : "outline"}>{personel.can_approve ? 'Evet' : 'Hayır'}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span>Barkod Basabilir</span>
                  </div>
                  <Badge variant={personel.can_print ? "success" : "outline"}>{personel.can_print ? 'Evet' : 'Hayır'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* İLETİŞİM SEKMESİ */}
        {activeTab === 'iletisim' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">İletişim & Acil Durum Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-muted-foreground border-b pb-2">Kişisel İletişim</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium text-lg">{details?.telefon || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Açık Adres</p>
                    <p className="font-medium">{details?.adres || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4 bg-danger/5 border border-danger/20 p-4 rounded-xl">
                  <h3 className="font-semibold text-danger border-b border-danger/20 pb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Acil Durumda Ulaşılacak Kişi
                  </h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Kişi Adı Soyadı</p>
                    <p className="font-medium">{details?.acil_durum_kisi_ad || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon Numarası</p>
                    <p className="font-medium">{details?.acil_durum_kisi_telefon || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* İZİNLER SEKMESİ */}
        {activeTab === 'izinler' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">İzin Kayıtları</h2>
              <Button>Yeni İzin Talebi</Button>
            </div>
            
            {leaves.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                Kayıtlı izin bulunmamaktadır.
              </div>
            ) : (
              <div className="space-y-4">
                {leaves.map(leave => (
                  <div key={leave.id} className="p-4 border rounded-xl bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={leave.durum === 'Onaylandı' ? 'success' : leave.durum === 'Reddedildi' ? 'danger' : 'warning'}>
                          {leave.durum}
                        </Badge>
                        <span className="font-semibold">{leave.izin_turu}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {new Date(leave.baslangic_tarihi).toLocaleDateString('tr-TR')} - {new Date(leave.bitis_tarihi).toLocaleDateString('tr-TR')}
                      </div>
                      <p className="text-sm mt-1">{leave.aciklama}</p>
                    </div>
                    {leave.belge_url && (
                      <a href={leave.belge_url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                        <FileText className="w-4 h-4" /> Rapor / Belge Eki
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ZİMMET SEKMESİ */}
        {activeTab === 'zimmet' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Zimmetli Ekipmanlar</h2>
              <Button>Zimmet Ekle</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipments.length === 0 ? (
                <div className="col-span-full text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                  Zimmetli ekipman bulunmamaktadır.
                </div>
              ) : (
                equipments.map(eq => (
                  <Card key={eq.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{eq.ekipman_adi}</h3>
                          <p className="text-xs text-muted-foreground font-mono">Seri No: {eq.seri_no || '-'}</p>
                        </div>
                        <Badge variant={eq.durum === 'Aktif' ? 'success' : 'outline'}>{eq.durum}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                        <div>
                          <p className="text-muted-foreground text-xs">Veriliş Tarihi</p>
                          <p>{new Date(eq.verilis_tarihi).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Miad Tarihi</p>
                          <p className={eq.miad_tarihi && new Date(eq.miad_tarihi) < new Date() ? 'text-danger font-semibold' : ''}>
                            {eq.miad_tarihi ? new Date(eq.miad_tarihi).toLocaleDateString('tr-TR') : '-'}
                          </p>
                        </div>
                        {eq.beden && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground text-xs">Beden / Ölçü</p>
                            <p>{eq.beden}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* FAALİYET VE HİZMET */}
        {activeTab === 'hizmet' && (
          <Card>
            <CardHeader>
              <CardTitle>Hizmet Dökümü & Kayıtlar</CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                  Kayıt bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {records.map(rec => (
                    <div key={rec.id} className="flex gap-4 p-3 border-b last:border-0">
                      <div className="w-24 shrink-0 text-sm text-muted-foreground pt-1">
                        {new Date(rec.tarih).toLocaleDateString('tr-TR')}
                      </div>
                      <div>
                        <Badge className="mb-1" variant="outline">{rec.kayit_turu}</Badge>
                        <p className="text-sm">{rec.aciklama}</p>
                        {rec.belge_no && <p className="text-xs text-muted-foreground mt-1">Belge No: {rec.belge_no}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'faaliyet' && (
          <Card>
            <CardHeader>
              <CardTitle>Eğitim & Operasyon Faaliyetleri</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                  Faaliyet kaydı bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map(act => (
                    <div key={act.id} className="flex items-center gap-4 p-3 border rounded-lg bg-surface">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ActivitySquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{act.faaliyet_turu}</h4>
                        <p className="text-sm text-muted-foreground">{act.aciklama}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{new Date(act.tarih).toLocaleDateString('tr-TR')}</p>
                        <p className="text-xs text-muted-foreground">{act.sure_dakika} dk</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
