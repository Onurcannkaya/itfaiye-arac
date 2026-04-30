-- ============================================================
-- ACİL FIX: auth.users üzerindeki sorunlu trigger'ları bul ve kaldır
-- ============================================================

-- 1) auth.users üzerindeki TÜM trigger'ları listele
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- 2) Bilinen sorunlu trigger'ları kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;

-- 3) Bilinen sorunlu fonksiyonları kaldır
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;

-- 4) public.users tablosunu tamamen kaldır (artık personnel tablosu kullanılıyor)
DROP TABLE IF EXISTS public.users CASCADE;

-- 5) Eski enum'ları kaldır (001'den kalan)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS item_status CASCADE;

-- 6) TEST: Şimdi bir kullanıcı oluşturmayı dene
-- Eğer yukarıdakiler sorunu çözdüyse bu başarılı olacak
INSERT INTO auth.users (
  instance_id, id, aud, role, email, 
  encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test_trigger_fix@itfaiye.local',
  crypt('test1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '', ''
)
ON CONFLICT DO NOTHING;

-- 7) Test kullanıcısını sil
DELETE FROM auth.users WHERE email = 'test_trigger_fix@itfaiye.local';

-- Başarılıysa aşağıdaki mesajı göreceksiniz
SELECT 'TRIGGER FIX BAŞARILI - Şimdi 007_create_users.sql çalıştırabilirsiniz!' AS sonuc;
