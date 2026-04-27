-- Enums
CREATE TYPE user_role AS ENUM ('sistem_yoneticisi', 'vardiya_cavusu', 'sofor', 'itfaiye_eri');
CREATE TYPE item_status AS ENUM ('Tam', 'Eksik', 'Kayıp/Yok', 'Arızalı');

-- Kullanıcılar tablosu (Supabase auth id ile eşleşecek)
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sicil_no varchar(20) UNIQUE NOT NULL,
  ad varchar(50) NOT NULL,
  soyad varchar(50) NOT NULL,
  rol user_role NOT NULL DEFAULT 'itfaiye_eri',
  posta varchar(50),
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Araçlar tablosu
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaka varchar(15) UNIQUE NOT NULL,
  arac_tipi varchar(100) NOT NULL,
  aktif_personel jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Bölmeler (Kapaklar)
CREATE TABLE public.compartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  key_name varchar(50) NOT NULL, -- Örn: 'kabin_ici', 'sol_on_kapak'
  ad varchar(100) NOT NULL, -- UI için: 'Kabin İçi'
  sira_no integer DEFAULT 0,
  UNIQUE(vehicle_id, key_name)
);

-- Envanter Malzemeleri
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compartment_id uuid REFERENCES public.compartments(id) ON DELETE CASCADE,
  malzeme varchar(150) NOT NULL,
  adet integer DEFAULT 1,
  durum item_status DEFAULT 'Tam'
);

-- Row Level Security (RLS) Ayarları
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Basit Okuma Politikaları (Şimdilik herkesin görmesi için)
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.compartments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.inventory_items FOR SELECT USING (true);
