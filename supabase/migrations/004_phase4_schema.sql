-- ============================================================
-- Sivas İtfaiyesi — Migration #004
-- Faz 4: Dinamik Görev Şablonları ve SCBA Takip Modülü
-- ============================================================

-- ─────────────────────────────────────────────
-- 1) DİNAMİK GÖREV ŞABLONLARI TABLOSU
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik varchar(100) NOT NULL,
  tip varchar(50) NOT NULL,
  periyot varchar(20) NOT NULL,
  hedef_araclar jsonb DEFAULT '[]'::jsonb, 
  sorular jsonb NOT NULL,
  olusturan_sicil varchar(20) REFERENCES public.personnel(sicil_no) ON DELETE SET NULL,
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tüm personeller görev şablonlarını görebilir"
  ON public.task_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Yetkililer görev şablonlarını yönetebilir"
  ON public.task_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 2) SCBA TÜPLERİ TABLOSU
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scba_cylinders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seri_no varchar(50) UNIQUE NOT NULL,
  marka varchar(50) NOT NULL,
  kapasite_lt numeric NOT NULL,
  basinc_bar integer NOT NULL,
  uretim_tarihi date,
  son_hidrostatik_test date NOT NULL,
  sonraki_test_tarihi date NOT NULL,
  durum varchar(20) DEFAULT 'aktif', 
  guncel_basinc integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scba_cylinders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tüm personeller SCBA tüplerini görebilir"
  ON public.scba_cylinders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Yetkililer SCBA tüplerini yönetebilir"
  ON public.scba_cylinders FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 3) SCBA DOLUM LOGLARI TABLOSU
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scba_fill_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cylinder_id uuid REFERENCES public.scba_cylinders(id) ON DELETE CASCADE,
  dolduran_sicil varchar(20) REFERENCES public.personnel(sicil_no) ON DELETE SET NULL,
  basilan_bar integer NOT NULL,
  tarih timestamptz DEFAULT now(),
  notlar text
);

ALTER TABLE public.scba_fill_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tüm personeller SCBA dolum loglarını görebilir"
  ON public.scba_fill_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tüm personeller SCBA dolum kaydı girebilir"
  ON public.scba_fill_logs FOR INSERT TO authenticated WITH CHECK (true);
