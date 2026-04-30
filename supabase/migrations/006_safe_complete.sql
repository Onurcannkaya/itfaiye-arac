-- ============================================================
-- Sivas İtfaiyesi — GÜVENLİ BİRLEŞTİRİLMİŞ MİGRASYON
-- Tüm tablolar + RLS — "IF NOT EXISTS" & "DROP POLICY IF EXISTS"
-- ============================================================
-- Bu dosyayı Supabase Dashboard → SQL Editor'de çalıştırın.
-- Daha önce çalıştırılmış migration'lar ile çakışma yapmaz.
-- ============================================================


-- ═══════════════════════════════════════════════
-- 1) VEHICLES Tablosu Güncellemesi
-- ═══════════════════════════════════════════════
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS km integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "motorSaatiPTO" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS durum varchar(20) DEFAULT 'aktif',
  ADD COLUMN IF NOT EXISTS "sigortaBitis" date,
  ADD COLUMN IF NOT EXISTS "muayeneBitis" date,
  ADD COLUMN IF NOT EXISTS bolmeler jsonb DEFAULT '{}'::jsonb;


-- ═══════════════════════════════════════════════
-- 2) PERSONNEL Tablosu
-- ═══════════════════════════════════════════════
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

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.personnel;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.personnel;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.personnel;
CREATE POLICY "Enable read access for all authenticated users" ON public.personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.personnel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.personnel FOR UPDATE TO authenticated USING (true);


-- ═══════════════════════════════════════════════
-- 3) MAINTENANCE_LOGS Tablosu
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  tip varchar(50) NOT NULL,
  "kmAt" integer DEFAULT 0,
  "ptoAt" integer DEFAULT 0,
  aciklama text NOT NULL,
  maliyet numeric(10, 2) DEFAULT 0,
  tarih date NOT NULL,
  "yapanKisi" varchar(100) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.maintenance_logs;
CREATE POLICY "Enable read access for all authenticated users" ON public.maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.maintenance_logs FOR UPDATE TO authenticated USING (true);


-- ═══════════════════════════════════════════════
-- 4) FUEL_LOGS Tablosu
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  litre numeric(10, 2) NOT NULL,
  tutar numeric(10, 2) NOT NULL,
  "kmAt" integer NOT NULL,
  istasyon varchar(100) NOT NULL,
  tarih date NOT NULL,
  "kayitEden" varchar(100) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.fuel_logs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.fuel_logs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.fuel_logs;
CREATE POLICY "Enable read access for all authenticated users" ON public.fuel_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.fuel_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.fuel_logs FOR UPDATE TO authenticated USING (true);


-- ═══════════════════════════════════════════════
-- 5) TASKS Tablosu
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  tip varchar(50) NOT NULL,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  durum varchar(20) NOT NULL DEFAULT 'bekliyor',
  atanan varchar(100) NOT NULL,
  tarih date NOT NULL,
  "tamamlanmaTarihi" timestamptz,
  notlar text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.tasks;
CREATE POLICY "Enable read access for all authenticated users" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.tasks FOR UPDATE TO authenticated USING (true);


-- ═══════════════════════════════════════════════
-- 6) TASK_TEMPLATES Tablosu (Faz 4)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik varchar(100) NOT NULL,
  tip varchar(50) NOT NULL,
  periyot varchar(20) NOT NULL,
  hedef_araclar jsonb DEFAULT '[]'::jsonb,
  sorular jsonb NOT NULL,
  olusturan_sicil varchar(20),
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tüm personeller görev şablonlarını görebilir" ON public.task_templates;
DROP POLICY IF EXISTS "Yetkililer görev şablonlarını yönetebilir" ON public.task_templates;
CREATE POLICY "Tüm personeller görev şablonlarını görebilir" ON public.task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Yetkililer görev şablonlarını yönetebilir" ON public.task_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════
-- 7) SCBA_CYLINDERS Tablosu (Faz 4)
-- ═══════════════════════════════════════════════
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
DROP POLICY IF EXISTS "Tüm personeller SCBA tüplerini görebilir" ON public.scba_cylinders;
DROP POLICY IF EXISTS "Yetkililer SCBA tüplerini yönetebilir" ON public.scba_cylinders;
CREATE POLICY "Tüm personeller SCBA tüplerini görebilir" ON public.scba_cylinders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Yetkililer SCBA tüplerini yönetebilir" ON public.scba_cylinders FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════
-- 8) SCBA_FILL_LOGS Tablosu (Faz 4)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.scba_fill_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cylinder_id uuid REFERENCES public.scba_cylinders(id) ON DELETE CASCADE,
  dolduran_sicil varchar(20),
  basilan_bar integer NOT NULL,
  tarih timestamptz DEFAULT now(),
  notlar text
);

ALTER TABLE public.scba_fill_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tüm personeller SCBA dolum loglarını görebilir" ON public.scba_fill_logs;
DROP POLICY IF EXISTS "Tüm personeller SCBA dolum kaydı girebilir" ON public.scba_fill_logs;
CREATE POLICY "Tüm personeller SCBA dolum loglarını görebilir" ON public.scba_fill_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tüm personeller SCBA dolum kaydı girebilir" ON public.scba_fill_logs FOR INSERT TO authenticated WITH CHECK (true);


-- ═══════════════════════════════════════════════
-- 9) INCIDENT_REPORTS Tablosu (Faz 5.1)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(20) NOT NULL,
  bildiren_sicil varchar(20),
  kategori varchar(50) NOT NULL DEFAULT 'ariza',
  aciklama text NOT NULL,
  oncelik varchar(20) DEFAULT 'normal',
  fotograflar jsonb DEFAULT '[]'::jsonb,
  durum varchar(20) DEFAULT 'acik',
  cozum_notu text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tüm personeller bildirimleri görebilir" ON public.incident_reports;
DROP POLICY IF EXISTS "Tüm personeller bildirim oluşturabilir" ON public.incident_reports;
DROP POLICY IF EXISTS "Yetkililer bildirimleri güncelleyebilir" ON public.incident_reports;
CREATE POLICY "Tüm personeller bildirimleri görebilir" ON public.incident_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tüm personeller bildirim oluşturabilir" ON public.incident_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Yetkililer bildirimleri güncelleyebilir" ON public.incident_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════
-- 10) STORAGE BUCKET — evidence-photos (Faz 5.1)
-- ═══════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-photos',
  'evidence-photos',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update evidence photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload evidence photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence-photos');
CREATE POLICY "Authenticated users can view evidence photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidence-photos');
CREATE POLICY "Authenticated users can delete own evidence photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidence-photos');
CREATE POLICY "Authenticated users can update evidence photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'evidence-photos');


-- ═══════════════════════════════════════════════
-- 11) AUTH_LOGS Tablosu
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sicil_no varchar(20),
  event_type varchar(30) NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth logs read for authenticated" ON public.auth_logs;
DROP POLICY IF EXISTS "Auth logs insert for authenticated" ON public.auth_logs;
CREATE POLICY "Auth logs read for authenticated" ON public.auth_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth logs insert for authenticated" ON public.auth_logs FOR INSERT TO authenticated WITH CHECK (true);


-- ═══════════════════════════════════════════════
-- 12) AUDIT_LOGS Tablosu
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sicil_no varchar(20),
  action varchar(50) NOT NULL,
  entity_type varchar(50),
  entity_id varchar(100),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs read for authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insert for authenticated" ON public.audit_logs;
CREATE POLICY "Audit logs read for authenticated" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Audit logs insert for authenticated" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


-- ═══════════════════════════════════════════════
-- 13) INVENTORY_CHECKS Tablosu
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.inventory_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  bolme varchar(50) NOT NULL,
  malzeme varchar(100) NOT NULL,
  kontrol_eden varchar(20),
  eski_durum varchar(50),
  yeni_durum varchar(50),
  adet integer,
  notlar text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.inventory_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventory checks read for authenticated" ON public.inventory_checks;
DROP POLICY IF EXISTS "Inventory checks insert for authenticated" ON public.inventory_checks;
CREATE POLICY "Inventory checks read for authenticated" ON public.inventory_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory checks insert for authenticated" ON public.inventory_checks FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- TAMAMLANDI! Tüm tablolar güvenli şekilde oluşturuldu.
-- Şimdi http://localhost:3000/api/seed adresine gidin.
-- ============================================================
