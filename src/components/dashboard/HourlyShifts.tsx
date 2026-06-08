"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/authStore"
import { Personnel } from "@/types"
import { Loader2, ShieldCheck, Clock, MapPin, Building, ShieldAlert, Shield } from "lucide-react"

interface HourlyShiftsProps {
  personnel: Personnel[]
  activePosta: number
}

const HOURS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "18:00 - 20:00",
  "20:00 - 22:00",
  "22:00 - 00:00",
  "00:00 - 02:00",
  "02:00 - 04:00",
  "04:00 - 06:00",
  "06:00 - 08:00"
]

const PLACES = ["NIZAMIYE"]

export function HourlyShifts({ personnel, activePosta }: HourlyShiftsProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  
  // Matrix data state: { [hourRange]: { [place]: { id, sicil } } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, { id?: number; sicil: string }>>>({})

  const isAuthorized = user && (
    user.rol === 'Admin' || 
    (user.unvan || '').toLowerCase().includes('amir') || 
    (user.unvan || '').toLowerCase().includes('çavuş')
  )

  const todayStr = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD local format safely

  useEffect(() => {
    fetchShifts()
  }, [activePosta])

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const { data } = await api.from("hourly_shifts")
        .select("*")
        .eq("tarih", todayStr)
        .eq("posta", activePosta)

      const newMatrix: typeof matrix = {}
      HOURS.forEach(h => {
        newMatrix[h] = {}
        PLACES.forEach(p => {
          newMatrix[h][p] = { sicil: "" }
        })
      })

      // Sabit 24 saatlik görevleri başlat
      newMatrix["TÜM GÜN"] = {
        "SANTRAL": { sicil: "" },
        "112": { sicil: "" }
      }

      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          const gorev = row.gorev_yeri === "KULE" ? "112" : row.gorev_yeri
          
          if (row.saat_araligi === "TÜM GÜN") {
            if (newMatrix["TÜM GÜN"] && newMatrix["TÜM GÜN"][gorev]) {
              newMatrix["TÜM GÜN"][gorev] = {
                id: row.id,
                sicil: row.personel_sicil
              }
            }
          } else {
            // Geriye dönük uyumluluk: eski saatlik kule veya santral kayıtları varsa tüm güne eşle
            if (gorev === "SANTRAL" || gorev === "112") {
              newMatrix["TÜM GÜN"][gorev] = {
                id: row.id,
                sicil: row.personel_sicil
              }
            } else if (newMatrix[row.saat_araligi] && newMatrix[row.saat_araligi][gorev]) {
              newMatrix[row.saat_araligi][gorev] = {
                id: row.id,
                sicil: row.personel_sicil
              }
            }
          }
        })
      }

      setMatrix(newMatrix)
    } catch (err) {
      console.error("Hourly shifts fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCellChange = async (hour: string, place: string, newSicil: string) => {
    const cellKey = `${hour}-${place}`
    setSavingCell(cellKey)
    try {
      const currentCell = matrix[hour]?.[place]
      
      if (newSicil === "") {
        // If empty selected and record exists, delete it
        if (currentCell && currentCell.id) {
          await api.remove("hourly_shifts", { id: currentCell.id })
        }
        setMatrix(prev => ({
          ...prev,
          [hour]: {
            ...prev[hour],
            [place]: { sicil: "" }
          }
        }))
      } else {
        if (currentCell && currentCell.id) {
          // Update existing record
          await api.update("hourly_shifts", { personel_sicil: newSicil }, { id: currentCell.id })
          setMatrix(prev => ({
            ...prev,
            [hour]: {
              ...prev[hour],
              [place]: { ...prev[hour][place], sicil: newSicil }
            }
          }))
        } else {
          // Create new record
          const insertRes = await api.insert("hourly_shifts", {
            tarih: todayStr,
            posta: activePosta,
            saat_araligi: hour,
            gorev_yeri: place,
            personel_sicil: newSicil
          })
          
          const insertedRow = Array.isArray(insertRes.data) ? insertRes.data[0] : insertRes.data
          const newId = insertedRow?.id

          setMatrix(prev => ({
            ...prev,
            [hour]: {
              ...prev[hour],
              [place]: { id: newId, sicil: newSicil }
            }
          }))
        }
      }
    } catch (err) {
      console.error("Shift save error:", err)
      alert("Nöbet değişikliği kaydedilemedi.")
    } finally {
      setSavingCell(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        <span className="text-sm text-slate-400">Saatlik Nöbet Çizelgesi Yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Informational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/5 bg-slate-950/45 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Saatlik Karargah Çizelgesi bugün için geçerlidir: <strong>{new Date().toLocaleDateString("tr-TR")}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {isAuthorized ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Nöbet Düzenleme Yetkisi Var
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-500 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <ShieldAlert className="w-3.5 h-3.5" /> Sadece Görüntüleme Yetkisi
            </span>
          )}
        </div>
      </div>

      {/* 24 Saatlik Sabit Görevler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-white/10 bg-slate-950/40">
        {/* Santral Nöbetçisi */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nöbetçi Santral Operatörü (24 Saat Nöbet Boyunca)</span>
          </label>
          <div className="relative">
            {isAuthorized ? (
              <select
                value={matrix["TÜM GÜN"]?.["SANTRAL"]?.sicil || ""}
                disabled={savingCell === "TÜM GÜN-SANTRAL"}
                onChange={(e) => handleCellChange("TÜM GÜN", "SANTRAL", e.target.value)}
                className="w-full h-11 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-semibold"
              >
                <option value="">Santral Görevlisi Seçiniz</option>
                {personnel.map(p => (
                  <option key={p.sicil_no} value={p.sicil_no}>
                    {p.ad} {p.soyad} ({p.unvan || 'Er'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-11 flex items-center px-4 rounded-lg border border-dashed border-white/5 bg-slate-950/40 text-xs font-semibold text-slate-400">
                {matrix["TÜM GÜN"]?.["SANTRAL"]?.sicil ? (
                  (() => {
                    const p = personnel.find(per => per.sicil_no === matrix["TÜM GÜN"]?.["SANTRAL"]?.sicil)
                    return p ? `${p.ad} ${p.soyad} (${p.unvan})` : matrix["TÜM GÜN"]?.["SANTRAL"]?.sicil
                  })()
                ) : (
                  "Atama Yok"
                )}
              </div>
            )}
            {savingCell === "TÜM GÜN-SANTRAL" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              </div>
            )}
          </div>
        </div>

        {/* 112 Nöbetçisi */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-danger" />
            <span>Nöbetçi 112 Temsilcisi (24 Saat Nöbet Boyunca)</span>
          </label>
          <div className="relative">
            {isAuthorized ? (
              <select
                value={matrix["TÜM GÜN"]?.["112"]?.sicil || ""}
                disabled={savingCell === "TÜM GÜN-112"}
                onChange={(e) => handleCellChange("TÜM GÜN", "112", e.target.value)}
                className="w-full h-11 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-semibold"
              >
                <option value="">112 Görevlisi Seçiniz</option>
                {personnel.map(p => (
                  <option key={p.sicil_no} value={p.sicil_no}>
                    {p.ad} {p.soyad} ({p.unvan || 'Er'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-11 flex items-center px-4 rounded-lg border border-dashed border-white/5 bg-slate-950/40 text-xs font-semibold text-slate-400">
                {matrix["TÜM GÜN"]?.["112"]?.sicil ? (
                  (() => {
                    const p = personnel.find(per => per.sicil_no === matrix["TÜM GÜN"]?.["112"]?.sicil)
                    return p ? `${p.ad} ${p.soyad} (${p.unvan})` : matrix["TÜM GÜN"]?.["112"]?.sicil
                  })()
                ) : (
                  "Atama Yok"
                )}
              </div>
            )}
            {savingCell === "TÜM GÜN-112" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Matrix Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-950/20">
        <table className="w-full border-collapse text-sm text-left">
          <thead className="text-[10px] text-slate-400 uppercase bg-slate-950/60 border-b border-white/10 font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3 text-center border-r border-white/5 w-[180px]">Saat Aralığı</th>
              <th className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nizamiye Nöbeti (2 Saatlik Döngü)</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {HOURS.map((hour) => (
              <tr key={hour} className="hover:bg-white/[0.01] transition-colors h-14">
                {/* Hour Cell */}
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-300 text-center bg-slate-950/20 border-r border-white/5">
                  {hour}
                </td>
                
                {/* Place Cells */}
                {PLACES.map((place) => {
                  const cellKey = `${hour}-${place}`
                  const currentVal = matrix[hour]?.[place]?.sicil || ""
                  const isSaving = savingCell === cellKey

                  return (
                    <td key={place} className="px-4 py-2 text-center">
                      <div className="relative w-full max-w-[240px] mx-auto">
                        {isAuthorized ? (
                          <select
                            value={currentVal}
                            disabled={isSaving}
                            onChange={(e) => handleCellChange(hour, place, e.target.value)}
                            className="w-full h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-medium"
                          >
                            <option value="">Nöbetçi Seçiniz</option>
                            {personnel.map(p => (
                              <option key={p.sicil_no} value={p.sicil_no}>
                                {p.ad} {p.soyad} ({p.unvan || 'Er'})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="h-10 flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-white/5 bg-slate-950/40 text-slate-400">
                            {currentVal ? (
                              (() => {
                                const p = personnel.find(per => per.sicil_no === currentVal)
                                return p ? `${p.ad} ${p.soyad}` : currentVal
                              })()
                            ) : (
                              "Atama Yok"
                            )}
                          </div>
                        )}
                        {isSaving && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
