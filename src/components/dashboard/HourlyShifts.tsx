"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/authStore"
import { Personnel } from "@/types"
import { Loader2, ShieldCheck, Clock, MapPin, Building, ShieldAlert, Shield, Printer } from "lucide-react"

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
            if (!newMatrix["TÜM GÜN"]) {
              newMatrix["TÜM GÜN"] = {}
            }
            newMatrix["TÜM GÜN"][gorev] = {
              id: row.id,
              sicil: row.personel_sicil
            }
          } else {
            // Geriye dönük uyumluluk: eski saatlik kule veya santral kayıtları varsa tüm güne eşle
            if (gorev === "SANTRAL" || gorev === "112" || gorev.startsWith("SANTRAL_") || gorev.startsWith("112_")) {
              if (!newMatrix["TÜM GÜN"]) {
                newMatrix["TÜM GÜN"] = {}
              }
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
      setSavingCell(null)
    }
  }

  const handlePrint = () => {
    const formatPersonnel = (sicil: string) => {
      if (!sicil) return "-";
      const p = personnel.find(per => per.sicil_no === sicil);
      return p ? `${p.ad} ${p.soyad} (${p.unvan || 'Er'})` : sicil;
    };

    const tarih = new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const santralNames = santralKeys.map(key => formatPersonnel(matrix["TÜM GÜN"]?.[key]?.sicil || "")).join("<br/>");
    const representativeNames = representativeKeys.map(key => formatPersonnel(matrix["TÜM GÜN"]?.[key]?.sicil || "")).join("<br/>");

    const hoursRows = HOURS.map(hour => {
      const nizamiye = formatPersonnel(matrix[hour]?.["NIZAMIYE"]?.sicil || "");
      return `
        <tr>
          <td style="padding:10px;border:1px solid #000;font-family:monospace;font-size:14px;text-align:center;font-weight:bold;">${hour}</td>
          <td style="padding:10px;border:1px solid #000;font-size:14px;text-align:center;font-weight:bold;">${nizamiye}</td>
        </tr>
      `;
    }).join("");

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Saatlik Karargah Nöbet Çizelgesi - ${tarih}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', 'Noto Serif', serif;
      color: #000;
      padding: 10px;
      line-height: 1.4;
    }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
    .header h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
    .header h2 { font-size: 13pt; font-weight: bold; margin-bottom: 5px; }
    .header h3 { font-size: 12pt; font-weight: bold; letter-spacing: 1px; }
    
    .meta-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
    .meta-table td { padding: 5px; font-size: 11pt; }
    .meta-table td.right { text-align: right; }
    
    .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px; }
    
    .duty-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .duty-table th { background: #f0f0f0; padding: 8px; border: 1px solid #000; font-size: 11pt; font-weight: bold; text-align: center; }
    .duty-table td { padding: 8px; border: 1px solid #000; font-size: 11pt; vertical-align: middle; }
    
    .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 180px; font-size: 11pt; }
    .signature-box .title { margin-bottom: 50px; font-weight: bold; }
    
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:20px;">
    <button onclick="window.print()" style="padding:12px 32px;font-size:14px;font-weight:700;background:#1e40af;color:white;border:none;border-radius:8px;cursor:pointer;box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🖨️ Yazdır / PDF Olarak Kaydet</button>
  </div>

  <div class="header">
    <h1>T.C. SİVAS BELEDİYESİ</h1>
    <h2>İtfaiye Müdürlüğü</h2>
    <h3>SAATLİK KARARGAH NÖBET ÇİZELGESİ</h3>
  </div>

  <table class="meta-table">
    <tr>
      <td><strong>Posta:</strong> ${activePosta}. Posta</td>
      <td class="right"><strong>Nöbet Tarihi:</strong> ${tarih}</td>
    </tr>
  </table>

  <div class="section-title">24 Saatlik Sabit Karargah Görevleri</div>
  <table class="duty-table">
    <thead>
      <tr>
        <th style="width: 50%;">Nöbetçi Santral Operatörleri</th>
        <th style="width: 50%;">Nöbetçi 112 Temsilcileri</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; font-weight: bold; line-height: 1.6;">${santralNames || "-"}</td>
        <td style="padding: 12px; font-weight: bold; line-height: 1.6;">${representativeNames || "-"}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">2 Saatlik Saatlik Karargah Nöbet Döngüsü</div>
  <table class="duty-table">
    <thead>
      <tr>
        <th style="width: 30%;">Saat Aralığı</th>
        <th style="width: 70%;">Nizamiye Nöbetçisi</th>
      </tr>
    </thead>
    <tbody>
      ${hoursRows}
    </tbody>
  </table>

  <div class="signature-section">
    <div class="signature-box">
      <div class="title">Nöbetçi Amiri</div>
      <div>İmza</div>
    </div>
    <div class="signature-box">
      <div class="title">Grup Amiri</div>
      <div>İmza</div>
    </div>
    <div class="signature-box">
      <div class="title">İtfaiye Müdürü</div>
      <div>İmza</div>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      alert("Popup engelleyiciyi devre dışı bırakın.");
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Get dynamic keys sorted logically
  const santralKeys = useMemo(() => {
    const keys = Object.keys(matrix["TÜM GÜN"] || {}).filter(k => k === "SANTRAL" || k.startsWith("SANTRAL_"))
    if (!keys.includes("SANTRAL")) {
      keys.push("SANTRAL")
    }
    return keys.sort((a, b) => {
      if (a === "SANTRAL") return -1
      if (b === "SANTRAL") return 1
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [matrix])

  const representativeKeys = useMemo(() => {
    const keys = Object.keys(matrix["TÜM GÜN"] || {}).filter(k => k === "112" || k.startsWith("112_"))
    if (!keys.includes("112")) {
      keys.push("112")
    }
    return keys.sort((a, b) => {
      if (a === "112") return -1
      if (b === "112") return 1
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [matrix])

  const handleAddSantralSlot = () => {
    let nextIndex = 2
    while (matrix["TÜM GÜN"]?.[`SANTRAL_${nextIndex}`]) {
      nextIndex++
    }
    const newKey = `SANTRAL_${nextIndex}`
    setMatrix(prev => ({
      ...prev,
      "TÜM GÜN": {
        ...prev["TÜM GÜN"],
        [newKey]: { sicil: "" }
      }
    }))
  }

  const handleAdd112Slot = () => {
    let nextIndex = 2
    while (matrix["TÜM GÜN"]?.[`112_${nextIndex}`]) {
      nextIndex++
    }
    const newKey = `112_${nextIndex}`
    setMatrix(prev => ({
      ...prev,
      "TÜM GÜN": {
        ...prev["TÜM GÜN"],
        [newKey]: { sicil: "" }
      }
    }))
  }

  const handleDeleteSlot = async (place: string) => {
    const cellKey = `TÜM GÜN-${place}`
    setSavingCell(cellKey)
    try {
      const currentCell = matrix["TÜM GÜN"]?.[place]
      if (currentCell && currentCell.id) {
        await api.remove("hourly_shifts", { id: currentCell.id })
      }
      
      setMatrix(prev => {
        const copy = { ...prev }
        if (copy["TÜM GÜN"]) {
          const newWholeDay = { ...copy["TÜM GÜN"] }
          delete newWholeDay[place]
          copy["TÜM GÜN"] = newWholeDay
        }
        return copy
      })
    } catch (err) {
      console.error("Delete slot error:", err)
      alert("Nöbetçi silinemedi.")
    } finally {
      setSavingCell(null)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/5 bg-slate-950/45 text-xs light:bg-slate-100 light:border-slate-200 light:text-slate-900">
        <div className="flex items-center gap-2 text-slate-300 light:text-slate-800">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Saatlik Karargah Çizelgesi bugün için geçerlidir: <strong className="text-white light:text-slate-950">{new Date().toLocaleDateString("tr-TR")}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors font-bold cursor-pointer text-xs shrink-0"
          >
            <Printer className="w-3.5 h-3.5 animate-pulse" /> Yazdır / PDF İndir
          </button>
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
        {/* Santral Nöbetçileri */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nöbetçi Santral Operatörleri (24 Saat Nöbet Boyunca)</span>
          </label>
          
          <div className="space-y-2">
            {santralKeys.map((key, index) => {
              const currentVal = matrix["TÜM GÜN"]?.[key]?.sicil || ""
              const isSaving = savingCell === `TÜM GÜN-${key}`
              const isExtra = key !== "SANTRAL"

              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    {isAuthorized ? (
                      <select
                        value={currentVal}
                        disabled={isSaving}
                        onChange={(e) => handleCellChange("TÜM GÜN", key, e.target.value)}
                        className="w-full h-11 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-semibold"
                      >
                        <option value="">{index === 0 ? "Santral Görevlisi Seçiniz" : `Ekstra Santral Görevlisi #${index}`}</option>
                        {personnel.map(p => (
                          <option key={p.sicil_no} value={p.sicil_no}>
                            {p.ad} {p.soyad} ({p.unvan || 'Er'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="h-11 flex items-center px-4 rounded-lg border border-dashed border-white/5 bg-slate-950/40 text-xs font-semibold text-slate-400">
                        {currentVal ? (
                          (() => {
                            const p = personnel.find(per => per.sicil_no === currentVal)
                            return p ? `${p.ad} ${p.soyad} (${p.unvan})` : currentVal
                          })()
                        ) : (
                          "Atama Yok"
                        )}
                      </div>
                    )}
                    {isSaving && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      </div>
                    )}
                  </div>
                  {isAuthorized && isExtra && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(key)}
                      disabled={isSaving}
                      className="h-11 px-3 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer shrink-0 text-xs font-bold"
                      title="Nöbetçiyi Sil"
                    >
                      Sil
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {isAuthorized && (
            <button
              type="button"
              onClick={handleAddSantralSlot}
              className="w-full py-2 px-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/5 text-xs font-bold transition-all cursor-pointer"
            >
              + Ekstra Santral Nöbetçisi Ekle
            </button>
          )}
        </div>

        {/* 112 Nöbetçileri */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-danger" />
            <span>Nöbetçi 112 Temsilcileri (24 Saat Nöbet Boyunca)</span>
          </label>
          
          <div className="space-y-2">
            {representativeKeys.map((key, index) => {
              const currentVal = matrix["TÜM GÜN"]?.[key]?.sicil || ""
              const isSaving = savingCell === `TÜM GÜN-${key}`
              const isExtra = key !== "112"

              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    {isAuthorized ? (
                      <select
                        value={currentVal}
                        disabled={isSaving}
                        onChange={(e) => handleCellChange("TÜM GÜN", key, e.target.value)}
                        className="w-full h-11 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-semibold"
                      >
                        <option value="">{index === 0 ? "112 Görevlisi Seçiniz" : `Ekstra 112 Görevlisi #${index}`}</option>
                        {personnel.map(p => (
                          <option key={p.sicil_no} value={p.sicil_no}>
                            {p.ad} {p.soyad} ({p.unvan || 'Er'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="h-11 flex items-center px-4 rounded-lg border border-dashed border-white/5 bg-slate-950/40 text-xs font-semibold text-slate-400">
                        {currentVal ? (
                          (() => {
                            const p = personnel.find(per => per.sicil_no === currentVal)
                            return p ? `${p.ad} ${p.soyad} (${p.unvan})` : currentVal
                          })()
                        ) : (
                          "Atama Yok"
                        )}
                      </div>
                    )}
                    {isSaving && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      </div>
                    )}
                  </div>
                  {isAuthorized && isExtra && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(key)}
                      disabled={isSaving}
                      className="h-11 px-3 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer shrink-0 text-xs font-bold"
                      title="Nöbetçiyi Sil"
                    >
                      Sil
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {isAuthorized && (
            <button
              type="button"
              onClick={handleAdd112Slot}
              className="w-full py-2 px-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-danger/30 text-danger hover:bg-danger/5 text-xs font-bold transition-all cursor-pointer"
            >
              + Ekstra 112 Temsilcisi Ekle
            </button>
          )}
        </div>
      </div>

      {/* Grid Matrix Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-950/20 light:bg-white light:border-slate-200/80 light:shadow-sm">
        <table className="w-full border-collapse text-sm text-left">
          <thead className="text-[10px] text-slate-400 uppercase bg-slate-950/60 border-b border-white/10 font-bold tracking-wider light:bg-slate-50 light:text-slate-600 light:border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center border-r border-white/5 w-[180px] light:border-slate-200">Saat Aralığı</th>
              <th className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                  <span className="light:text-slate-900">Nizamiye Nöbeti (2 Saatlik Döngü)</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 light:divide-slate-200">
            {HOURS.map((hour) => (
              <tr key={hour} className="hover:bg-white/[0.01] light:hover:bg-slate-50 transition-colors h-14">
                {/* Hour Cell */}
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-300 text-center bg-slate-950/20 border-r border-white/5 light:bg-slate-50/50 light:text-slate-700 light:border-slate-200">
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
                            className="w-full h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-medium light:bg-slate-100 light:border-slate-200 light:text-slate-900"
                          >
                            <option value="" className="light:bg-white light:text-slate-900">Nöbetçi Seçiniz</option>
                            {personnel.map(p => (
                              <option key={p.sicil_no} value={p.sicil_no} className="light:bg-white light:text-slate-900">
                                {p.ad} {p.soyad} ({p.unvan || 'Er'})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="h-10 flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-white/5 bg-slate-950/40 text-slate-400 light:bg-slate-50 light:border-slate-200 light:text-slate-650">
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
