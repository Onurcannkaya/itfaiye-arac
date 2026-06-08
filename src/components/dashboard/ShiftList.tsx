"use client"

import { useState, useEffect, useMemo } from 'react'
import { FileText, Table as TableIcon, Building2, MapPin, Loader2 } from 'lucide-react'
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { exportShiftListToPDF, exportShiftListToExcel } from "@/lib/exportUtils"
import { Personnel } from "@/types"
import { useAuthStore } from "@/lib/authStore"
import { api } from "@/lib/api"

// ─── Hiyerarşik Rütbe Sıralaması ───────────────────────────
function getUnvanPriority(unvan: string): number {
  const u = (unvan || '').toLowerCase().replace(/\./g, '');
  if (u.includes('müdür')) return 0;
  if (u.includes('amir')) return 1;
  if (u.includes('başçavuş') || u.includes('baş çvş') || u === 'başçvş') return 2;
  if (u.includes('eğitim çavuşu')) return 3;
  if (u.includes('çavuş') || u.includes('çvş')) return 3;
  if (u.includes('santral')) return 4;
  if (u.includes('baş şoför') || u.includes('başşoför') || u.includes('posbaş şof') || u.includes('posbaş şoför') || u.includes('post baş şoför')) return 5;
  if (u.includes('şoför') || u.includes('şof')) return 6;
  if (u.includes('er') || u.includes('itfaiye eri') || u.includes('İtfaiye eri')) return 7;
  return 8;
}

function sortByHierarchy(list: Personnel[]): Personnel[] {
  return [...list].sort((a, b) => {
    // Raporlu, İzinli veya Dış Görev olanları listenin en altına grupla
    const durumA = (a.durum || '').toLowerCase();
    const durumB = (b.durum || '').toLowerCase();
    const isAbsentA = durumA.includes('izinli') || durumA.includes('raporlu') || durumA.includes('dış görev');
    const isAbsentB = durumB.includes('izinli') || durumB.includes('raporlu') || durumB.includes('dış görev');
    
    if (isAbsentA !== isAbsentB) {
      return isAbsentA ? 1 : -1;
    }

    const pa = getUnvanPriority(a.unvan);
    const pb = getUnvanPriority(b.unvan);
    if (pa !== pb) return pa - pb;
    return (a.ad || '').localeCompare(b.ad || '', 'tr');
  });
}

// ─── Station grouping config ──────────────────────────────
interface StationGroup {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  borderColor: string
  bgColor: string
  match: (istasyon?: string) => boolean
}

const STATION_GROUPS: StationGroup[] = [
  {
    key: 'merkez',
    label: 'Merkez İtfaiye Müdürlüğü',
    icon: <Building2 className="w-4 h-4" />,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/5',
    match: (ist) => !ist || ist.includes('Merkez'),
  },
  {
    key: 'esentepe',
    label: 'Esentepe Şubesi',
    icon: <MapPin className="w-4 h-4" />,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/5',
    match: (ist) => !!ist && ist.includes('Esentepe'),
  },
  {
    key: 'organize',
    label: 'Organize Sanayi Bölgesi Şubesi',
    icon: <MapPin className="w-4 h-4" />,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5',
    match: (ist) => !!ist && (ist.includes('Organize') || ist.includes('OSB')),
  },
]

export function ShiftList({ personnel, activePosta }: { personnel: Personnel[], activePosta: number }) {
  const { user } = useAuthStore()
  const [list, setList] = useState<Personnel[]>(personnel)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [explanations, setExplanations] = useState<Record<string, string>>({})

  useEffect(() => {
    setList(personnel)
  }, [personnel])

  useEffect(() => {
    const newExps: Record<string, string> = {};
    list.forEach(p => {
      const parts = (p.durum || '').split(' - ');
      newExps[p.sicil_no] = parts.slice(1).join(' - ');
    });
    setExplanations(newExps);
  }, [list])

  const isAuthorized = user && (
    user.rol === 'Admin' || 
    (user.unvan || '').toLowerCase().includes('amir') || 
    (user.unvan || '').toLowerCase().includes('çavuş')
  )

  // Durum açıklamasına göre personelin geçici görev yaptığı aktif istasyonu bulur
  const getActiveIstasyon = (p: Personnel): string => {
    if (p.durum && p.durum.startsWith('Geçici Şube Görevi')) {
      const parts = p.durum.split(' - ');
      if (parts.length > 1) {
        const branchName = parts[1].toLowerCase();
        if (branchName.includes('esentepe')) {
          return 'Esentepe Şubesi';
        }
        if (branchName.includes('organize') || branchName.includes('osb')) {
          return 'Organize Sanayi Bölgesi Şubesi';
        }
        if (branchName.includes('merkez')) {
          return 'Merkez İtfaiye Müdürlüğü';
        }
      }
    }
    return p.istasyon || '';
  };

  // Group personnel by station, then sort each group
  const groupedStations = useMemo(() => {
    return STATION_GROUPS.map(station => ({
      ...station,
      personnel: sortByHierarchy(list.filter(p => station.match(getActiveIstasyon(p)))),
    })).filter(g => g.personnel.length > 0)
  }, [list])

  const handleExportPDF = () => {
    if (!list || list.length === 0) {
      alert("Kayıtlı aktif nöbetçi posta listesi bulunamadı");
      return;
    }
    exportShiftListToPDF(list, activePosta);
  };

  const handleExportExcel = () => {
    if (!list || list.length === 0) {
      alert("Kayıtlı aktif nöbetçi posta listesi bulunamadı");
      return;
    }
    exportShiftListToExcel(list, activePosta);
  };

  const logPersonnelMovement = async (sicilNo: string, statusBase: string, explanation: string) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    
    // 1. Log in personnel_leaves if the status is leave or sick
    if (statusBase === 'İzinli' || statusBase === 'Raporlu') {
      try {
        const { data: existingLeaves } = await api.from('personnel_leaves')
          .select('id')
          .eq('sicil_no', sicilNo)
          .eq('baslangic_tarihi', todayStr)
          .eq('izin_turu', statusBase);

        if (!existingLeaves || existingLeaves.length === 0) {
          await api.insert('personnel_leaves', {
            sicil_no: sicilNo,
            izin_turu: statusBase,
            baslangic_tarihi: todayStr,
            bitis_tarihi: todayStr,
            aciklama: explanation || `${statusBase} durumu seçildi.`,
            durum: 'Onaylandı'
          });
        } else {
          await api.update('personnel_leaves', {
            aciklama: explanation || `${statusBase} durumu seçildi.`
          }, { id: existingLeaves[0].id });
        }
      } catch (e) {
        console.error("Failed to log leave movement:", e);
      }
    }

    // 2. Chronological movement log in personnel_records (Hizmet Dökümü)
    try {
      let logMessage = '';
      if (statusBase === 'Hazır') {
        logMessage = 'Günlük nöbet durumu "Hazır" olarak güncellendi.';
      } else if (statusBase === 'Geçici Şube Görevi') {
        logMessage = `Geçici şube görevi atandı. Şube: ${explanation || 'Belirtilmemiş'}`;
      } else {
        logMessage = `Günlük durumu "${statusBase}" olarak değiştirildi. Açıklama: ${explanation || 'Belirtilmemiş'}`;
      }

      await api.insert('personnel_records', {
        sicil_no: sicilNo,
        kayit_turu: 'Nöbet Hareketi',
        tarih: todayStr,
        aciklama: logMessage
      });
    } catch (e) {
      console.error("Failed to log personnel record movement:", e);
    }
  };

  const handleStatusChange = async (sicilNo: string, newStatusBase: string, customExp?: string) => {
    setUpdatingId(sicilNo)
    try {
      const currentExp = customExp !== undefined ? customExp : (explanations[sicilNo] || '');
      let finalStatus = newStatusBase;
      if (newStatusBase !== 'Hazır' && currentExp.trim()) {
        finalStatus = `${newStatusBase} - ${currentExp.trim()}`;
      }

      setList(prev => prev.map(p => p.sicil_no === sicilNo ? { ...p, durum: finalStatus } : p))
      await api.update('personnel', { durum: finalStatus }, { sicil_no: sicilNo })
      
      await logPersonnelMovement(sicilNo, newStatusBase, currentExp.trim());
    } catch (err) {
      console.error("Status update error:", err)
      alert("Durum güncellenemedi.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
          <FileText className="w-4 h-4 text-red-500" />
          PDF İndir
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
          <TableIcon className="w-4 h-4 text-green-600" />
          Excel İndir
        </Button>
      </div>

      {/* Station Panels */}
      {groupedStations.map((station) => (
        <div
          key={station.key}
          className={`rounded-xl border ${station.borderColor} ${station.bgColor} overflow-hidden`}
        >
          {/* Station Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${station.borderColor}`}>
            <div className="flex items-center gap-2.5">
              <div className={station.color}>{station.icon}</div>
              <h3 className={`text-sm font-bold ${station.color}`}>{station.label}</h3>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-950/40 text-slate-300 border-slate-800">
              {station.personnel.length} Personel
            </Badge>
          </div>

          {/* Station Personnel Table */}
          <div className="w-full max-w-full overflow-x-auto -webkit-overflow-scrolling-touch box-border">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-950/30">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Sicil No</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Ad Soyad</th>
                  <th className="px-4 py-2.5 min-w-[120px] whitespace-nowrap">Unvan</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Durum</th>
                </tr>
              </thead>
              <tbody>
                {station.personnel.map((p) => {
                  const durumLower = (p.durum || '').toLowerCase()
                  const isAbsent = durumLower.includes('izinli') || durumLower.includes('raporlu') || durumLower.includes('dış görev')
                  const isLeader = p.unvan?.toLowerCase().includes('başçavuş') || 
                                   p.unvan?.toLowerCase().includes('çavuş') || 
                                   p.rol === 'Admin' || p.rol === 'Editor'
                  const isCellUpdating = updatingId === p.sicil_no

                  return (
                    <tr
                      key={p.sicil_no}
                      className={`border-b border-border/30 last:border-0 transition-all duration-250 ${
                        isAbsent
                          ? 'opacity-[0.40] text-slate-500 bg-slate-950/40 saturate-[0.2] hover:opacity-[0.55] hover:bg-slate-950/50'
                          : isLeader
                            ? 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                            : 'hover:bg-muted/20'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium whitespace-nowrap text-slate-400">{p.sicil_no}</td>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        <span className={
                          isAbsent 
                            ? 'text-slate-500 line-through font-normal' 
                            : isLeader 
                              ? 'text-slate-100 font-bold' 
                              : 'text-slate-300'
                        }>
                          {p.ad} {p.soyad}
                        </span>
                        {isLeader && (
                          <Badge variant="default" className="ml-2 scale-[0.85] text-[9px] px-1.5 py-0">{p.unvan}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{p.unvan}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isAuthorized ? (
                            (() => {
                              const parts = (p.durum || '').split(' - ');
                              const statusBase = parts[0] || 'Hazır';
                              
                              const selectValue = statusBase === 'Geçici Şube Görevi'
                                ? 'Geçici Şube Görevi'
                                : statusBase === 'İzinli'
                                  ? 'İzinli'
                                  : statusBase === 'Raporlu'
                                    ? 'Raporlu'
                                    : statusBase === 'Dış Görev' || statusBase.startsWith('Dış Görev')
                                      ? 'Dış Görev (Stadyum/Etkinlik)'
                                      : 'Hazır';

                              const getSelectClass = (status: string) => {
                                const base = "rounded bg-slate-900 border text-xs focus:ring-1 focus:outline-none p-1.5 font-semibold transition-colors";
                                if (status === 'Hazır' || !status) {
                                  return `${base} border-emerald-500/30 text-emerald-400 focus:ring-emerald-500 bg-emerald-500/5`;
                                }
                                if (status.startsWith('Geçici Şube Görevi')) {
                                  return `${base} border-cyan-500/30 text-cyan-400 focus:ring-cyan-500 bg-cyan-500/5`;
                                }
                                return `${base} border-slate-700 text-slate-400 focus:ring-slate-600 bg-slate-950/40`;
                              };

                              return (
                                <>
                                  <select
                                    value={selectValue}
                                    disabled={isCellUpdating}
                                    onChange={(e) => handleStatusChange(p.sicil_no, e.target.value)}
                                    className={getSelectClass(selectValue)}
                                  >
                                    <option value="Hazır" className="bg-slate-950 text-emerald-400">Hazır</option>
                                    <option value="Geçici Şube Görevi" className="bg-slate-950 text-cyan-400">Geçici Şube Görevi</option>
                                    <option value="İzinli" className="bg-slate-950 text-amber-500">İzinli</option>
                                    <option value="Raporlu" className="bg-slate-950 text-rose-500">Raporlu</option>
                                    <option value="Dış Görev (Stadyum/Etkinlik)" className="bg-slate-950 text-blue-400">Dış Görev (Stadyum/Etkinlik)</option>
                                  </select>

                                  {statusBase !== 'Hazır' && (
                                    <input
                                      type="text"
                                      value={explanations[p.sicil_no] ?? ''}
                                      disabled={isCellUpdating}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setExplanations(prev => ({ ...prev, [p.sicil_no]: val }));
                                      }}
                                      onBlur={() => handleStatusChange(p.sicil_no, statusBase, explanations[p.sicil_no])}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                      placeholder={statusBase === 'Geçici Şube Görevi' ? 'Şube adı (Örn: Esentepe)...' : 'Açıklama giriniz...'}
                                      className={`px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 w-48 font-medium transition-colors ${
                                        statusBase === 'Geçici Şube Görevi'
                                          ? 'border-cyan-500/20 text-cyan-200 bg-slate-950 focus:border-cyan-500 focus:ring-cyan-500'
                                          : 'border-slate-700 text-slate-300 bg-slate-950 focus:border-slate-500 focus:ring-slate-500'
                                      }`}
                                    />
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            isAbsent ? (
                              <Badge variant="danger" className="scale-90 text-[10px]">{p.durum}</Badge>
                            ) : (
                              <Badge variant="success" className="scale-90 bg-success/20 text-success border-success/30 text-[10px]">{p.durum || 'Hazır'}</Badge>
                            )
                          )}
                          {isCellUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm bg-slate-950/20 rounded-xl border border-slate-800/50">
          Bu postada personel bulunmuyor.
        </div>
      )}
    </div>
  )
}
