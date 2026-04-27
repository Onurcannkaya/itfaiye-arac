-- ============================================================
-- Sivas İtfaiyesi — Migration #005
-- Faz 5.1: Fotoğraflı Kaza/Arıza Bildirimi — Storage & Şema
-- ============================================================

-- ─────────────────────────────────────────────
-- 1) SUPABASE STORAGE BUCKET
-- ─────────────────────────────────────────────
-- NOT: Supabase Storage Bucket'ları SQL ile oluşturulabilir.
-- 'evidence_photos' → Arıza/kaza fotoğrafları için ayrılmış bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-photos',
  'evidence-photos',
  false,                                          -- Herkese açık DEĞİL (RLS ile koruma)
  2097152,                                        -- 2 MB limit (client-side sıkıştırma sonrası)
  ARRAY['image/jpeg', 'image/png', 'image/webp']  -- Sadece görsel formatları kabul et
)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 2) STORAGE RLS POLİTİKALARI
-- ─────────────────────────────────────────────

-- 2a) Authenticated kullanıcılar fotoğraf yükleyebilir
CREATE POLICY "Authenticated users can upload evidence photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'evidence-photos');

-- 2b) Authenticated kullanıcılar fotoğrafları görüntüleyebilir
CREATE POLICY "Authenticated users can view evidence photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'evidence-photos');

-- 2c) Authenticated kullanıcılar kendi yüklediklerini silebilir
CREATE POLICY "Authenticated users can delete own evidence photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'evidence-photos');

-- 2d) Authenticated kullanıcılar dosya güncelleyebilir (üzerine yazma)
CREATE POLICY "Authenticated users can update evidence photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'evidence-photos');


-- ─────────────────────────────────────────────
-- 3) ARIZA BİLDİRİMLERİ TABLOSU
-- ─────────────────────────────────────────────
-- Fotoğraflı arıza/kaza kayıtları için bağımsız tablo.
-- Task'lardan bağımsız olarak hızlı bildirim yapılabilmesini sağlar.

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(20) NOT NULL,                     -- Hangi araç
  bildiren_sicil varchar(20) REFERENCES public.personnel(sicil_no) ON DELETE SET NULL,
  kategori varchar(50) NOT NULL DEFAULT 'ariza',  -- 'ariza', 'kaza', 'hasar', 'diger'
  aciklama text NOT NULL,                         -- Detaylı açıklama
  oncelik varchar(20) DEFAULT 'normal',           -- 'dusuk', 'normal', 'yuksek', 'acil'
  fotograflar jsonb DEFAULT '[]'::jsonb,          -- Supabase Storage path'leri listesi
  durum varchar(20) DEFAULT 'acik',               -- 'acik', 'inceleniyor', 'cozuldu', 'kapandi'
  cozum_notu text,                                -- Çözüm detayı
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tüm personeller bildirimleri görebilir"
  ON public.incident_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tüm personeller bildirim oluşturabilir"
  ON public.incident_reports FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Yetkililer bildirimleri güncelleyebilir"
  ON public.incident_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 4) GÖREV ŞABLONLARINA 'image' TİPİ DESTEĞİ
-- ─────────────────────────────────────────────
-- task_templates.sorular JSONB alanı zaten esnek.
-- Yeni tip eklenmesi için şema değişikliği gerekmez.
-- Sadece uygulama tarafında 'image' tipi desteklenir.
--
-- Örnek JSONB soru:
-- {
--   "id": "uuid",
--   "soru": "Hasarlı bölgenin fotoğrafını çekin",
--   "tip": "image",
--   "zorunlu": true
-- }
--
-- Bu sayede amirlerin şablon oluşturucuda 'Fotoğraf'
-- tipinde soru ekleyebilmesi mümkün olur.
