# Sivas İtfaiye Yönetim Sistemi

Sivas Belediyesi İtfaiye Daire Başkanlığı için hazırlanmış, tamamen tema-tokenize edilmiş
yönetim bilgi sistemi arayüz prototipi. Açılır ağaç yapılı yan menü (sidebar), üst uygulama
çubuğu (appbar) ve merkezi içerik alanından oluşur. Tüm görsel parametreler (renk, köşe
ovalliği, gölge, boşluk, yazı tipi ve boyutu, açık/koyu mod) çalışma anında özelleştirilebilir.

## Çalıştırma

Gereksinim: **Node.js 18+** ve **pnpm**. (İlk açılışta React, Babel, Leaflet ve fontlar
CDN üzerinden yüklendiği için internet bağlantısı gerekir.)

```bash
pnpm install      # bağımlılıkları kur (yalnızca Vite)
pnpm run dev      # geliştirme sunucusu → http://localhost:5173
```

Üretim derlemesi ve önizleme:

```bash
pnpm run build    # dist/ klasörüne derler
pnpm run preview  # derlenmiş çıktıyı http://localhost:4173 adresinde sunar
```

## İçindekiler

| Yol | Açıklama |
|-----|----------|
| `index.html` | Uygulamanın tamamı (tek dosya — şablon + mantık) |
| `public/support.js` | Çalışma zamanı (bileşen motoru) |
| `Design.md` | **Tasarım sistemi dokümanı** — token'lar, bileşenler, kullanım kuralları |
| `vite.config.js` | Geliştirme/önizleme sunucu ayarları |

## Modüller

- **Genel Bakış** — canlı operasyon panosu (istatistikler, trend, vaka türü dağılımı)
- **Vaka Raporları** — filtrelenebilir müdahale kayıtları
- **Harita › Canlı Konum Takibi** — saha araçlarının gerçek zamanlı GPS takibi (Leaflet/OSM)
- **Harita › Yangın & Vaka Haritası** — vakaların coğrafi dağılımı, mahalle yoğunluğu
- **Araçlar › Araç Takibi** — araç envanteri, durum, yakıt, bakım takvimi
- **Araçlar › Bakım & Onarım** — iş emirleri takibi
- **Personel › Personel Takibi** — kadro, rütbe, istasyon, vardiya
- **Personel › Vardiya Takibi** — 24/48 vardiya çizelgesi
- **Görev Takibi** — denetim/tatbikat/eğitim görevleri (kanban)

## Temayı Özelleştirme

Üst çubuktaki **Tema** düğmesiyle açılan panelden tüm görünüm token'ları canlı değiştirilebilir.
Token mimarisi ve değerleri için `Design.md` dosyasına bakın.
