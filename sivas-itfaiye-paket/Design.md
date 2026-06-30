# Tasarım Sistemi — Sivas İtfaiye Yönetim Sistemi

> Bu doküman, arayüzün tüm görsel ve yapısal kurallarını tanımlar. Yeni sayfa, modül veya
> bileşen eklenirken **bu kurallara birebir uyulmalıdır** ki sistem genelinde (ve bağlı diğer
> uygulamalarda) tam tutarlılık korunsun.

---

## 1. Tasarım Felsefesi

İtfaiye, bir **operasyon merkezi**dir: kritik bilgi hızlı okunmalı, durum bir bakışta
anlaşılmalıdır. Tasarım buna göre üç ilkeye dayanır:

1. **Sakin yüzey, keskin sinyal.** Arka planlar nötr ve düşük doygunluktadır; renk yalnızca
   _anlam_ taşır (acil durum kırmızısı, uyarı amberi). Renk = dikkat; gereksiz renk yoktur.
2. **Tek bir token kaynağı.** Hiçbir bileşen kendi rengini/ölçüsünü uydurmaz. Her görsel
   değer `--fd-*` CSS değişkenlerinden okunur. Böylece tema panelinden yapılan her değişiklik
   tüm arayüze anında yansır.
3. **Yoğunluk ama nefes.** Tablolar operasyonel veri yoğunluğunu taşır; ölçü (`--fd-sp`)
   token'ı ile bu yoğunluk kullanıcı tarafından ayarlanabilir.

---

## 2. Teknoloji ve Mimari

### 2.1 Referans Prototip (Şablon: `index.html`)

- **Tek dosya bileşen** (`index.html`): Şablon (HTML) + mantık sınıfı (`Component`) bir arada.
- Çalışma zamanı `support.js` tarafından sağlanır (React 18 tabanlı, CDN'den yüklenir).
- **Stil yaklaşımı:** Tüm stiller **satır içi (inline)**. Sınıf tabanlı CSS kullanılmaz.
  Tek istisna `<helmet>` içindeki `@font-face`, `@keyframes` ve gövde sıfırlamalarıdır.
- **Tema motoru:** `buildTokens(theme)` metodu, durum (state) içindeki tema ayarlarından
  bir CSS değişkenleri sözlüğü üretir; bu sözlük kök `<div>` üzerine satır içi stil olarak
  bağlanır. Tüm alt bileşenler `var(--fd-…)` ile bu değişkenleri okur.

### 2.2 Üretim Uygulaması (Next.js + Tailwind v4)

Üretim ortamında proje **Next.js 16 + Tailwind CSS v4** ile geliştirilir. Tasarım token’ları
aynı `--fd-*` değişken ailesini kullanır; uygulanma biçimi farklıdır:

- **CSS Değişkenleri:** `globals.css` dosyasındaki `:root, .light` ve `.dark` seçicileri
  tüm `--fd-*` token’larını mod bazında tanımlar.
- **Zustand Tema Deposu (`themeStore.ts`):** Kullanıcının seçtiği vurgu rengi, radius,
  gölge, spacing, fontScale, font değerlerini localStorage’de saklar.
- **`CustomThemeInjector` (`ThemeProvider.tsx`):** Zustand’dan okunan değerleri anlık olarak
  `document.documentElement.style` üzerine CSS değişkeni olarak yazar. Şunları enjekte eder:
  `--fd-accent`, `--fd-accent-soft`, `--fd-r`, `--fd-sp`, `--fd-fs`, `--fd-font`,
  `--fd-shadow-sm`, `--fd-shadow`, `--fd-shadow-lg`.
- **`@theme inline` Tailwind v4 Eşlemesi:** Tailwind’ın standart `bg-*`, `text-*`,
  `rounded-*`, `shadow-*` sınıflarını `--fd-*` değişkenlerine bağlar:
  ```css
  --color-background: var(--fd-bg);
  --color-card: var(--fd-surface);
  --color-surface: var(--fd-surface);
  --radius-lg: var(--fd-r);
  --shadow-sm: var(--fd-shadow-sm);
  ```
- **Slate Polyfill:** Legacy bileşenlerdeki `slate-*` Tailwind renkleri otomatik olarak
  `--fd-*` değişkenlerine eşlenir (aşağı bakınız).

**Slate → `--fd-*` Eşleme Tablosu:**

| Tailwind Sınıfı | Eşleştiği Token | Semantik Anlam |
|----------------|-----------------|----------------|
| `slate-50`     | `--fd-surface2` | Çok açık arka plan |
| `slate-100`    | `--fd-surface2` | Açık arka plan |
| `slate-200`    | `--fd-border`   | Açık kenarlık |
| `slate-300`    | `--fd-border-strong` | Kenarlık |
| `slate-400`    | `--fd-text3`    | Sönük metin |
| `slate-500`    | `--fd-text2`    | İkincil metin |
| `slate-600`    | `--fd-text2`    | Orta metin |
| `slate-700`    | `--fd-text`     | Koyu metin |
| `slate-800`    | `--fd-border-strong` | Koyu kenarlık |
| `slate-900`    | `--fd-bg`       | Koyu arka plan |
| `slate-950`    | `--fd-bg`       | En koyu arka plan |

> **Önemli:** Yeni bileşenlerde `slate-*` sınıfları KULLANMAYIN. Daima doğrudan
> `var(--fd-*)` token’larını kullanın: `bg-[var(--fd-surface)]`, `text-[var(--fd-text2)]`,
> `border-[var(--fd-border)]`, `rounded-[var(--fd-r)]` vb.

### Token isimlendirme

Tüm token'lar `--fd-` (fire department) ön ekini taşır. Kategoriler:

```
--fd-bg, --fd-surface, --fd-surface2, --fd-surface3   → yüzeyler
--fd-border, --fd-border-strong                        → kenarlıklar
--fd-text, --fd-text2, --fd-text3                      → metin (birincil → en sönük)
--fd-accent, --fd-accent-soft, --fd-accent-soft2       → vurgu rengi ve yumuşak tonları
--fd-amber / --fd-success / --fd-info / --fd-danger     → anlamsal (semantik) renkler
--fd-side-bg, --fd-side-bg2, --fd-side-text, --fd-side-dim, --fd-side-border  → yan menü
--fd-font, --fd-fontmono, --fd-fs                       → tipografi
--fd-r, --fd-r-sm, --fd-r-lg                            → köşe ovalliği
--fd-sp                                                 → temel boşluk birimi
--fd-shadow-sm, --fd-shadow, --fd-shadow-lg            → gölgeler
```

---

## 3. Renk Sistemi

Renkler moda (açık/koyu) göre `buildTokens` içinde türetilir. Vurgu rengi ve anlamsal
renkler her iki modda ortaktır.

### Açık mod (varsayılan)

| Token | Değer | Kullanım |
|-------|-------|----------|
| `--fd-bg` | `#eceff3` | Uygulama zemini |
| `--fd-surface` | `#ffffff` | Kart, tablo, panel yüzeyi |
| `--fd-surface2` | `#f6f8fa` | İkincil yüzey (tablo başlığı, input) |
| `--fd-surface3` | `#eef1f5` | Üçüncül (ilerleme rayı, çip zemini) |
| `--fd-border` | `#e3e7ec` | Standart kenarlık |
| `--fd-border-strong` | `#cfd6de` | Belirgin kenarlık / kaydırma çubuğu |
| `--fd-text` | `#151a20` | Birincil metin |
| `--fd-text2` | `#566069` | İkincil metin |
| `--fd-text3` | `#8a94a0` | Sönük metin / etiket |

### Koyu mod

| Token | Değer |
|-------|-------|
| `--fd-bg` | `#0d1014` |
| `--fd-surface` | `#161b22` |
| `--fd-surface2` | `#1b212a` |
| `--fd-surface3` | `#222a35` |
| `--fd-border` | `#262d37` |
| `--fd-border-strong` | `#39424f` |
| `--fd-text` | `#e7ebef` |
| `--fd-text2` | `#9aa4af` |
| `--fd-text3` | `#6b7682` |

### Yan menü (her iki modda koyu — GitHub Dark Palette)

Yan menü her zaman koyudur; bu, operasyon panelini içerik alanından ayırır ve marka
kimliğini güçlendirir.

| Token | Açık Mod | Koyu Mod | Kullanım |
|-------|----------|---------|----------|
| `--fd-side-bg` | `#0d1117` | `#010409` | Sidebar ana arka plan |
| `--fd-side-bg2` | `#161b22` | `#0d1117` | Hover arka planı |
| `--fd-side-text` | `#c9d1d9` | `#c9d1d9` | Menü yazı rengi |
| `--fd-side-dim` | `#8b949e` | `#8b949e` | Sönük/etiket metin |
| `--fd-side-border` | `#21262d` | `#1b1f23` | Kenarlık |

### Vurgu rengi (kullanıcı seçer)

Tema panelinde 5 hazır seçenek. Varsayılan **İtfaiye Kırmızısı**.

| Ad | Hex |
|----|-----|
| İtfaiye Kırmızısı | `#dc2626` |
| Alev Turuncusu | `#ea580c` |
| Koyu Kırmızı | `#b91c1c` |
| Operasyon Mavisi | `#2563eb` |
| Teal | `#0891b2` |

`--fd-accent-soft` ve `--fd-accent-soft2`, vurgu renginin sırasıyla ~%12–22 ve ~%20–34
opaklıktaki tonlarıdır (`hexA()` ile üretilir; mod'a göre opaklık artar).

### Anlamsal (semantik) renkler — SABİT

Bu renkler temadan **bağımsızdır**; durum bildirir, asla dekorasyon için kullanılmaz.

| Anlam | Renk | Nerede |
|-------|------|--------|
| `danger` / kritik | `#dc2626` | Aktif vaka, kritik önem, arızalı araç |
| `amber` / uyarı | `#f59e0b` | Müdahale ediliyor, görevde, devam ediyor |
| `info` / bilgi | `#2563eb` | Kontrol altında, planlandı, bakımda |
| `success` / olumlu | `#16a34a` | Tamamlandı, müsait |
| `muted` / nötr | `#94a3b8` | Düşük öncelik, izinli, bekliyor |

**Rozet (badge) tonlama kuralı** (`toneStyle()`): metin rengi koyu modda açık varyant,
açık modda koyu varyant; zemin ise `rgba(renk, 0.11–0.20)`. Böylece rozetler her iki modda
okunaklı kalır.

---

## 4. Tipografi

| Rol | Değer |
|-----|-------|
| Birincil aile | **IBM Plex Sans** (`--fd-font`) — seçilebilir: Source Sans 3, Sistem, IBM Plex Mono |
| Sayısal / mono | **IBM Plex Mono** (`--fd-fontmono`) — plaka, sicil, metrik, saat, tutar |
| Temel boyut | `--fd-fs` = **14px** (tema panelinden 12–17px) |

Tüm yazı boyutları temel boyuta **orantılı** tanımlanır (`calc(var(--fd-fs) * k)`):

| Öğe | Çarpan | Örnek (14px tabanda) |
|-----|--------|----------------------|
| Sayfa başlığı (h1) | `1.7` | ~24px |
| Kart başlığı | `1.02` | ~14px (700 ağırlık) |
| Büyük metrik | `2.0` | ~28px (700) |
| Gövde / hücre | `0.85–0.9` | ~12–13px |
| Etiket / üst başlık | `0.68–0.74` | ~10px (700, harf aralığı `.04–.09em`) |

**Kural:** sabit `px` font boyutu yazma. Daima `calc(var(--fd-fs) * k)` kullan ki "Yazı
Boyutu" token'ı tüm arayüzü ölçeklesin.

---

## 5. Boşluk (Spacing)

Tek temel birim: `--fd-sp` = `8px × spacing` (spacing token'ı 0.8–1.4 arası).
Tüm iç/dış boşluklar bunun katlarıdır: `calc(var(--fd-sp) * k)`.

| Kullanım | Tipik değer |
|----------|-------------|
| Kart iç boşluğu | `calc(var(--fd-sp) * 1.75)` |
| Tablo hücresi dikey | `calc(var(--fd-sp) * 1.4)` |
| Sayfa kenar boşluğu | `calc(var(--fd-sp) * 3)` |
| Öğeler arası gap | `calc(var(--fd-sp) * 1.25–2)` |

**Kural:** Satır/grup düzeninde daima `display:flex`/`grid` + `gap`. Bare margin veya
boşluk karakteriyle hizalama yapılmaz.

---

## 6. Köşe Ovalliği (Radius)

| Token | Değer | Kullanım |
|-------|-------|----------|
| `--fd-r` | `10px` (0–20px) | Kart, panel, tablo dış |
| `--fd-r-sm` | `--fd-r × 0.55` | Düğme, çip, input, ikon kutusu |
| `--fd-r-lg` | `--fd-r × 1.5` | Büyük paneller |
| `999px` | sabit | Rozet, ilerleme rayı, durum hapı (pill) |

---

## 7. Gölge

Yoğunluk `shadow` token'ı (0–1) ile ölçeklenir. Gölge rengi açık modda mavi-gri
(`15,23,42`), koyu modda saf siyah (`0,0,0`).

| Token | Kullanım |
|-------|----------|
| `--fd-shadow-sm` | Kartlar, tablolar, çip grupları (varsayılan yükselti) |
| `--fd-shadow` | Açılır menü, kayan paneller |
| `--fd-shadow-lg` | Tema çekmecesi, modal |

---

## 8. İkonografi

- Tümü **çizgisel (stroke)**, `stroke-width: 1.8`, yuvarlatılmış uç/köşe.
- Standart boyut **18px**; küçük bağlamlarda 14–16px.
- `currentColor` kullanır — bulunduğu metnin rengini alır.
- `icon(name, size)` yardımcı metodundan üretilir. Mevcut set: `grid, file, map, nav,
  flame, truck, wrench, users, calendar, clipboard, alert, box, menu, search, bell,
  sliders, sun, moon, chevron, collapse, plus, export, filter, close, check, reset`.
- **Emoji kullanılmaz.** Karmaşık/dekoratif SVG çizilmez.

---

## 9. Düzen (Layout)

```
┌──────────────────────────────────────────────────────────┐
│  APPBAR (60px) — logo · arama · durum · mod · tema · kullanıcı │
├───────────────┬──────────────────────────────────────────┤
│               │  İÇERİK BAŞLIĞI (kırıntı · h1 · açıklama · aksiyon) │
│   SIDEBAR     ├──────────────────────────────────────────┤
│  (266/74px)   │                                          │
│  3 seviye     │            KAYDIRILABİLİR İÇERİK          │
│  ağaç menü    │                                          │
└───────────────┴──────────────────────────────────────────┘
```

- Kök: `display:flex; flex-direction:column; height:100vh; overflow:hidden`.
- Appbar sabit yükseklik; gövde satırı `flex:1` (sidebar + main).
- Sidebar genişliği token: `266px` açık, `74px` daraltılmış (yalnızca ikonlar).
- İçerik başlığı sabit; altındaki alan `overflow-y:auto`.

---

## 10. Bileşenler

### 10.1 Sidebar — 3 seviyeli ağaç

- **Seviye 1 — Modül başlığı:** Tıklanamaz üst başlık (`GENEL, OPERASYON, KAYNAKLAR,
  PLANLAMA`). 700 ağırlık, `.09em` harf aralığı, `--fd-side-dim`.
- **Seviye 2 — Tekil sayfa veya grup:** İkon + etiket. Grup ise sağda dönen chevron.
- **Seviye 3 — Alt sayfa (yaprak):** Girintili (`padding-left: sp×4.4`), ikonsuz.

**Durumlar:**
- _Pasif:_ zemin şeffaf, metin `--fd-side-text`.
- _Hover:_ zemin `--fd-side-bg2`, metin `#fff`.
- _Aktif (tekil):_ zemin `--fd-accent`, metin `#fff`, 600 ağırlık.
- _Aktif (yaprak):_ zemin `--fd-accent-soft2`, metin `#fff`, solda 3px `inset` vurgu çubuğu.

> **Önemli teknik kural:** Aktif/pasif durum **iki ayrı `sc-if` dalı** (literal stilli) ile
> render edilir — nesne-stil holü `{{ }}` ile DEĞİL. Çalışma zamanı, kalıcı liste
> öğelerinde nesne-stil hollerini yeniden uygulamadığından, durum değişiminin güvenilir
> yansıması için yapısal koşullu (sc-if) yaklaşım zorunludur.

### 10.2 Appbar

Sol: menü daraltma (hamburger) ikonu. Orta: **breadcrumb** (sayfa yolunu `Yönetim > Personel`
şeklinde gösterir, `usePathname()` tabanlı dinamik). Sağ: QR Tara, Tema düğmesi, bildirim
zili, kullanıcı bloğu. Yükseklik 60px, `--fd-shadow-sm`, `z-index:30`.

### 10.3 İstatistik kartı (stat card)

`--fd-surface` zemin, `--fd-border` kenarlık, `--fd-r`, `--fd-shadow-sm`. Üstte etiket +
tonlu ikon kutusu (`34×34`, `--fd-r-sm`); ortada büyük metrik (`fs×2`, mono); altta
delta + bağlam. 5'li grid.

### 10.4 Tablo

- Başlık satırı: `--fd-surface2` zemin, `--fd-text3`, 700, büyük harf, `.04em`.
- `display:grid` ile sabit kolon şablonu (her sayfa kendi şablonunu tanımlar).
- Satır hover: `--fd-surface2`. Satır ayıracı: alt `--fd-border`.
- Plaka/sicil/tutar/tarih → `--fd-fontmono`.
- Durum hücreleri **rozet** kullanır (bkz. 10.5).

### 10.5 Rozet (badge)

`badge(tone)`: tonlu metin + ~%11–20 tonlu zemin, `999px` köşe, `fs×0.74`, 700.
Tonlar: `danger, amber, info, success, muted`. Anlamsal renk kuralına uyar (§3).

### 10.6 Filtre çipleri

Tek satırlık segment kontrol; aktif çip `--fd-accent` zemin + `#fff`. Yanında mono sayaç.

### 10.7 Grafikler (kütüphane yok, CSS)

- **Çubuk (bar):** flex satır, yükseklik `%` ile. Güncel ay `--fd-accent`, diğerleri
  `--fd-accent-soft2`.
- **Halka (donut):** `conic-gradient` ile tek `div`; ortada delik için iç `div`
  (`--fd-surface`). Lejant renkleri sabit kategori paleti.
- **İlerleme/doluluk:** `999px` ray (`--fd-surface3`) + dolu kısım (semantik renk).

### 10.8 Harita (Leaflet + OpenStreetMap)

- Sivas merkez `[39.7477, 37.0179]`, zoom 13. Tile: CartoDB **light**/**dark** (moda göre).
- **Yangın & Vaka Haritası:** vakalar `circleMarker`, yarıçap+renk önem derecesine göre.
- **Canlı Konum:** araçlar `divIcon` (renkli yuvarlak + araç no); 1.4 sn'de bir konum
  güncellenir (simülasyon). `_ensureMap()` sayfa/mod değişiminde haritayı yeniden kurar,
  ayrılışta temizler (bellek sızıntısı yok).

### 10.9 Tema çekmecesi (drawer)

Sağdan kayan panel (`--fd-shadow-lg`). Bölümler: Görünüm modu (segment), Vurgu rengi
(5 swatch), Ölçü & biçim (4 slider: radius, gölge, boşluk, yazı boyutu), Yazı tipi (liste),
"Varsayılana Sıfırla". Tüm kontroller `state.theme`'i günceller → anlık yansıma.

---

## 11. Etkileşim Durumları

| Durum | Davranış |
|-------|----------|
| Hover (düğme/satır) | Yumuşak zemin geçişi (`.12s`) |
| Aktif nav | Vurgu zemin + (yaprakta) sol vurgu çubuğu |
| Input focus | Kenarlık `--fd-accent`, zemin `--fd-surface` |
| Canlı gösterge | `fd-pulse` keyframe (yanıp sönen nokta) |

Giriş animasyonları (içerik fade) bilinçli olarak kullanılmaz — saniyelik canlı güncellemeler
sırasında yeniden tetiklenip titremeye yol açtığı için kaldırılmıştır.

---

## 12. Erişilebilirlik

- Metin/zemin kontrastı her iki modda WCAG AA hedeflenir (`--fd-text` / `--fd-text2`).
- Dokunma/hedef alanı min. 36px (appbar düğmeleri 36px, nav satırları daha büyük).
- Renk asla **tek** sinyal değildir: durum hem renk hem metin etiketi taşır (rozet).
- İkon-yalnız düğmelerde `title` özniteliği bulunur.

---

## 13. Yeni Sayfa / Modül Ekleme Rehberi (Next.js)

1. **Yol:** `src/app/(dashboard)/yonetim/<yeni-sayfa>/page.tsx` dosyasını oluştur.
2. **Breadcrumb:** `Topbar.tsx` içindeki `BREADCRUMB_LABELS` sözlüğüne yeni sayfanın slug → Türkçe adını ekle.
3. **Nav menü:** `Sidebar.tsx` içindeki `navConfig` ağacına yeni modül satırını ekle.
4. **Stil kuralları:**
   - Yalnızca `var(--fd-*)` ve `calc(var(--fd-sp/fs/r) * k)` kullan.
   - Tailwind v4 sınıflarında arbitraj sözdizimi: `bg-[var(--fd-surface)]`, `rounded-[var(--fd-r)]`.
   - Statik `slate-*`, `gray-*` gibi Tailwind renkleri KULLANMA.
   - `bg-opacity-*`, `text-opacity-*` gibi Tailwind v3 yardımcıları KULLANMA.
   - Koyu/açık mod varyantı (`light:`, `dark:`) yerine `--fd-*` token’ları kullan.
5. **Card bileşeni:** `Card.tsx` zaten tam tokenize edilmiştir; `<Card>` kullanıldığında
   ekstra renk/radius geçersizleştirme gerekmez.

---

## 14. Yapma / Yap Özeti

**Yapma:** sabit hex renk, sabit px boşluk/font, emoji, dekoratif SVG, gradient zemin,
statik `slate-*`/`gray-*` Tailwind renkleri, Tailwind v3 `bg-opacity-*` sınıfları,
`light:`/`dark:` varyantı (token zaten moda göre değişir), `html { font-size }` ile çift katlama.

**Yap:** `var(--fd-*)` token’ları, `calc()` ölçekleme, flex/grid + gap, semantik renkler,
mono font sayılarda, her iki modda test, rozetle durum bildirimi, arbitraj Tailwind sözdizimi
(`bg-[var(--fd-surface)]`, `rounded-[var(--fd-r)]`), breadcrumb Topbar içinde.
