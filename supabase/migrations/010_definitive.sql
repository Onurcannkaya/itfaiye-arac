-- ============================================================
-- SİVAS İTFAİYE — KESİN ÇÖZÜM (Tek SQL - Her Şey Dahil)
-- ============================================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın.
-- Sırasıyla: trigger temizliği → tablo düzeltme → auth user → personnel
-- ============================================================

-- ═══════ ADIM 1: TRIGGER TEMİZLİĞİ ═══════
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile() CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS item_status CASCADE;

-- ═══════ ADIM 2: MEVCUT auth.users TEMİZLE ═══════
DELETE FROM auth.users WHERE email LIKE '%@itfaiye.local';

-- ═══════ ADIM 3: PERSONNEL TABLOSU ═══════
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.personnel CASCADE;

CREATE TABLE public.personnel (
  sicil_no TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  soyad TEXT NOT NULL,
  unvan TEXT NOT NULL DEFAULT 'İtfaiye Eri',
  rol TEXT NOT NULL DEFAULT 'User' CHECK (rol IN ('Admin', 'Editor', 'Shift_Leader', 'User')),
  posta TEXT DEFAULT '',
  view_only BOOLEAN DEFAULT true,
  can_approve BOOLEAN DEFAULT false,
  can_print BOOLEAN DEFAULT false,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_personnel_updated_at
  BEFORE UPDATE ON personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_read_all" ON personnel FOR SELECT USING (true);
CREATE POLICY "personnel_insert" ON personnel FOR INSERT WITH CHECK (true);
CREATE POLICY "personnel_update" ON personnel FOR UPDATE USING (true);
CREATE POLICY "personnel_delete" ON personnel FOR DELETE USING (true);

-- ═══════ ADIM 4: TASKS TABLOSU ═══════
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaka TEXT NOT NULL,
  tip TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]',
  durum TEXT NOT NULL DEFAULT 'beklemede',
  notlar TEXT,
  atanan TEXT NOT NULL,
  tarih DATE DEFAULT CURRENT_DATE,
  tamamlanma_tarihi TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_read_all" ON tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (true);

-- ═══════ ADIM 5: AUDIT LOGS ═══════
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaka TEXT,
  bolme_key TEXT,
  tip TEXT DEFAULT 'sayim',
  sonuclar JSONB DEFAULT '[]',
  yapan TEXT,
  notlar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_read_all" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- ═══════ ADIM 6: AUTH_LOGS ═══════
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no TEXT,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read auth_logs" ON public.auth_logs;
DROP POLICY IF EXISTS "Authenticated users can insert auth_logs" ON public.auth_logs;
DROP POLICY IF EXISTS "Auth logs read for authenticated" ON public.auth_logs;
DROP POLICY IF EXISTS "Auth logs insert for authenticated" ON public.auth_logs;
CREATE POLICY "auth_logs_read" ON public.auth_logs FOR SELECT USING (true);
CREATE POLICY "auth_logs_insert" ON public.auth_logs FOR INSERT WITH CHECK (true);

-- ═══════ ADIM 7: PERSONEL VERİLERİ ═══════
INSERT INTO personnel (sicil_no, ad, soyad, unvan, rol, view_only, can_approve, can_print) VALUES
  ('SB5801', 'İbrahim', 'Alaçam', 'Müdür', 'Admin', false, true, true),
  ('SB5802', 'Seyfi Ali', 'Gül', 'Amir', 'Editor', false, true, true),
  ('SB5803', 'Ahmet', 'Çelimli', 'Amir', 'Editor', false, true, true),
  ('SB5804', 'Ahmet', 'Yıldız', 'Amir', 'Editor', false, true, true),
  ('SB5805', 'Hidayet', 'Yücekaya', 'Başçavuş', 'Shift_Leader', false, true, false),
  ('SB5806', 'Ömer', 'Çakmak', 'Çavuş', 'Shift_Leader', false, true, false),
  ('SB5807', 'Abdullah Übeyde', 'Özkur', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5808', 'Beyza', 'Durak', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5809', 'Beyza', 'Kılıç', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5810', 'Elif', 'Tunçer', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5811', 'Emir Furkan', 'Taşdelen', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5812', 'Fatih', 'Güler', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5813', 'Fatmanur', 'Kişi', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5814', 'Gülenay', 'Koçak', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5815', 'Hasan Çınar', 'Kuzu', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5816', 'İsmail', 'Aslan', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5817', 'Kadir', 'Kuru', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5818', 'Melih', 'Arslan', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5819', 'Muhammed Emin', 'Kara', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5820', 'Muhammed Enes', 'Yıldırım', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5821', 'Muhammed', 'Kara', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5822', 'Muhammed Yasir', 'İnce', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5823', 'Mustafa', 'Demir', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5824', 'Mustafa', 'Köse', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5825', 'Mustafa Metin', 'Bıçakcigil', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5826', 'Onurcan', 'Kaya', 'İtfaiye Eri / Geliştirici', 'Admin', false, true, true),
  ('SB5827', 'Selahattin', 'Tosun', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5828', 'Sencer', 'Yıldız', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5829', 'Uğur', 'Budak', 'İtfaiye Eri', 'User', true, false, false),
  ('SB5830', 'Yağmur', 'Aydın', 'İtfaiye Eri', 'User', true, false, false);


-- ═══════ ADIM 8: AUTH KULLANICILARI OLUŞTUR ═══════
DO $$
DECLARE
  p RECORD;
  new_id uuid;
  user_email text;
BEGIN
  FOR p IN SELECT sicil_no FROM public.personnel LOOP
    user_email := lower(p.sicil_no) || '@itfaiye.local';
    new_id := gen_random_uuid();
    
    -- auth.users'a ekle
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, 
      encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt('1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('sicil_no', p.sicil_no),
      now(), now(), '', ''
    );

    -- auth.identities'e ekle
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_id,
      jsonb_build_object('sub', new_id::text, 'email', user_email),
      'email',
      new_id::text,
      now(), now(), now()
    );
    
    RAISE NOTICE 'Oluşturuldu: % -> %', p.sicil_no, user_email;
  END LOOP;
END $$;


-- ═══════ DOĞRULAMA ═══════
SELECT 
  (SELECT count(*) FROM auth.users WHERE email LIKE '%@itfaiye.local') AS auth_kullanici,
  (SELECT count(*) FROM public.personnel) AS personel;
