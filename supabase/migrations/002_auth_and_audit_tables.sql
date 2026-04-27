-- ============================================================
-- Sivas İtfaiyesi — Migration #002
-- Auth Logları, Envanter Sayım Kayıtları ve Audit Trail
-- ============================================================
-- 
-- ÖNEMLİ: Bu SQL'i Supabase Dashboard → SQL Editor üzerinden
-- çalıştırın. Üç yeni tablo oluşturur.
--
-- NOT: RLS politikaları 'authenticated' rolü gerektirir.
-- Uygulama API route'ları service_role key ile yazdığı için
-- RLS bypass edilir. .env dosyasına SUPABASE_SERVICE_ROLE_KEY
-- eklemeniz gerekmektedir.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1) AUTH_LOGS — Giriş / Çıkış / Başarısız Deneme
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sicil_no varchar(20) NOT NULL,
  event_type varchar(20) NOT NULL CHECK (event_type IN ('login_success', 'login_failed', 'logout')),
  ip_address inet,
  user_agent text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Index: Sicil bazlı sorgular için
CREATE INDEX IF NOT EXISTS idx_auth_logs_sicil ON public.auth_logs (sicil_no);
-- Index: Tarih bazlı sorgular için
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON public.auth_logs (created_at DESC);
-- Index: Olay tipi bazlı sorgular için
CREATE INDEX IF NOT EXISTS idx_auth_logs_event ON public.auth_logs (event_type);

-- RLS
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read auth_logs"
  ON public.auth_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert auth_logs"
  ON public.auth_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 2) INVENTORY_CHECKS — Envanter Sayım Kayıtları
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) NOT NULL,
  compartment_key varchar(50) NOT NULL,
  checked_by varchar(20) NOT NULL,
  checked_by_name varchar(100) NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index: Araç + bölme bazlı sorgular (AuditTimeline)
CREATE INDEX IF NOT EXISTS idx_inv_checks_plaka_comp 
  ON public.inventory_checks (plaka, compartment_key);
-- Index: Tarih bazlı sıralama
CREATE INDEX IF NOT EXISTS idx_inv_checks_created 
  ON public.inventory_checks (created_at DESC);

-- RLS
ALTER TABLE public.inventory_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory_checks"
  ON public.inventory_checks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory_checks"
  ON public.inventory_checks FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 3) AUDIT_LOGS — Genel İşlem Kayıtları
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type varchar(50) NOT NULL,
  actor_sicil_no varchar(20) NOT NULL,
  actor_name varchar(100) NOT NULL,
  target varchar(200),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- action_type değerleri:
-- 'inventory_check'      → Bölme sayımı yapıldı
-- 'inventory_update'     → Envanter yönetiminden kayıt güncellendi
-- 'personnel_add'        → Yeni personel eklendi
-- 'permission_change'    → Personel yetkisi değiştirildi
-- 'task_create'          → Yeni görev oluşturuldu
-- 'login_success'        → Başarılı giriş
-- 'login_failed'         → Başarısız giriş denemesi
-- 'logout'               → Çıkış yapıldı

-- Index: İşlem tipi bazlı sorgular
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
  ON public.audit_logs (action_type);
-- Index: Aktör bazlı sorgular
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor 
  ON public.audit_logs (actor_sicil_no);
-- Index: Tarih bazlı sıralama
CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
  ON public.audit_logs (created_at DESC);
-- Index: Hedef bazlı sorgular
CREATE INDEX IF NOT EXISTS idx_audit_logs_target 
  ON public.audit_logs (target);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Tamamlandı! 3 tablo oluşturuldu:
--   ✓ auth_logs        (giriş/çıkış kayıtları)
--   ✓ inventory_checks (envanter sayım sonuçları)
--   ✓ audit_logs       (genel işlem logları)
-- 
-- Sonraki Adım: .env dosyanıza SUPABASE_SERVICE_ROLE_KEY
-- değişkenini ekleyin. Bu key Supabase Dashboard → Settings
-- → API → service_role key altında bulunur.
-- ============================================================
