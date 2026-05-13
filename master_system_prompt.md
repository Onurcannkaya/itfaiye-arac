# Sivas İtfaiyesi Araç, Envanter ve Operasyon Yönetim Sistemi - Master System Prompt

**Proje Özeti:**
Bu proje, Sivas İtfaiyesi için geliştirilmiş modern, web tabanlı bir araç ve envanter yönetim portalıdır. Sistem, itfaiye araçlarının (ve içlerindeki bölme/malzemelerin) dinamik olarak takip edilmesini, personel nöbet ve görev atamalarının yapılmasını, yakıt ve bakım kayıtlarının tutulmasını sağlamaktadır. Kağıt tabanlı ve manuel süreçleri dijitalleştirerek, operasyonel hızı, izlenebilirliği ve hesap verebilirliği maksimize etmeyi amaçlar.

---

## 1. Proje Tanımı ve Hedef Kitlesi
- **Hedef Kitle:** Sivas İtfaiye Daire Başkanlığı personeli (İtfaiye Erleri, Vardiya Çavuşları, Amirlikler, Yöneticiler/Müdürler).
- **Temel İşlevler:**
  - Araç envanterinin (dolaplar, ekipmanlar) anlık takibi.
  - Personel vardiya/nöbet değişimi ve görevlendirmeleri.
  - Periyodik bakım, arıza ve yakıt loglarının izlenmesi.
  - Detaylı ve filtrelenebilir sistem logları (Audit Trail) ve Envanter Sayım Geçmişi.
  - QR Kod / Barkod tabanlı donanım tarama (gelecek vizyonu).

---

## 2. Teknoloji Yığını
- **Frontend Framework:** Next.js 14 (App Router)
- **Dil:** TypeScript (Strict mod)
- **Stil & UI:** Tailwind CSS, `shadcn/ui` bileşenleri (Lucide-react ikonları)
- **State Management:** Zustand (Client-side global state, persist middleware ile)
- **Backend / BaaS:** Supabase
- **Kimlik Doğrulama (Auth):** Supabase Auth (Email/Password)
- **Veritabanı:** PostgreSQL (Supabase barındırmalı)

---

## 3. Mimari Kararlar ve Temel Kurallar

### Kimlik Doğrulama (Auth) & Sicil No
- **Kullanıcı Adı Deneyimi:** Personel sisteme sadece `sicil_no` (Örn: SB5801) ve `şifre` girerek giriş yapar. 
- **Arka Plan Çevirimi:** Supabase Auth e-posta gerektirdiğinden, arka planda (Zustand store veya SSR) sicil numaraları `@itfaiye.local` uzantısıyla sanal bir e-postaya dönüştürülür (Örn: `SB5801@itfaiye.local`).
- **Middleware Koruması:** `src/middleware.ts`, public rotalar (login, vb.) dışındaki tüm istekleri `updateSession` metodu ile Supabase SSR üzerinden kontrol eder. Geçersiz/süresi dolmuş session'ları `/login` sayfasına yönlendirir.
- **RBAC (Role Based Access Control):** Personel tablosundaki `rol` (Admin, Editor, Shift_Leader, User) değerlerine göre UI bileşenleri gösterilir/gizlenir ve `/yonetim` gibi admin yollarına erişim engellenir.

### Veritabanı ve Veri Modeli
- **JSONB Kullanımı (Kritik):** İtfaiye araçlarındaki bölmelerin ve içindeki malzemelerin sayısı ve yapısı sürekli değişebildiğinden, `vehicles` tablosundaki `bolmeler` kolonu **JSONB** olarak tutulmuştur. Arayüz, bu JSON yapısını dinamik olarak render eder (Bölme -> Raflar -> Malzemeler). 
- **Veri Senkronizasyonu:** Client-side'da veri çekme işlemleri `createClient()` (browser) üzerinden yapılır. SSR veya route handler taraflarında `@supabase/ssr` kullanılır.
- **Güvenlik (RLS - Row Level Security):** Tüm tablolarda RLS aktif olup, işlemler yalnızca yetkili (`authenticated`) isteklere izin verecek şekilde konfigüre edilmiştir. Admin görevleri için (Örn: `/api/seed` veya yetki değişiklikleri) Service Role Key barındıran Admin Client kullanılır.
- **Audit Logging:** Hassas işlemler (`auth_logs`, `audit_logs`, `inventory_checks`) backend üzerinde saklanarak, kullanıcıların yaptığı her kritik eylem (giriş, görev oluşturma, envanter sayımı) kayıt altına alınır.

---

## 4. Klasör Yapısı ve Önemli Dosyalar

```text
src/
├── app/
│   ├── (auth)/login/page.tsx      # Sicil No tabanlı giriş arayüzü
│   ├── (dashboard)/               # Kimlik doğrulaması gerektiren ana sistem arayüzleri
│   │   ├── araclar/               # Araç listesi ve envanter görüntüleme
│   │   ├── bakim/                 # Yakıt ve Bakım geçmişi (maintenance_logs, fuel_logs)
│   │   ├── gorevler/              # Atanan görevler ve check-list'ler
│   │   └── yonetim/               # Admin paneli, Personel yönetimi ve Sistem Logları
│   ├── api/                       # Route handler'lar (Audit logları, seed vb.)
│   └── layout.tsx                 # Root layout (Fontlar, dark/light theme yapısı)
├── components/                    # Yeniden kullanılabilir UI bileşenleri
│   ├── ui/                        # Button, Input, Card vb. shadcn uyumlu temel bileşenler
│   ├── vehicle/                   # Araç kartı ve envanter modalı bileşenleri
│   ├── dashboard/                 # Gösterge paneli widget'ları
│   └── layout/                    # Sidebar, Header navigasyon elementleri
├── lib/                           # Yardımcı fonksiyonlar ve config
│   ├── supabase/                  # client.ts, server.ts, middleware.ts, admin.ts konfigürasyonları
│   ├── authStore.ts               # Zustand Auth State yönetimi (Supabase Auth entegreli)
│   └── utils.ts                   # Tailwind merge ve ortak utils
├── middleware.ts                  # Supabase Auth SSR ve Role-based koruma kalkanı
└── types/                         # TypeScript interface'leri
supabase/
└── migrations/                    # SQL şema ve RLS politikaları dosyaları
```

---

## 5. Karşılaşılan Zorluklar ve Çözümler

- **Zorluk:** Supabase'in zorunlu email girişi istemesi ancak itfaiye personelinin email yerine Sicil No kullanmaya alışkın olması.
  **Çözüm:** `sicil_no` UI'dan alınarak arkada `sicil_no@itfaiye.local` şeklinde dönüştürüldü. Personel `personnel` tablosuna `id` (auth.users referansı) ile bağlandı.
- **Zorluk:** Next.js SSR ile Supabase Cookie senkronizasyonunun bozulması.
  **Çözüm:** `@supabase/ssr` kütüphanesi kullanılarak `middleware.ts` içinde `updateSession` entegrasyonu sağlandı.
- **Zorluk:** Yeni kullanıcı oluştururken RLS engeli veya Auth API limitasyonları.
  **Çözüm:** Kullanıcı (personel) oluşturma ve yetki atama işlemlerinde arka planda `SUPABASE_SERVICE_ROLE_KEY` kullanılarak oluşturulan özel bir `admin.ts` istemcisi devreye sokuldu.

---

## 6. Gelecek Geliştirmeler (Roadmap)
1. **QR / Barkod Okuma:** Araç kapılarındaki QR kodlar ile mobil cihazdan o dolaba ait envanter listesine direkt geçiş.
2. **Push Bildirimler:** Arıza bildirimleri ve yeni görev atamalarında vardiya çavuşuna veya ilgili personele anlık bildirim (Web Push).
3. **PWA (Progressive Web App):** İnternet bağlantısının koptuğu afet senaryolarında offline envanter okuma ve sonrasında senkronizasyon desteği.
4. **Analitik Dashboards:** Yıllık yakıt tüketimi, bakım masrafları ve arıza trendleri için detaylı Chart.js / Recharts entegrasyonu.

Bu belge, Sivas İtfaiyesi projesinin belkemiğini oluşturur. Geliştirme yapılırken bu prensiplere sıkı sıkıya bağlı kalınmalıdır.
