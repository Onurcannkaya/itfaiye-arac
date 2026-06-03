"use client"

import { useMemo } from 'react'
import { FileText, Table as TableIcon, Building2, MapPin } from 'lucide-react'
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { exportShiftListToPDF, exportShiftListToExcel } from "@/lib/exportUtils"
import { Personnel } from "@/types"

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

  // Group personnel by station, then sort each group
  const groupedStations = useMemo(() => {
    return STATION_GROUPS.map(station => ({
      ...station,
      personnel: sortByHierarchy(personnel.filter(p => station.match(p.istasyon))),
    })).filter(g => g.personnel.length > 0)
  }, [personnel])

  const handleExportPDF = () => {
    if (!personnel || personnel.length === 0) {
      alert("Kayıtlı aktif nöbetçi posta listesi bulunamadı");
      return;
    }
    exportShiftListToPDF(personnel, activePosta);
  };

  const handleExportExcel = () => {
    if (!personnel || personnel.length === 0) {
      alert("Kayıtlı aktif nöbetçi posta listesi bulunamadı");
      return;
    }
    exportShiftListToExcel(personnel, activePosta);
  };

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
              <thead className="text-[10px] text-muted-foreground uppercase bg-slate-950/30">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Sicil No</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Ad Soyad</th>
                  <th className="px-4 py-2.5 min-w-[120px] whitespace-nowrap">Unvan</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Durum</th>
                </tr>
              </thead>
              <tbody>
                {station.personnel.map((p) => {
                  const isAbsent = p.durum === 'İzinli' || p.durum === 'Raporlu'
                  const isLeader = p.unvan?.toLowerCase().includes('başçavuş') || 
                                   p.unvan?.toLowerCase().includes('çavuş') || 
                                   p.rol === 'Admin' || p.rol === 'Editor'
                  return (
                    <tr
                      key={p.sicil_no}
                      className={`border-b border-border/30 last:border-0 transition-colors ${
                        isAbsent
                          ? 'bg-danger/5 hover:bg-danger/10 text-muted-foreground'
                          : isLeader
                            ? 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                            : 'hover:bg-muted/20'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium whitespace-nowrap text-slate-400">{p.sicil_no}</td>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        <span className={isLeader ? 'text-slate-100 font-bold' : 'text-slate-300'}>
                          {p.ad} {p.soyad}
                        </span>
                        {isLeader && (
                          <Badge variant="default" className="ml-2 scale-[0.85] text-[9px] px-1.5 py-0">{p.unvan}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{p.unvan}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {isAbsent ? (
                          <Badge variant="danger" className="scale-90 text-[10px]">{p.durum}</Badge>
                        ) : (
                          <Badge variant="success" className="scale-90 bg-success/20 text-success border-success/30 text-[10px]">{p.durum || 'Görevde'}</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {personnel.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm bg-slate-950/20 rounded-xl border border-slate-800/50">
          Bu postada personel bulunmuyor.
        </div>
      )}
    </div>
  )
}
