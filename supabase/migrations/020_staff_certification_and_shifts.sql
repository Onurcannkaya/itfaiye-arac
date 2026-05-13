-- ============================================================
-- SİVAS İTFAİYE — PERSONEL SERTİFİKALARI, NÖBET VE MEDYA ARŞİVİ
-- ============================================================

-- ============================================================
-- 1. PERSONEL TABLOSU GÜNCELLEMELERİ (NÖBET/POSTA)
-- ============================================================
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS posta_no INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS durum VARCHAR(50) DEFAULT 'Görevde' CHECK (durum IN ('Görevde', 'İzinli', 'Raporlu'));

-- ============================================================
-- 2. SERTİFİKA VE EHLİYET TABLOSU
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no VARCHAR(20) REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  tip VARCHAR(100) NOT NULL, -- Ehliyet, İlkyardım, Yangın Eğitimi vb.
  gecerlilik_tarihi DATE NOT NULL,
  belge_no VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_staff_certifications_updated_at
  BEFORE UPDATE ON public.staff_certifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Politikaları
ALTER TABLE public.staff_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_certifications_read_all" ON public.staff_certifications;
DROP POLICY IF EXISTS "staff_certifications_write_admin" ON public.staff_certifications;

CREATE POLICY "staff_certifications_read_all" ON public.staff_certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_certifications_write_admin" ON public.staff_certifications FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.personnel
    WHERE sicil_no = (auth.jwt() -> 'user_metadata' ->> 'sicil_no')
    AND rol IN ('Admin', 'Editor')
  )
);

-- ============================================================
-- 3. KRİTİK UYARI GÖRÜNÜMÜ (VIEW)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_expiring_certifications AS
SELECT 
    sc.id,
    sc.sicil_no,
    p.ad,
    p.soyad,
    sc.tip,
    sc.gecerlilik_tarihi,
    sc.belge_no,
    (sc.gecerlilik_tarihi - CURRENT_DATE) as kalan_gun
FROM 
    public.staff_certifications sc
JOIN 
    public.personnel p ON sc.sicil_no = p.sicil_no
WHERE 
    sc.gecerlilik_tarihi <= (CURRENT_DATE + INTERVAL '30 days')
    AND p.aktif = true;

-- ============================================================
-- 4. OLAY MEDYA ARŞİVİ TABLOSU
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tip VARCHAR(50) DEFAULT 'fotoğraf', -- fotoğraf, video
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Politikaları
ALTER TABLE public.incident_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incident_media_read_all" ON public.incident_media;
DROP POLICY IF EXISTS "incident_media_insert_all" ON public.incident_media;

CREATE POLICY "incident_media_read_all" ON public.incident_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "incident_media_insert_all" ON public.incident_media FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 5. STORAGE BUCKET — incident_vault
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident_vault',
  'incident_vault',
  false,
  52428800, -- 50MB (video ve fotoğraflar için)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Politikaları
DROP POLICY IF EXISTS "Authenticated users can upload incident media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view incident media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own incident media" ON storage.objects;

CREATE POLICY "Authenticated users can upload incident media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'incident_vault');
CREATE POLICY "Authenticated users can view incident media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'incident_vault');
CREATE POLICY "Authenticated users can delete own incident media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'incident_vault');

-- BİTİŞ
