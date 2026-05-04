-- ============================================================
-- SİVAS İTFAİYE — VAKA / OLAY RAPORLAMA MODÜLÜ
-- ============================================================

-- ============================================================
-- TABLO 1: incidents (Ana Olay Kayıt Tablosu)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  olay_turu TEXT NOT NULL, -- Yangın, Trafik Kazası, Kurtarma, Su Baskını, Diğer
  ihbar_saati TIMESTAMPTZ,
  cikis_saati TIMESTAMPTZ,
  varis_saati TIMESTAMPTZ,
  donus_saati TIMESTAMPTZ,
  mahalle TEXT,
  adres TEXT,
  aciklama TEXT,
  kullanilan_su_ton NUMERIC DEFAULT 0,
  kullanilan_kopuk_litre NUMERIC DEFAULT 0,
  kullanilan_kkt_kg NUMERIC DEFAULT 0,
  hasar_durumu TEXT, -- Örn: "Maddi Hasarlı", "Yaralanmalı", "Can Kayıplı"
  raporlayan_sicil TEXT REFERENCES public.personnel(sicil_no) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_incidents_updated_at
  BEFORE UPDATE ON public.incidents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Okuma (Herkes okuyabilir)
CREATE POLICY "incidents_read_all" ON public.incidents FOR SELECT USING (true);

-- Ekleme (Herkes ekleyebilir, çünkü herhangi bir personel rapor girebilir)
CREATE POLICY "incidents_insert_all" ON public.incidents FOR INSERT WITH CHECK (true);

-- Güncelleme/Silme (Admin, Editor veya raporu giren kişi)
CREATE POLICY "incidents_update_admin_or_owner" ON public.incidents 
  FOR UPDATE USING (
    raporlayan_sicil = (auth.jwt() -> 'user_metadata' ->> 'sicil_no') OR
    public.is_admin_or_editor()
  );

CREATE POLICY "incidents_delete_admin" ON public.incidents 
  FOR DELETE USING (public.is_admin_or_editor());


-- ============================================================
-- TABLO 2: incident_vehicles (Olay - Araç Pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  plaka VARCHAR(15) REFERENCES public.vehicles(plaka) ON DELETE CASCADE,
  gorev_turu TEXT, -- İlk Müdahale, Destek, Su İkmali vb.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pivot tabloları üzerinde unique constraint (Aynı aracı aynı olaya 2 kez eklememek için)
ALTER TABLE public.incident_vehicles ADD CONSTRAINT unique_incident_vehicle UNIQUE (incident_id, plaka);

-- RLS
ALTER TABLE public.incident_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incident_vehicles_read_all" ON public.incident_vehicles FOR SELECT USING (true);
CREATE POLICY "incident_vehicles_insert_all" ON public.incident_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "incident_vehicles_update_delete" ON public.incident_vehicles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.incidents i 
    WHERE i.id = incident_id 
    AND (i.raporlayan_sicil = (auth.jwt() -> 'user_metadata' ->> 'sicil_no') OR public.is_admin_or_editor())
  )
);


-- ============================================================
-- TABLO 3: incident_personnel (Olay - Personel Pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_personnel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  sicil_no TEXT REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  gorev TEXT, -- Şoför, Ekip Amiri, Müdahale Personeli vb.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pivot tablosu üzerinde unique constraint (Aynı personeli aynı olaya 2 kez eklememek için)
ALTER TABLE public.incident_personnel ADD CONSTRAINT unique_incident_personnel UNIQUE (incident_id, sicil_no);

-- RLS
ALTER TABLE public.incident_personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incident_personnel_read_all" ON public.incident_personnel FOR SELECT USING (true);
CREATE POLICY "incident_personnel_insert_all" ON public.incident_personnel FOR INSERT WITH CHECK (true);
CREATE POLICY "incident_personnel_update_delete" ON public.incident_personnel FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.incidents i 
    WHERE i.id = incident_id 
    AND (i.raporlayan_sicil = (auth.jwt() -> 'user_metadata' ->> 'sicil_no') OR public.is_admin_or_editor())
  )
);

-- ============================================================
-- BİTİŞ
-- ============================================================
