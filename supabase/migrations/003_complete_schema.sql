-- ============================================================
-- Sivas İtfaiyesi — Migration #003
-- Tam Şema ve JSONB Model Güncellemeleri
-- ============================================================
-- 
-- ÖNEMLİ: Bu SQL'i Supabase Dashboard → SQL Editor üzerinden çalıştırın.
-- Bu migration:
-- 1. vehicles tablosunu uygulamaya uygun hale getirir
-- 2. personnel tablosunu oluşturur (auth.users ile bağlantılı)
-- 3. tasks, maintenance_logs ve fuel_logs tablolarını oluşturur
-- ============================================================

-- ─────────────────────────────────────────────
-- 1) VEHICLES Tablosu Güncellemesi
-- ─────────────────────────────────────────────
-- Eski yapıdan yeni jsonb+durum yapısına geçiş
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS km integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motorSaatiPTO integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS durum varchar(20) DEFAULT 'aktif',
  ADD COLUMN IF NOT EXISTS sigortaBitis date,
  ADD COLUMN IF NOT EXISTS muayeneBitis date,
  ADD COLUMN IF NOT EXISTS bolmeler jsonb DEFAULT '{}'::jsonb;

-- (İsteğe bağlı) Eski compartments/inventory_items tabloları
-- jsonb yapısı kullanıldığı için kullanılmıyorsa Drop edilebilir.
-- DROP TABLE IF EXISTS public.inventory_items CASCADE;
-- DROP TABLE IF EXISTS public.compartments CASCADE;

-- ─────────────────────────────────────────────
-- 2) PERSONNEL Tablosu
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personnel (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sicil_no varchar(20) UNIQUE NOT NULL,
  ad varchar(50) NOT NULL,
  soyad varchar(50) NOT NULL,
  unvan varchar(100) NOT NULL,
  rol varchar(20) NOT NULL DEFAULT 'User',
  posta varchar(50),
  view_only boolean DEFAULT true,
  can_approve boolean DEFAULT false,
  can_print boolean DEFAULT false,
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON public.personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.personnel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.personnel FOR UPDATE TO authenticated USING (true);


-- ─────────────────────────────────────────────
-- 3) MAINTENANCE_LOGS Tablosu (Bakım Kayıtları)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  tip varchar(50) NOT NULL, -- 'periyodik', 'ariza', 'revizyon' vb.
  kmAt integer DEFAULT 0,
  ptoAt integer DEFAULT 0,
  aciklama text NOT NULL,
  maliyet numeric(10, 2) DEFAULT 0,
  tarih date NOT NULL,
  yapanKisi varchar(100) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON public.maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.maintenance_logs FOR UPDATE TO authenticated USING (true);


-- ─────────────────────────────────────────────
-- 4) FUEL_LOGS Tablosu (Yakıt Kayıtları)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  litre numeric(10, 2) NOT NULL,
  tutar numeric(10, 2) NOT NULL,
  kmAt integer NOT NULL,
  istasyon varchar(100) NOT NULL,
  tarih date NOT NULL,
  kayitEden varchar(100) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON public.fuel_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.fuel_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.fuel_logs FOR UPDATE TO authenticated USING (true);


-- ─────────────────────────────────────────────
-- 5) TASKS Tablosu (Görev Yönetimi)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  tip varchar(50) NOT NULL, -- 'gunluk_kontrol', 'envanter_sayim', 'devir_teslim' vb.
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{label: string, checked: boolean}]
  durum varchar(20) NOT NULL DEFAULT 'bekliyor', -- 'bekliyor', 'devam_ediyor', 'tamamlandi'
  atanan varchar(100) NOT NULL,
  tarih date NOT NULL,
  tamamlanmaTarihi timestamptz,
  notlar text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.tasks FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- Tamamlandı! Tablolar güncellendi/oluşturuldu.
-- ============================================================
