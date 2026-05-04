"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Loader2, FileText, CheckCircle, Clock, MapPin, User, Phone, Info } from "lucide-react"

type CitizenRequest = any; // TODO: proper typing

export default function HizmetlerPage() {
  const [requests, setRequests] = useState<CitizenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Details Modal State
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('citizen_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setRequests(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('citizen_requests')
        .update({ durum: newStatus })
        .eq('id', id)
      
      if (!error) {
        setRequests(requests.map(req => req.id === id ? { ...req, durum: newStatus } : req))
        if (selectedRequest && selectedRequest.id === id) {
          setSelectedRequest({ ...selectedRequest, durum: newStatus })
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (durum: string) => {
    switch (durum) {
      case 'Onaylandı': return <Badge className="bg-success hover:bg-success/90">Onaylandı</Badge>
      case 'İnceleniyor': return <Badge className="bg-warning hover:bg-warning/90">İnceleniyor</Badge>
      case 'Reddedildi': return <Badge variant="danger">Reddedildi</Badge>
      default: return <Badge variant="outline" className="bg-muted">Bekliyor</Badge>
    }
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor...</div>
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vatandaş Hizmetleri</h1>
          <p className="text-muted-foreground text-sm">Baca Temizliği, İtfaiye Uygunluk Raporu ve Eğitim Talepleri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-surface/50">
            Sistemde henüz bir hizmet başvurusu bulunmamaktadır.
          </div>
        ) : (
          requests.map(req => (
            <Card key={req.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    req.talep_turu.includes('Baca') ? 'bg-orange-500/10 text-orange-500' : 
                    req.talep_turu.includes('Eğitim') ? 'bg-blue-500/10 text-blue-500' :
                    'bg-primary/10 text-primary'
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{req.talep_turu}</span>
                      {getStatusBadge(req.durum)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {req.basvuran_ad_soyad}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {req.irtibat_tel}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {req.adres}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 items-center justify-end md:w-auto shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                    Detayları İncele
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-border">
            <CardHeader className="bg-surface/30 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" /> Başvuru Detayları
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Başvuru Tarihi: {new Date(selectedRequest.basvuru_tarihi).toLocaleString('tr-TR')}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>Kapat</Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Vatandaş Bilgileri */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm border-b pb-1">Vatandaş / Başvuran Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground block text-xs">TC / Vergi No</span>{selectedRequest.basvuran_tc || '-'}</div>
                  <div><span className="text-muted-foreground block text-xs">Ad Soyad / Unvan</span>{selectedRequest.basvuran_ad_soyad}</div>
                  <div><span className="text-muted-foreground block text-xs">İrtibat No</span>{selectedRequest.irtibat_tel}</div>
                  <div className="col-span-2"><span className="text-muted-foreground block text-xs">Açık Adres</span>{selectedRequest.adres}</div>
                </div>
              </div>

              {/* JSONB Detayları */}
              {selectedRequest.talep_turu === 'Baca Temizliği' && selectedRequest.baca_detaylari && (
                <div className="space-y-3 bg-orange-500/5 p-4 rounded-xl border border-orange-500/10">
                  <h3 className="font-semibold text-sm text-orange-600 border-b border-orange-500/20 pb-1">Baca Temizlik Detayları (Adetler)</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {Object.entries(selectedRequest.baca_detaylari).map(([key, val]) => (
                      <div key={key} className="bg-background px-3 py-1.5 rounded-md border shadow-sm">
                        <span className="text-muted-foreground capitalize mr-2">{key}:</span>
                        <span className="font-bold">{String(val)}</span>
                      </div>
                    ))}
                    {Object.keys(selectedRequest.baca_detaylari).length === 0 && <span className="text-muted-foreground">Detay girilmemiş.</span>}
                  </div>
                </div>
              )}

              {selectedRequest.talep_turu === 'İtfaiye Uygunluk Raporu' && selectedRequest.isyeri_detaylari && (
                <div className="space-y-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <h3 className="font-semibold text-sm text-primary border-b border-primary/20 pb-1">İşyeri ve Faaliyet Detayları</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(selectedRequest.isyeri_detaylari).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-muted-foreground block text-xs capitalize">{key.replace('_', ' ')}</span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                    {Object.keys(selectedRequest.isyeri_detaylari).length === 0 && <span className="text-muted-foreground">Detay girilmemiş.</span>}
                  </div>
                </div>
              )}

              {/* Aksiyonlar */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-sm">Durum Güncelle</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant={selectedRequest.durum === 'Bekliyor' ? 'default' : 'outline'} 
                    size="sm" onClick={() => updateStatus(selectedRequest.id, 'Bekliyor')}
                    disabled={updating === selectedRequest.id}
                  >Bekliyor</Button>
                  <Button 
                    variant={selectedRequest.durum === 'İnceleniyor' ? 'default' : 'outline'} 
                    size="sm" onClick={() => updateStatus(selectedRequest.id, 'İnceleniyor')}
                    disabled={updating === selectedRequest.id}
                  >İnceleniyor</Button>
                  <Button 
                    variant={selectedRequest.durum === 'Onaylandı' ? 'default' : 'outline'} 
                    className={selectedRequest.durum === 'Onaylandı' ? 'bg-success hover:bg-success/90' : ''}
                    size="sm" onClick={() => updateStatus(selectedRequest.id, 'Onaylandı')}
                    disabled={updating === selectedRequest.id}
                  >Onaylandı</Button>
                  <Button 
                    variant={selectedRequest.durum === 'Reddedildi' ? 'destructive' : 'outline'} 
                    size="sm" onClick={() => updateStatus(selectedRequest.id, 'Reddedildi')}
                    disabled={updating === selectedRequest.id}
                  >Reddedildi</Button>
                  
                  {updating === selectedRequest.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
