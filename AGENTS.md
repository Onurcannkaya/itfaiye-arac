<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sivas Belediyesi SMS API Kullanım Rehberi

Sisteme SMS gönderme entegrasyonu, `bildirim.sivas.bel.tr` üzerindeki REST API aracılığıyla yapılmaktadır.
Bu API'ye yapılacak tüm isteklerde güvenlik amacıyla aşağıdaki header bilgileri gönderilmelidir:
- `X-Api-Key`: `process.env.SMS_API_KEY`
- `X-Api-Secret`: `process.env.SMS_API_SECRET`
- `Content-Type`: `application/json`

## 1. Tekil SMS Gönderme (Single SMS)
Sadece bir kişiye SMS göndermek için kullanılır.
- **Endpoint:** `POST https://bildirim.sivas.bel.tr/api/v1/sms-send`
- **Request Body Formatı:**
```json
{
  "phoneNumber": "05446580135",
  "content": "Mesaj içeriği buraya gelecek",
  "scheduledAt": "2026-01-15T10:00:00Z" // (Opsiyonel) İleri tarihli gönderim için ISO 8601
}
```

## 2. Toplu SMS Gönderme (Bulk SMS)
Birden fazla kişiye aynı anda SMS göndermek için kullanılır.
- **Endpoint:** `POST https://bildirim.sivas.bel.tr/api/v1/sms-send-bulk`
- **Request Body Formatı:**
```json
{
  "phoneNumbers": ["05412983450", "05559876543"],
  "content": "Toplu mesaj içeriği buraya gelecek",
  "scheduledAt": "2026-01-15T10:00:00Z" // (Opsiyonel)
}
```

*Not: Başarılı istekler HTTP 200 döner ve JSON olarak `{"status":true,"message":"SMS accepted","data":"uuid","errors":[]}` formatında bir yanıt verir. API Döküman adresi (MCP): https://bildirim.sivas.bel.tr/mcp/a3f8c2e1b7d94f5a8c6e2b1d3f7a9c5e*

# Dosya Depolama (MinIO) Rehberi

**Tüm dosya yüklemeleri MinIO nesne depolamaya yapılır (yerel diske DEĞİL).** Depolama
adresi `assets.sivas.bel.tr`, bucket `public`. Dosyalar `<bucket>/itfaiye/<klasör>/`
altına yüklenir ve şu adresten herkese açık erişilir:
`https://assets.sivas.bel.tr/public/itfaiye/<klasör>/<dosya>`

## Nasıl kullanılır (ZORUNLU kural)
- Yeni bir dosya yükleme özelliği eklerken **kendi yükleme mantığını yazma**; mevcut
  merkezi uçları kullan:
  - **Sunucu tarafı:** `src/lib/storage.ts` içindeki `uploadToMinio(folder, fileName, buffer, contentType)` → herkese açık URL döndürür.
  - **API ucu:** `POST /api/upload` (multipart form-data: `file` + `folder`). Kimlik doğrulaması gerekir. `{ url, fileName, size, type }` döner.
  - **İstemci tarafı:** `api.upload(file, folder)` (`src/lib/api.ts`) → `{ url, error }`. Ya da doğrudan `/api/upload`'a `FormData` (`file`, `folder`).
- **`folder`** dosyanın mantıksal kategorisidir; otomatik olarak `itfaiye/<folder>/` altına yazılır.
  Mevcut klasörler: `incidents` (olay/vaka medyası, PDF), `certificates` (personel sertifikaları),
  `arizalar` (araç arıza fotoğrafları), `telsiz-ses` (telsiz ses kayıtları), `general`.
  Yeni bir kategori gerekiyorsa yeni bir `folder` adı ver (kebab-case).
- Dönen `url` doğrudan DB'ye kaydedilir ve `<img>/<audio>/<a>` ile gösterilir; ekstra işlem gerekmez.

## Ortam değişkenleri
`MINIO_ACCESS_KEY` ve `MINIO_SECRET_KEY` **zorunlu** (runtime env; Docker/Dokploy'da tanımlı olmalı).
Diğerleri belirtilmezse üretim varsayılanları kullanılır:
`MINIO_ENDPOINT=assets.sivas.bel.tr`, `MINIO_PORT=443`, `MINIO_USE_SSL=true`,
`MINIO_BUCKET=public`, `MINIO_PUBLIC_URL=https://assets.sivas.bel.tr`.

*Not: Yükleme tipi/boyut kısıtları `/api/upload` içinde (`ALLOWED_TYPES`, 50MB). Yeni bir dosya
türü desteklenecekse oraya eklenir. Yerel diske (`public/uploads`) yazma KULLANILMAZ.*
