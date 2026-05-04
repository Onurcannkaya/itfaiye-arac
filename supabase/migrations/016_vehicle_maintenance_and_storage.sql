-- ============================================================
-- SİVAS İTFAİYE — FAZ 4: ARAÇ BAKIM, ARIZA & FOTOĞRAF STORAGE
-- ============================================================

DROP TABLE IF EXISTS public.vehicle_maintenances CASCADE;

-- ============================================================
-- TABLO 1: vehicle_maintenances (Araç Bakım & Arıza Kayıtları)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_maintenances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaka TEXT NOT NULL, -- references vehicles
  islem_turu TEXT NOT NULL, -- 'Periyodik Bakım', 'Arıza/Tamir', 'Yağ Değişimi', 'Lastik', 'Kaza/Hasar'
  tarih TIMESTAMPTZ DEFAULT NOW(),
  kilometre NUMERIC,
  aciklama TEXT,
  maliyet NUMERIC DEFAULT 0,
  kaydi_acan_sicil_no TEXT, -- references personnel
  fotograf_url TEXT,
  durum TEXT DEFAULT 'Bekliyor', -- 'Bekliyor', 'Serviste', 'Tamamlandı'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_vehicle_maintenances_updated_at
  BEFORE UPDATE ON public.vehicle_maintenances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.vehicle_maintenances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenances_read_all" ON public.vehicle_maintenances FOR SELECT USING (true);
CREATE POLICY "maintenances_insert_all" ON public.vehicle_maintenances FOR INSERT WITH CHECK (true);
CREATE POLICY "maintenances_update_admin" ON public.vehicle_maintenances FOR UPDATE USING (public.is_admin_or_editor());
CREATE POLICY "maintenances_delete_admin" ON public.vehicle_maintenances FOR DELETE USING (public.is_admin_or_editor());

-- ============================================================
-- STORAGE BUCKET: vehicle_evidence
-- ============================================================
-- Supabase Storage içerisinde vehicle_evidence isimli public bucket oluşturur.
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle_evidence', 'vehicle_evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Mevcut storage objeleri politikalarını güvenlik için temizle (Idempotency)
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;

-- Storage RLS Politikaları
CREATE POLICY "Enable read access for all users" ON storage.objects FOR SELECT 
USING (bucket_id = 'vehicle_evidence');

CREATE POLICY "Enable insert for authenticated users only" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vehicle_evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON storage.objects FOR UPDATE 
USING (bucket_id = 'vehicle_evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON storage.objects FOR DELETE 
USING (bucket_id = 'vehicle_evidence' AND auth.role() = 'authenticated');

-- ============================================================
-- BİTİŞ
-- ============================================================
