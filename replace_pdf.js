const fs = require('fs');

const replacement = `const handleExportZReportPDF = async (report: any) => {
    try {
      setZSubmitting(true)
      
      const dateStr = new Date(report.rapor_tarihi).toLocaleDateString("tr-TR")

      let shiftLogsData: any[] = []
      let rotasData: any[] = []
      try {
        const { data: shifts } = await api.from('personnel_shifts_log').select('*')
        shiftLogsData = (shifts || []).filter((s: any) => {
          const sDate = new Date(s.giris_tarihi).toISOString().split('T')[0]
          return sDate === report.rapor_tarihi
        })
        const { data: rotas } = await api.from('hourly_shifts').select('*').eq('tarih', report.rapor_tarihi)
        rotasData = rotas || []
      } catch (e) {
        console.error("PDF data fetch error:", e)
      }

      let incidentsData: any[] = []
      try {
        const { data: incs } = await api.from('incidents').select('*')
        incidentsData = (incs || []).filter((inc: any) => {
          const incDate = new Date(inc.created_at || inc.ihbar_saati || Date.now()).toISOString().split('T')[0]
          return incDate === report.rapor_tarihi
        })
      } catch (e) {
        console.error("PDF incidents fetch error:", e)
      }

      // Nöbetçi Posta Sorumlu Çavuşu Bul
      const bascavusShift = shiftLogsData.find((s: any) => {
        const p = personnelListForZ.find(p => p.sicil_no === s.sicil_no)
        return p && (p.unvan === 'Başçavuş' || p.unvan === 'Baş.Çvş.')
      })
      const bascavusName = bascavusShift ? bascavusShift.personel_ad_soyad : "Belirtilmemiş"

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert("Pop-up engelleyiciyi kapatın ve tekrar deneyin.")
        return
      }

      const todayStr = new Date().toLocaleDateString("tr-TR")
      
      let shiftListHtml = shiftLogsData.length === 0 
        ? '<div class="empty-state">Bu tarihte aktif nöbetçi kaydı bulunmuyor.</div>'
        : shiftLogsData.map((s: any) => {
            const time = new Date(s.giris_tarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
            return \`<div class="list-item">&bull; <strong>\${time}</strong> | \${s.personel_ad_soyad} (\${s.posta}. Posta)</div>\`
          }).join('')

      const nobetYerler = Array.from(new Set(rotasData.map((r: any) => r.yer_adi)))
      let rotasHtml = rotasData.length === 0
        ? '<div class="empty-state">Saatlik nöbet yeri rotasyonu bulunmuyor.</div>'
        : nobetYerler.map((yer: any) => {
            const items = rotasData.filter((r: any) => r.yer_adi === yer)
            const lines = items.map((r: any) => \`<div class="list-item" style="padding-left:10px;">\${r.saat_araligi}: \${r.personel_ad_soyad}</div>\`).join('')
            return \`<div style="margin-top:5px; font-weight:600;">- \${String(yer).toUpperCase()}:</div>\${lines}\`
          }).join('')

      const yTotal = report.yangin_sayisi?.total || 0
      const kTotal = report.kurtarma_sayisi?.total || 0
      
      const arizaliAraclarText = (!report.arizali_araclar || report.arizali_araclar.length === 0)
        ? '<div class="empty-state">Aktif arızalı/bakımda olan taktik araç bulunmamaktadır.</div>'
        : \`<strong>Araçlar:</strong> \${report.arizali_araclar.join(', ')}\`

      let incidentsHtml = incidentsData.length === 0
        ? '<div class="empty-state">Bu tarihte herhangi bir vukuat kaydı bulunmamaktadır.</div>'
        : incidentsData.slice(0,15).map((inc: any, idx: number) => {
            const time = new Date(inc.ihbar_saati || inc.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
            return \`<div class="list-item">\${idx + 1}) [\${time}] \${inc.olay_turu || 'Belirsiz'} - \${inc.mahalle || ''} Mah.</div>\`
          }).join('')

      printWindow.document.write(\`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Z Raporu - \${dateStr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { margin: 10mm; size: A4 portrait; }
    body { font-family: 'Inter', sans-serif; color: #111; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-border { border: 2px solid #222; padding: 15px; min-height: 270mm; position: relative; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 3px double #222; padding-bottom: 10px; }
    .header img { height: 75px; width: auto; object-fit: contain; }
    .header-text { text-align: center; flex-grow: 1; }
    .header-text h1 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: 0.5px; }
    .header-text h2 { margin: 4px 0 0 0; font-size: 14px; font-weight: 600; }
    .meta { display: flex; justify-content: space-between; border-bottom: 1px solid #666; padding-bottom: 5px; margin-bottom: 15px; font-size: 11px; }
    .content-grid { display: grid; grid-template-columns: 48% 1fr; gap: 20px; }
    .col-title { font-size: 12px; font-weight: 700; border-bottom: 1px solid #999; padding-bottom: 3px; margin-bottom: 10px; margin-top: 0; text-transform: uppercase; }
    .left-col { border-right: 1px solid #ccc; padding-right: 20px; }
    .right-col { padding-left: 0; }
    .section { margin-bottom: 15px; }
    .section-title { font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #000; }
    .list-item { margin-bottom: 4px; line-height: 1.3; }
    .info-box { border: 1px solid #aaa; padding: 10px; margin-top: 15px; background: #fafafa; }
    .info-box h3 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px;}
    .sig-section { position: absolute; bottom: 15px; left: 15px; right: 15px; border-top: 2px solid #222; padding-top: 15px; }
    .signatures { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .sig-box { text-align: center; width: 30%; position: relative; }
    .sig-title { font-weight: 700; font-size: 11px; margin-bottom: 3px;}
    .sig-sub { font-size: 9px; color: #555; }
    .sig-line { border-top: 1px dashed #666; width: 80%; margin: 35px auto 5px auto; }
    .goruldu { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: #1e3a8a; font-weight: 700; font-style: italic; font-size: 14px; opacity: 0.9; }
    .goruldu-date { font-size: 8px; color: #1e3a8a; margin-top: 2px; font-style: normal; }
    .footer-meta { display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 5px; font-size: 8px; color: #666; }
    .empty-state { color: #666; font-style: italic; font-size: 10px; }
  </style>
</head>
<body>
  <div class="page-border">
    <div class="header">
      <img src="/logo-belediye.png" alt="Belediye Logo" onerror="this.style.display='none'">
      <div class="header-text">
        <h1>T.C. SİVAS BELEDİYE BAŞKANLIĞI</h1>
        <h2>İTFAİYE MÜDÜRLÜĞÜ GÜNLÜK NÖBET VE VUKUAT DEFTERİ</h2>
      </div>
      <img src="/logo-itfaiye.png" alt="İtfaiye Logo" onerror="this.style.display='none'">
    </div>

    <div class="meta">
      <div>
        <div>Rapor Tarihi: <strong>\${dateStr}</strong></div>
        <div style="margin-top:4px;">Nöbetçi Posta Sorumlu Çavuşu: <strong>\${bascavusName}</strong></div>
      </div>
      <div style="text-align: right; font-weight: 700;">Sayfa No: SVS-Z-\${report.id.substring(0, 8).toUpperCase()}</div>
    </div>

    <div class="content-grid">
      <div class="left-col">
        <h3 class="col-title">POSTA MEVCUDU VE NÖBET ÇİZELGESİ</h3>
        
        <div class="section">
          <div class="section-title">Nöbetçi Personel Listesi (PDKS):</div>
          \${shiftListHtml}
        </div>

        <div class="section">
          <div class="section-title">Saatlik Nöbet Yeri Çizelgesi:</div>
          \${rotasHtml}
        </div>

        <div class="info-box">
          <h3>POSTA GENEL MEVCUDU RAPORU</h3>
          <div class="list-item">Hazır Mevcut (Postadaki Personel): <strong>\${shiftLogsData.length} personel</strong></div>
          <div class="list-item">Dış Görev / Zimmet Sayısı: <strong>\${report.dis_gorev_sayisi || 0} görev</strong></div>
          <div class="list-item" style="margin-top: 8px; font-weight: 700; font-size: 12px;">Toplam Yekün: \${shiftLogsData.length + (report.dis_gorev_sayisi || 0)} personel</div>
        </div>
      </div>

      <div class="right-col">
        <h3 class="col-title">VUKUAT VE FAALİYET LİSTESİ (SON 24 SAAT)</h3>
        
        <div class="section">
          <div class="section-title">Vukuat Olay Özetleri:</div>
          <div class="list-item"><strong>Yangın:</strong> \${yTotal} adet <span style="color:#555">(Ev: \${report.yangin_sayisi?.ev || 0}, İşyeri: \${report.yangin_sayisi?.isyeri || 0}, Arazi: \${report.yangin_sayisi?.arazi || 0}, Diğer: \${report.yangin_sayisi?.diger || 0})</span></div>
          <div class="list-item"><strong>Kurtarma:</strong> \${kTotal} adet <span style="color:#555">(Kaza: \${report.kurtarma_sayisi?.trafik_kazasi || 0}, Su: \${report.kurtarma_sayisi?.su_baskini || 0}, Hayvan: \${report.kurtarma_sayisi?.hayvan_kurtarma || 0}, Diğer: \${report.kurtarma_sayisi?.diger || 0})</span></div>
        </div>

        <div class="section">
          <div class="section-title">Arızalı / Bakımdaki Taktik Araçlar:</div>
          \${arizaliAraclarText}
        </div>

        <div class="section">
          <div class="section-title">Faaliyet Kayıtları Detaylı Listesi:</div>
          \${incidentsHtml}
        </div>

        <div class="section" style="margin-top: 15px;">
          <div class="section-title">Başçavuş / Nöbetçi Amir Notu:</div>
          <div class="\${report.serh_notu ? '' : 'empty-state'}">\${report.serh_notu || 'Herhangi bir devir notu eklenmemiştir.'}</div>
        </div>
      </div>
    </div>

    <div class="sig-section">
      <div class="signatures">
        <div class="sig-box">
          <div class="sig-title">Nöbetçi Başçavuş</div>
          <div class="sig-sub">(Hazırlayan)</div>
          <div class="sig-line"></div>
          <div class="sig-sub">İmza / Sicil / Unvan</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Nöbetçi Amir</div>
          <div class="sig-sub">&nbsp;</div>
          <div class="goruldu">
            <div>GÖRÜLDÜ</div>
            <div class="goruldu-date">Sistem Onayı - \${todayStr}</div>
          </div>
          <div class="sig-line"></div>
          <div class="sig-sub">İmza / Sicil / Unvan</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">İtfaiye Müdürü</div>
          <div class="sig-sub">&nbsp;</div>
          <div class="goruldu">
            <div>GÖRÜLDÜ</div>
            <div class="goruldu-date">Sistem Onayı - \${todayStr}</div>
          </div>
          <div class="sig-line"></div>
          <div class="sig-sub">İmza / Onay / Tarih</div>
        </div>
      </div>
      <div class="footer-meta">
        <div>Bu belge Sivas Belediyesi İtfaiye Müdürlüğü dijital arşiv sistemi tarafından üretilmiştir.</div>
        <div>Dijital Doğrulama Kodu: SVS-Z-\${report.id.substring(0, 8).toUpperCase()}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
  </script>
</body>
</html>
      \`)
      printWindow.document.close()
    } catch (err: any) {
      console.error(err)
      alert("Rapor yazdırılırken hata oluştu: " + err.message)
    } finally {
      setZSubmitting(false)
    }
  }`;

const file = 'src/app/(dashboard)/yonetim/raporlar/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const handleExportZReportPDF = async \(report: any\) => \{[\s\S]*?doc\.save\(`Itfaiye_Z_Raporu_\$\{report\.rapor_tarihi\}\.pdf`\)\r?\n  \}/;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Done');
