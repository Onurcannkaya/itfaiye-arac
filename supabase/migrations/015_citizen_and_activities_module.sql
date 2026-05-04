-- ============================================================
-- SİVAS İTFAİYE — FAZ 3: VATANDAŞ HİZMETLERİ & EĞİTİM MODÜLÜ
-- ============================================================

-- ============================================================
-- TABLO 1: citizen_requests (Vatandaş Başvuruları)
-- ============================================================
DROP TABLE IF EXISTS public.personnel_activities CASCADE;
DROP TABLE IF EXISTS public.activities_and_trainings CASCADE;
DROP TABLE IF EXISTS public.citizen_requests CASCADE;

CREATE TABLE IF NOT EXISTS public.citizen_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  talep_turu TEXT NOT NULL, -- 'Baca Temizliği', 'İtfaiye Uygunluk Raporu'
  basvuru_tarihi TIMESTAMPTZ DEFAULT NOW(),
  basvuran_tc TEXT,
  basvuran_ad_soyad TEXT NOT NULL,
  irtibat_tel TEXT NOT NULL,
  adres TEXT NOT NULL,
  baca_detaylari JSONB DEFAULT '{}'::jsonb,
  isyeri_detaylari JSONB DEFAULT '{}'::jsonb,
  durum TEXT DEFAULT 'Bekliyor', -- 'Bekliyor', 'İnceleniyor', 'Onaylandı', 'Reddedildi'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_citizen_requests_updated_at
  BEFORE UPDATE ON public.citizen_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.citizen_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "citizen_requests_read_all" ON public.citizen_requests FOR SELECT USING (true);
CREATE POLICY "citizen_requests_insert_all" ON public.citizen_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "citizen_requests_update_admin" ON public.citizen_requests 
  FOR UPDATE USING (public.is_admin_or_editor());
CREATE POLICY "citizen_requests_delete_admin" ON public.citizen_requests 
  FOR DELETE USING (public.is_admin_or_editor());

-- ============================================================
-- TABLO 2: activities_and_trainings (Eğitim ve Faaliyetler)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities_and_trainings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faaliyet_turu TEXT NOT NULL, -- 'Eğitim', 'Ziyaret', 'Tatbikat'
  faaliyet_konusu TEXT NOT NULL,
  baslangic_tarihi TIMESTAMPTZ NOT NULL,
  bitis_tarihi TIMESTAMPTZ,
  toplam_sure_saat NUMERIC,
  katilimci_sayisi INT DEFAULT 0,
  hedef_kitle TEXT, -- Örn: "Lise Öğrencileri", "Fabrika Çalışanları"
  aciklama TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_activities_updated_at
  BEFORE UPDATE ON public.activities_and_trainings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.activities_and_trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_read_all" ON public.activities_and_trainings FOR SELECT USING (true);
CREATE POLICY "activities_insert_admin" ON public.activities_and_trainings FOR INSERT WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "activities_update_admin" ON public.activities_and_trainings FOR UPDATE USING (public.is_admin_or_editor());
CREATE POLICY "activities_delete_admin" ON public.activities_and_trainings FOR DELETE USING (public.is_admin_or_editor());

-- ============================================================
-- TABLO 3: personnel_activities (Personel - Faaliyet Pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personnel_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.activities_and_trainings(id) ON DELETE CASCADE,
  sicil_no TEXT REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  rol TEXT, -- 'Eğitmen', 'Katılımcı', 'Görevli'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, sicil_no)
);

-- RLS Policies
ALTER TABLE public.personnel_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_activities_read_all" ON public.personnel_activities FOR SELECT USING (true);
CREATE POLICY "personnel_activities_insert_admin" ON public.personnel_activities FOR INSERT WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "personnel_activities_update_delete_admin" ON public.personnel_activities FOR ALL USING (public.is_admin_or_editor());

-- ============================================================
-- BİTİŞ
-- ============================================================
