-- ============================================================
-- SİVAS İTFAİYE — FAZ 5.1: GIS ARAMA MOTORU VE LOKAL ADRES TABLOSU
-- ============================================================

DROP TABLE IF EXISTS public.spatial_addresses CASCADE;

-- 1. Lokal CBS Adresleri Tablosu
CREATE TABLE IF NOT EXISTS public.spatial_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  abs_mahalle_adi TEXT NOT NULL, -- Mahalle adı
  adi TEXT, -- Sokak, Cadde, Bulvar, Ada/Parsel veya POI adı
  location geometry(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_spatial_addresses_updated_at
  BEFORE UPDATE ON public.spatial_addresses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Hızlı Arama (Search Engine) için İndeksler (B-Tree ve GIN)
-- B-Tree index for exact or prefix matches
CREATE INDEX idx_spatial_addresses_mahalle ON public.spatial_addresses (abs_mahalle_adi);
CREATE INDEX idx_spatial_addresses_adi ON public.spatial_addresses (adi);

-- pg_trgm eklentisi ILIKE (Fuzzy Search) aramaları çok hızlandırır
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_spatial_addresses_mahalle_trgm ON public.spatial_addresses USING GIN (abs_mahalle_adi gin_trgm_ops);
CREATE INDEX idx_spatial_addresses_adi_trgm ON public.spatial_addresses USING GIN (adi gin_trgm_ops);

-- RLS Policies
ALTER TABLE public.spatial_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_read_all" ON public.spatial_addresses FOR SELECT USING (true);
CREATE POLICY "addresses_all_admin" ON public.spatial_addresses FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- BİTİŞ
-- ============================================================
