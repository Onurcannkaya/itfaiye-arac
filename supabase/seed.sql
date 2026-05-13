-- Örnek Personel
INSERT INTO public.users (sicil_no, ad, soyad, rol, posta) VALUES 
('SIV-101', 'Mustafa', 'Köse', 'sofor', 'A Postası'),
('SIV-102', 'Onurcan', 'Kaya', 'itfaiye_eri', 'A Postası'),
('SIV-103', 'Melih', 'Arslan', 'sofor', 'B Postası'),
('SIV-104', 'Selahattin', 'Tosun', 'itfaiye_eri', 'B Postası');

-- 1. Araç: 58 ACT 367
WITH v1 AS (
  INSERT INTO public.vehicles (plaka, arac_tipi, aktif_personel)
  VALUES ('58 ACT 367', 'Ford Arazöz', '["Mustafa Köse", "Onurcan Kaya"]'::jsonb)
  RETURNING id
),
c1_kabin AS (
  INSERT INTO public.compartments (vehicle_id, key_name, ad) 
  SELECT id, 'kabin_ici', 'Kabin İçi' FROM v1 RETURNING id
),
c1_sagon AS (
  INSERT INTO public.compartments (vehicle_id, key_name, ad) 
  SELECT id, 'sag_on_kapak', 'Sağ Ön Kapak' FROM v1 RETURNING id
),
c1_solarka AS (
  INSERT INTO public.compartments (vehicle_id, key_name, ad) 
  SELECT id, 'sol_arka_kapak', 'Sol Arka Kapak' FROM v1 RETURNING id
)
INSERT INTO public.inventory_items (compartment_id, malzeme, adet, durum) VALUES
-- Kabin içi
((SELECT id FROM c1_kabin), 'Kriko', 1, 'Tam'),
((SELECT id FROM c1_kabin), 'Lastik Şişirme Aparatı', 1, 'Tam'),
((SELECT id FROM c1_kabin), 'Çeki Demiri', 1, 'Tam'),
((SELECT id FROM c1_kabin), 'Şarjlı Projektör', 1, 'Tam'),
-- Sağ Ön Kapak
((SELECT id FROM c1_sagon), 'Ayaklı Aydınlatma Lambası', 1, 'Tam'),
((SELECT id FROM c1_sagon), 'Jeneratör', 1, 'Tam'),
((SELECT id FROM c1_sagon), 'Hidrolik Güç Ünitesi', 1, 'Tam'),
((SELECT id FROM c1_sagon), 'Hidrolik Kesici', 1, 'Tam'),
((SELECT id FROM c1_sagon), 'Hidrolik Ayırıcı', 2, 'Tam'),
-- Sol Arka Kapak
((SELECT id FROM c1_solarka), '85''lik Hortum', 5, 'Tam'),
((SELECT id FROM c1_solarka), '85''lik Turbo Lans', 2, 'Tam'),
((SELECT id FROM c1_solarka), '85''lik Kollu Lans', 2, 'Tam'),
((SELECT id FROM c1_solarka), 'Ağır Köpük Lansı', 1, 'Tam');

-- 2. Araç: 58 TH 256
WITH v2 AS (
  INSERT INTO public.vehicles (plaka, arac_tipi, aktif_personel)
  VALUES ('58 TH 256', 'İlk Müdahale Atego', '["Melih Arslan", "Selahattin Tosun"]'::jsonb)
  RETURNING id
),
c2_solon AS (
  INSERT INTO public.compartments (vehicle_id, key_name, ad) 
  SELECT id, 'sol_on_kapak', 'Sol Ön Kapak' FROM v2 RETURNING id
),
c2_solarka AS (
  INSERT INTO public.compartments (vehicle_id, key_name, ad) 
  SELECT id, 'sol_arka_kapak', 'Sol Arka Kapak' FROM v2 RETURNING id
),
c2_aracustu AS (
  INSERT INTO public.compartments (vehicle_id, key_name, ad) 
  SELECT id, 'arac_ustu', 'Araç Üstü' FROM v2 RETURNING id
)
INSERT INTO public.inventory_items (compartment_id, malzeme, adet, durum) VALUES
-- Sol Ön Kapak
((SELECT id FROM c2_solon), 'Holmatro Güç Ünitesi', 1, 'Tam'),
((SELECT id FROM c2_solon), 'Holmatro Kesici', 1, 'Tam'),
((SELECT id FROM c2_solon), 'Holmatro Ayırıcı', 1, 'Tam'),
((SELECT id FROM c2_solon), 'Hilti', 2, 'Eksik'),
((SELECT id FROM c2_solon), 'Amir Baltası', 1, 'Tam'),
-- Sol Arka Kapak
((SELECT id FROM c2_solarka), '85''lik Yangın Hortumu', 5, 'Tam'),
((SELECT id FROM c2_solarka), '110''luk Turbo Lans', 2, 'Tam'),
((SELECT id FROM c2_solarka), 'Ala Hortum Süzgeci', 1, 'Kayıp/Yok'),
((SELECT id FROM c2_solarka), 'Hava Yastığı (Pompa Üzeri)', 4, 'Tam'),
-- Araç Üstü
((SELECT id FROM c2_aracustu), 'Alıcı Hortum', 2, 'Tam'),
((SELECT id FROM c2_aracustu), 'Dalgıç Pompa', 1, 'Tam'),
((SELECT id FROM c2_aracustu), 'Seyyar Merdiven', 1, 'Tam');
