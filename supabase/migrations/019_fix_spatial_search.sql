-- ============================================================
-- SİVAS İTFAİYE — FAZ 5.1: SPATIAL SEARCH FIX & POLICIES
-- ============================================================

-- RLS'nin açık olduğundan emin olalım
ALTER TABLE public.spatial_addresses ENABLE ROW LEVEL SECURITY;

-- Eski policy varsa silelim (temiz bir başlangıç için)
DROP POLICY IF EXISTS "addresses_read_all" ON public.spatial_addresses;
DROP POLICY IF EXISTS "addresses_all_admin" ON public.spatial_addresses;

-- Herkesin (anon ve authenticated) tabloyu okuyabilmesi için SELECT policy
CREATE POLICY "addresses_read_all" ON public.spatial_addresses FOR SELECT USING (true);

-- Adminler için full erişim policy
CREATE POLICY "addresses_all_admin" ON public.spatial_addresses FOR ALL USING (public.is_admin_or_editor());

-- ÖNEMLİ: Tablo DROP edilip yeniden oluşturulduysa GRANT'ler silinmiş olabilir. 
-- anon ve authenticated rolleri için SELECT izni veriyoruz.
GRANT SELECT ON public.spatial_addresses TO anon, authenticated;

-- ============================================================
-- BİTİŞ
-- ============================================================

