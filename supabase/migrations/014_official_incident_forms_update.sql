-- ============================================================
-- SİVAS İTFAİYE — EK-12, EK-16, EK-7 RESMİ FORM GÜNCELLEMELERİ
-- ============================================================
-- Bu script, incidents tablosuna resmi evrak (EK) standartlarına
-- uygun yeni sütunları ekler. Idempotent çalışır.
-- ============================================================

-- 1. İhbar Bilgileri (EK-12)
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS ihbar_eden_ad_soyad TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS ihbar_eden_tel TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS bildirilen_kurumlar JSONB DEFAULT '[]'::jsonb;

-- 2. Olay Yeri ve Bina Detayları (EK-16 ve EK-7)
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS bina_yapi_malzemesi TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS yangin_baslangic_yeri TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS cikis_sebebi TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS sigorta_durumu TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS olay_teslim_edilen_kisi TEXT;

-- 3. Can Kaybı ve Kurtarma Bilançosu (EK-16)
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS olu_halk INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS yarali_halk INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS kurtarilan_halk INT DEFAULT 0;

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS olu_itfaiye INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS yarali_itfaiye INT DEFAULT 0;

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS kurtarilan_hayvan INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS olen_hayvan INT DEFAULT 0;

-- (İsteğe bağlı) Formdan girilmeyen null değerleri 0'a çekmek için kısa bir update:
UPDATE public.incidents SET
  olu_halk = COALESCE(olu_halk, 0),
  yarali_halk = COALESCE(yarali_halk, 0),
  kurtarilan_halk = COALESCE(kurtarilan_halk, 0),
  olu_itfaiye = COALESCE(olu_itfaiye, 0),
  yarali_itfaiye = COALESCE(yarali_itfaiye, 0),
  kurtarilan_hayvan = COALESCE(kurtarilan_hayvan, 0),
  olen_hayvan = COALESCE(olen_hayvan, 0);

-- ============================================================
-- BİTİŞ
-- ============================================================
