-- ============================================================
-- Sivas İtfaiyesi — KOMPLE FIX + KULLANICI OLUŞTURMA
-- ============================================================
-- 008 trigger fix başarılı oldu. Şimdi personnel tablosunu
-- düzeltip kullanıcıları oluşturacağız.
-- ============================================================

-- 1) Önce personnel tablosunun mevcut yapısını kontrol et
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'personnel'
ORDER BY ordinal_position;

-- 2) Personnel tablosunu sil ve doğru yapıda yeniden oluştur
DROP TABLE IF EXISTS public.personnel CASCADE;

CREATE TABLE public.personnel (
  id uuid PRIMARY KEY,
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

-- NOT: FK constraint'i KALDIRILDI — bu sorunun kaynağıydı.
-- auth.users referansı uygulama seviyesinde kontrol edilecek.

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personnel_select" ON public.personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "personnel_insert" ON public.personnel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "personnel_update" ON public.personnel FOR UPDATE TO authenticated USING (true);


-- 3) Kullanıcı oluşturma fonksiyonu (FK constraint olmadan)
CREATE OR REPLACE FUNCTION create_itfaiye_user(
  p_sicil varchar,
  p_ad varchar,
  p_soyad varchar,
  p_unvan varchar,
  p_rol varchar
) RETURNS text AS $$
DECLARE
  new_user_id uuid;
  user_email text;
BEGIN
  user_email := lower(p_sicil) || '@itfaiye.local';
  
  -- Auth kullanıcısı zaten var mı?
  SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;
  
  IF new_user_id IS NULL THEN
    new_user_id := gen_random_uuid();
    
    -- auth.users'a ekle
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, 
      encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt('1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('sicil_no', p_sicil, 'ad', p_ad, 'soyad', p_soyad),
      now(),
      now(),
      '', ''
    );

    -- auth.identities'e ekle
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', user_email),
      'email',
      new_user_id::text,
      now(), now(), now()
    );
  END IF;

  -- personnel tablosuna ekle
  INSERT INTO public.personnel (id, sicil_no, ad, soyad, unvan, rol, aktif, view_only, can_approve, can_print)
  VALUES (
    new_user_id, p_sicil, p_ad, p_soyad, p_unvan, p_rol, true,
    (p_rol = 'User'),
    (p_rol IN ('Shift_Leader', 'Admin')),
    (p_rol != 'User')
  )
  ON CONFLICT (sicil_no) DO UPDATE SET
    id = EXCLUDED.id,
    ad = EXCLUDED.ad,
    soyad = EXCLUDED.soyad,
    unvan = EXCLUDED.unvan,
    rol = EXCLUDED.rol,
    aktif = true;

  RETURN p_sicil || ' OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4) 30 KULLANICI OLUŞTUR
SELECT create_itfaiye_user('SB5801', 'Mustafa', 'Köse', 'İtfaiye Amiri', 'Admin');
SELECT create_itfaiye_user('SB5802', 'Onurcan', 'Kaya', 'İtfaiye Çavuşu', 'Shift_Leader');
SELECT create_itfaiye_user('SB5803', 'Melih', 'Arslan', 'İtfaiye Çavuşu', 'Shift_Leader');
SELECT create_itfaiye_user('SB5804', 'Selahattin', 'Tosun', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5805', 'Hüseyin', 'Demir', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5806', 'Ali', 'Yılmaz', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5807', 'Mehmet', 'Öztürk', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5808', 'Ahmet', 'Çelik', 'Şoför', 'User');
SELECT create_itfaiye_user('SB5809', 'İbrahim', 'Kara', 'Şoför', 'User');
SELECT create_itfaiye_user('SB5810', 'Fatih', 'Aydın', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5811', 'Emre', 'Şahin', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5812', 'Burak', 'Koç', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5813', 'Okan', 'Erdoğan', 'İtfaiye Çavuşu', 'Shift_Leader');
SELECT create_itfaiye_user('SB5814', 'Serkan', 'Güneş', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5815', 'Murat', 'Aktaş', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5816', 'Kemal', 'Yıldız', 'Şoför', 'User');
SELECT create_itfaiye_user('SB5817', 'Tuncay', 'Aslan', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5818', 'Volkan', 'Kurt', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5819', 'Hakan', 'Özdemir', 'İtfaiye Amiri', 'Admin');
SELECT create_itfaiye_user('SB5820', 'Cengiz', 'Polat', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5821', 'Yusuf', 'Taş', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5822', 'Kadir', 'Çetin', 'Şoför', 'User');
SELECT create_itfaiye_user('SB5823', 'Erdem', 'Kılıç', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5824', 'Cem', 'Aksoy', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5825', 'Barış', 'Doğan', 'İtfaiye Çavuşu', 'Shift_Leader');
SELECT create_itfaiye_user('SB5826', 'Sinan', 'Yalçın', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5827', 'Tolga', 'Korkmaz', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5828', 'Uğur', 'Sarı', 'İtfaiye Eri', 'User');
SELECT create_itfaiye_user('SB5829', 'Gökhan', 'Bal', 'Şoför', 'User');
SELECT create_itfaiye_user('SB5830', 'Yasin', 'Tunç', 'İtfaiye Eri', 'User');


-- 5) Temizlik
DROP FUNCTION IF EXISTS create_itfaiye_user(varchar, varchar, varchar, varchar, varchar);

-- 6) Doğrulama
SELECT 
  (SELECT count(*) FROM auth.users WHERE email LIKE '%@itfaiye.local') AS auth_kullanici_sayisi,
  (SELECT count(*) FROM public.personnel) AS personel_sayisi;
