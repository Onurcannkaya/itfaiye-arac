-- ============================================================
-- SİVAS İTFAİYE — AUTH ŞEMA ONARIM
-- ============================================================
-- Bu SQL, önceki doğrudan auth.users INSERT'lerinden
-- bozulan auth şemasını onarır.
-- Supabase SQL Editor'de çalıştırın.
-- ============================================================

-- 1) auth.users'daki bozuk kayıtları tamamen temizle
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@itfaiye.local'
);
DELETE FROM auth.sessions WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@itfaiye.local'
);
DELETE FROM auth.refresh_tokens WHERE user_id::uuid IN (
  SELECT id FROM auth.users WHERE email LIKE '%@itfaiye.local'
);
DELETE FROM auth.mfa_factors WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@itfaiye.local'
);
DELETE FROM auth.users WHERE email LIKE '%@itfaiye.local';

-- 2) auth schema'daki index'leri onar
REINDEX TABLE auth.users;
REINDEX TABLE auth.identities;

-- 3) auth.users sequence'larını resetle (varsa)
-- Bu bazen bozuk kalan internal state'i düzeltir

-- 4) Test: basit bir kullanıcı oluşturup sil
DO $$
DECLARE
  test_id uuid;
BEGIN
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
    'repair_test@itfaiye.local',
    crypt('test', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO test_id;

  -- Identities ekle
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), test_id,
    jsonb_build_object('sub', test_id::text, 'email', 'repair_test@itfaiye.local'),
    'email', test_id::text,
    now(), now(), now()
  );

  -- Test sil
  DELETE FROM auth.identities WHERE user_id = test_id;
  DELETE FROM auth.users WHERE id = test_id;
  
  RAISE NOTICE 'Auth şema onarım testi BAŞARILI!';
END $$;

-- 5) Doğrulama
SELECT 'Auth şema onarıldı. Kalan itfaiye kullanıcı: ' || count(*)::text AS sonuc 
FROM auth.users WHERE email LIKE '%@itfaiye.local';
