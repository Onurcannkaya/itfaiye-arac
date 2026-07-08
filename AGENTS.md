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
  "phoneNumber": "05412983450",
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
