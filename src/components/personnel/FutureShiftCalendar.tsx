"use client"

import { useState, useEffect } from "react"
import { Personnel } from "@/types"
import { getActivePostaForStation } from "@/lib/shiftUtils"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Calendar, Loader2, Users, AlertTriangle, Lock } from "lucide-react"
import { useAuthStore } from "@/lib/authStore"

interface FutureShiftCalendarProps {
  personnelList: Personnel[]
  onLeaveUpdated?: () => void
}

const LEAVE_TYPES = [
  "İzinli",
  "Yıllık İzin",
  "Mazeret İzni",
  "Raporlu",
  "Geçici Görev",
  "Dış Görev"
]

export function FutureShiftCalendar({ personnelList, onLeaveUpdated }: FutureShiftCalendarProps) {
  const { user } = useAuthStore()
  const canEdit = user?.rol === 'Admin' || user?.rol === 'Editor'
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })

  const [activePersonnel, setActivePersonnel] = useState<Personnel[]>([])
  const [leaves, setLeaves] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<Set<string>>(new Set())
  const [bulkActionType, setBulkActionType] = useState<string>("")
  const [bulkActionNote, setBulkActionNote] = useState<string>("")
  const [leaveDays, setLeaveDays] = useState<number>(1)
  const [saving, setSaving] = useState(false)

  // When date changes, calculate which shift is active and fetch leaves
  useEffect(() => {
    async function loadLeaves() {
      setLoading(true)
      try {
        const targetDate = new Date(selectedDate)
        
        // 1. Calculate who is on duty for the selected date
        const filtered = personnelList.filter(p => {
          const activePosta = getActivePostaForStation(p.istasyon, targetDate)
          return p.posta_no === activePosta
        })
        setActivePersonnel(filtered)

        // 2. Fetch leaves for this date
        const { data: leavesData } = await api.from('personnel_leaves')
          .select('*')
          .lte('baslangic_tarihi', selectedDate)
          .gte('bitis_tarihi', selectedDate)

        const leaveMap: Record<string, any> = {}
        if (leavesData) {
          leavesData.forEach((l: any) => {
            leaveMap[l.sicil_no] = l
          })
        }
        setLeaves(leaveMap)
      } catch (err) {
        console.error("Failed to load leaves for date", err)
      } finally {
        setLoading(false)
      }
    }
    loadLeaves()
  }, [selectedDate, personnelList])

  const togglePersonnelSelection = (sicilNo: string) => {
    const newSet = new Set(selectedPersonnelIds)
    if (newSet.has(sicilNo)) newSet.delete(sicilNo)
    else newSet.add(sicilNo)
    setSelectedPersonnelIds(newSet)
  }

  const handleBulkAction = async () => {
    if (selectedPersonnelIds.size === 0) return alert("Lütfen en az bir personel seçin.")
    if (!bulkActionType) return alert("Lütfen bir izin/durum türü seçin.")

    setSaving(true)
    try {
      const promises = Array.from(selectedPersonnelIds).map(async (sicilNo) => {
        const p = activePersonnel.find(x => x.sicil_no === sicilNo)
        if (!p) return

        const existingLeave = leaves[sicilNo]
        
        if (bulkActionType === "İptal") {
          // Remove leave
          if (existingLeave) {
            await api.remove('personnel_leaves', { id: existingLeave.id })
          }
        } else {
          const endDate = new Date(selectedDate)
          endDate.setDate(endDate.getDate() + (leaveDays - 1))
          const bitisStr = endDate.toISOString().split('T')[0]

          // Add or update leave
          if (existingLeave) {
            await api.update('personnel_leaves', {
              izin_turu: bulkActionType,
              bitis_tarihi: bitisStr,
              aciklama: bulkActionNote || `${bulkActionType} eklendi.`
            }, { id: existingLeave.id })
          } else {
            await api.insert('personnel_leaves', {
              sicil_no: sicilNo,
              izin_turu: bulkActionType,
              baslangic_tarihi: selectedDate,
              bitis_tarihi: bitisStr,
              aciklama: bulkActionNote || `${bulkActionType} eklendi.`,
              durum: 'Onaylandı'
            })
          }
        }
      })

      await Promise.all(promises)
      alert("İşlemler başarıyla kaydedildi.")
      if (onLeaveUpdated) {
        onLeaveUpdated()
      }
      
      // Refresh
      setSelectedPersonnelIds(new Set())
      setBulkActionType("")
      setBulkActionNote("")
      
      // Trigger a re-render of leaves
      const { data: leavesData } = await api.from('personnel_leaves')
        .select('*')
        .lte('baslangic_tarihi', selectedDate)
        .gte('bitis_tarihi', selectedDate)

      const leaveMap: Record<string, any> = {}
      if (leavesData) {
        leavesData.forEach((l: any) => {
          leaveMap[l.sicil_no] = l
        })
      }
      setLeaves(leaveMap)

    } catch (err) {
      console.error(err)
      alert("Kayıt sırasında bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--fd-surface2)] p-4 rounded-xl border border-[var(--fd-border)]">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--fd-text)]">
            <Calendar className="text-[var(--fd-accent)] w-5 h-5" />
            İleri Tarihli Vardiya Takvimi
          </h3>
          <p className="text-sm text-[var(--fd-text3)] mt-1">İleri bir tarih seçerek o günkü nöbetçi postayı görün ve önceden izin/rapor girebilirsiniz.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto font-mono"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-[var(--fd-border)] shadow-sm">
            <CardContent className="p-4 space-y-4">
              <h4 className="font-bold border-b border-[var(--fd-border)] pb-2 text-[var(--fd-text2)] text-sm flex items-center justify-between">
                Toplu İşlem Menüsü
                {!canEdit && <span title="Sadece Yöneticiler Düzenleyebilir"><Lock className="w-3.5 h-3.5 text-[var(--fd-text3)]" /></span>}
              </h4>
              <div className="space-y-3">
                <div className="text-xs text-[var(--fd-text3)]">
                  Seçili Personel: <strong className="text-[var(--fd-text)]">{selectedPersonnelIds.size}</strong>
                </div>
                
                <select 
                  value={bulkActionType} 
                  onChange={(e) => setBulkActionType(e.target.value)}
                  disabled={!canEdit}
                  className="w-full text-sm h-10 px-3 rounded-md border border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)] outline-none focus:ring-1 focus:ring-[var(--fd-accent)] disabled:opacity-50"
                >
                  <option value="" disabled>İzin Türü Seçin</option>
                  {LEAVE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="İptal" className="text-rose-500 font-bold">❌ İzni İptal Et (Hazır)</option>
                </select>

                <div className="flex gap-2">
                  <Input 
                    type="number"
                    min="1"
                    placeholder="Gün"
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(parseInt(e.target.value) || 1)}
                    className="w-20 text-sm"
                    disabled={bulkActionType === "İptal" || !canEdit}
                    title="İzin Gün Sayısı"
                  />
                  <Input 
                    placeholder="Açıklama (Opsiyonel)" 
                    value={bulkActionNote}
                    onChange={(e) => setBulkActionNote(e.target.value)}
                    className="flex-1 text-sm"
                    disabled={bulkActionType === "İptal" || !canEdit}
                  />
                </div>

                <Button 
                  className="w-full text-sm" 
                  disabled={selectedPersonnelIds.size === 0 || !bulkActionType || saving || !canEdit}
                  onClick={handleBulkAction}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Uygula
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-[var(--fd-border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--fd-surface2)]/50 text-[var(--fd-text3)] text-xs uppercase font-mono">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input 
                        type="checkbox"
                        disabled={!canEdit}
                        className="w-4 h-4 cursor-pointer accent-[var(--fd-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                        checked={selectedPersonnelIds.size === activePersonnel.length && activePersonnel.length > 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.checked) setSelectedPersonnelIds(new Set(activePersonnel.map(p => p.sicil_no)))
                          else setSelectedPersonnelIds(new Set())
                        }}
                      />
                    </th>
                    <th className="px-4 py-3">Ad Soyad</th>
                    <th className="px-4 py-3">İstasyon</th>
                    <th className="px-4 py-3">Posta</th>
                    <th className="px-4 py-3">Durum ({selectedDate})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fd-border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--fd-text3)]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--fd-accent)]" />
                        Veriler yükleniyor...
                      </td>
                    </tr>
                  ) : activePersonnel.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--fd-text3)] italic">
                        Bu tarihte nöbetçi personel bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    activePersonnel.map(person => {
                      const hasLeave = !!leaves[person.sicil_no];
                      const leaveData = leaves[person.sicil_no];
                      const isSelected = selectedPersonnelIds.has(person.sicil_no);

                      return (
                        <tr key={person.sicil_no} className={`hover:bg-[var(--fd-surface2)]/30 transition-colors ${isSelected ? 'bg-[var(--fd-accent)]/5' : ''}`}>
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox"
                              disabled={!canEdit}
                              className="w-4 h-4 cursor-pointer accent-[var(--fd-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                              checked={isSelected}
                              onChange={() => togglePersonnelSelection(person.sicil_no)}
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--fd-text)]">
                            {person.ad} {person.soyad}
                            <div className="text-[10px] text-[var(--fd-text3)] font-mono font-normal">{person.unvan}</div>
                          </td>
                          <td className="px-4 py-3 text-[var(--fd-text2)]">{person.istasyon || 'Merkez İtfaiye Müdürlüğü'}</td>
                          <td className="px-4 py-3 font-mono text-center">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--fd-surface3)] text-xs">{person.posta_no}</span>
                          </td>
                          <td className="px-4 py-3">
                            {hasLeave ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded w-fit">
                                  <AlertTriangle className="w-3 h-3" /> {leaveData.izin_turu}
                                </span>
                                {leaveData.aciklama && (
                                  <span className="text-[10px] text-[var(--fd-text3)] mt-1 ml-1 truncate max-w-[200px]">
                                    {leaveData.aciklama}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded w-fit">
                                Hazır
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
