-- ============================================================
-- SİVAS İTFAİYE — FAZ 5: AKILLI ŞEHİR VE CBS (GIS) MODÜLÜ
-- ============================================================

-- 1. PostGIS Eklentisinin Aktif Edilmesi
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Mevcut Olaylar (incidents) Tablosuna Mekansal Konum (Location) Sütunu Eklenmesi
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);

-- 3. Yangın Hidrantları Tablosunun Oluşturulması
DROP TABLE IF EXISTS public.fire_hydrants CASCADE;

CREATE TABLE IF NOT EXISTS public.fire_hydrants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no TEXT,
  tip TEXT DEFAULT 'Yer üstü', -- 'Yer altı', 'Yer üstü'
  durum TEXT DEFAULT 'Aktif', -- 'Aktif', 'Arızalı', 'Bakımda'
  location geometry(Point, 4326),
  mahalle TEXT,
  adres TEXT,
  basinc_degeri NUMERIC,
  son_bakim_tarihi TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_fire_hydrants_updated_at
  BEFORE UPDATE ON public.fire_hydrants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.fire_hydrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hydrants_read_all" ON public.fire_hydrants 
  FOR SELECT USING (true);

CREATE POLICY "hydrants_insert_admin" ON public.fire_hydrants 
  FOR INSERT WITH CHECK (public.is_admin_or_editor());

CREATE POLICY "hydrants_update_admin" ON public.fire_hydrants 
  FOR UPDATE USING (public.is_admin_or_editor());

CREATE POLICY "hydrants_delete_admin" ON public.fire_hydrants 
  FOR DELETE USING (public.is_admin_or_editor());

-- ============================================================
-- BİTİŞ
-- ============================================================
