-- ============================================================
-- SİVAS İTFAİYE — PERSONEL İK VE ZİMMET MODÜLÜ (HR & EQUIPMENT)
-- ============================================================

-- 1) RLS İÇİN YARDIMCI FONKSİYON
-- Geçerli kullanıcının Admin veya Amir (Editor) olup olmadığını kontrol eder
CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.personnel
    WHERE sicil_no = (auth.jwt() -> 'user_metadata' ->> 'sicil_no')
    AND rol IN ('Admin', 'Editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLO 1: personnel_details (Genişletilmiş Personel Bilgileri)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personnel_details (
  sicil_no TEXT PRIMARY KEY REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  kan_grubu TEXT,
  telefon TEXT,
  acil_durum_kisi_ad TEXT,
  acil_durum_kisi_telefon TEXT,
  adres TEXT,
  dogum_tarihi DATE,
  ise_baslama_tarihi DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_personnel_details_updated_at
  BEFORE UPDATE ON public.personnel_details 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.personnel_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_details_read_all" ON public.personnel_details FOR SELECT USING (true);
CREATE POLICY "personnel_details_write_admin" ON public.personnel_details FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- TABLO 2: personnel_leaves (İzin Takipleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personnel_leaves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no TEXT REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  izin_turu TEXT NOT NULL, -- Yıllık, Mazeret, Sağlık, Ücretsiz vs.
  baslangic_tarihi DATE NOT NULL,
  bitis_tarihi DATE NOT NULL,
  aciklama TEXT,
  belge_url TEXT,
  durum TEXT DEFAULT 'Beklemede' CHECK (durum IN ('Beklemede', 'Onaylandı', 'Reddedildi')),
  onaylayan_sicil TEXT REFERENCES public.personnel(sicil_no) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_personnel_leaves_updated_at
  BEFORE UPDATE ON public.personnel_leaves 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.personnel_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_leaves_read_all" ON public.personnel_leaves FOR SELECT USING (true);
CREATE POLICY "personnel_leaves_write_admin" ON public.personnel_leaves FOR ALL USING (public.is_admin_or_editor());
-- Not: Normal kullanıcıların kendi izinlerini talep edebilmesi istenirse özel INSERT politikası eklenebilir.

-- ============================================================
-- TABLO 3: personnel_records (Hizmet Dökümü, Ödül/Ceza)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personnel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no TEXT REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  kayit_turu TEXT NOT NULL, -- Ödül, Ceza, Terfi, Hizmet vb.
  tarih DATE NOT NULL DEFAULT CURRENT_DATE,
  aciklama TEXT NOT NULL,
  belge_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.personnel_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_records_read_all" ON public.personnel_records FOR SELECT USING (true);
CREATE POLICY "personnel_records_write_admin" ON public.personnel_records FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- TABLO 4: personnel_equipment (Zimmet Tablosu)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personnel_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no TEXT REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  ekipman_adi TEXT NOT NULL, -- Baret, Çizme, Yanmaz Elbise vb.
  seri_no TEXT, -- Ekipmanın seri numarası veya barkodu
  verilis_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
  miad_tarihi DATE, -- Son kullanma/değişim tarihi
  beden TEXT, -- Ayakkabı numarası, elbise bedeni vb.
  durum TEXT DEFAULT 'Aktif' CHECK (durum IN ('Aktif', 'İade', 'Yıpranmış', 'Zayi')),
  aciklama TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_personnel_equipment_updated_at
  BEFORE UPDATE ON public.personnel_equipment 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.personnel_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_equipment_read_all" ON public.personnel_equipment FOR SELECT USING (true);
CREATE POLICY "personnel_equipment_write_admin" ON public.personnel_equipment FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- TABLO 5: personnel_activities (Faaliyet / Eğitim / Spor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personnel_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no TEXT REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  faaliyet_turu TEXT NOT NULL, -- Spor, Eğitim, Operasyon, Nöbet vb.
  tarih DATE NOT NULL DEFAULT CURRENT_DATE,
  sure_dakika INT,
  aciklama TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.personnel_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_activities_read_all" ON public.personnel_activities FOR SELECT USING (true);
CREATE POLICY "personnel_activities_write_admin" ON public.personnel_activities FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- BİTİŞ
-- ============================================================
