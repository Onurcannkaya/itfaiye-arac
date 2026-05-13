"use client"

import { Download, FileText, Table as TableIcon } from 'lucide-react'
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { exportShiftListToPDF, exportShiftListToExcel } from "@/lib/exportUtils"
import { Personnel } from "@/types"

export function ShiftList({ personnel, activePosta }: { personnel: Personnel[], activePosta: number }) {
  
  function rolLabel(rol: string, unvan?: string): string {
    if (unvan) return unvan
    switch (rol) {
      case 'Admin': return 'Yönetici'
      case 'Editor': return 'Amir'
      case 'Shift_Leader': return 'Vardiya Çavuşu'
      default: return 'İtfaiye Eri'
    }
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => exportShiftListToPDF(personnel, activePosta)} className="gap-2">
          <FileText className="w-4 h-4 text-red-500" />
          PDF İndir
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportShiftListToExcel(personnel, activePosta)} className="gap-2">
          <TableIcon className="w-4 h-4 text-green-600" />
          Excel İndir
        </Button>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
            <tr>
              <th className="px-4 py-3 rounded-tl-md">Sicil No</th>
              <th className="px-4 py-3">Ad Soyad</th>
              <th className="px-4 py-3 min-w-[120px]">Unvan</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 rounded-tr-md text-right min-w-[100px]">Rol</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map((p) => {
              const isAbsent = p.durum === 'İzinli' || p.durum === 'Raporlu'
              return (
                <tr key={p.sicil_no} className={`border-b border-border/50 last:border-0 transition-colors ${isAbsent ? 'bg-danger/5 hover:bg-danger/10 text-muted-foreground' : 'hover:bg-muted/30'}`}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{p.sicil_no}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {p.ad} {p.soyad}
                    {(p.rol === 'Shift_Leader' || p.rol === 'Admin') && <Badge variant="default" className="ml-2 scale-90">{p.unvan}</Badge>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.unvan}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isAbsent ? (
                      <Badge variant="danger" className="scale-90">{p.durum}</Badge>
                    ) : (
                      <Badge variant="success" className="scale-90 bg-success/20 text-success border-success/30">{p.durum || 'Görevde'}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{rolLabel(p.rol)}</td>
                </tr>
              )
            })}
            {personnel.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Bu postada personel bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
