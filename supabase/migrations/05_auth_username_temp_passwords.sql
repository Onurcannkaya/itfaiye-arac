-- ============================================================
-- 05: USERNAME COLUMN & TEMP_PASSWORDS TABLE
-- ============================================================
-- Adds username column to personnel table for alternative login.
-- Creates temp_passwords table for admin-managed password resets.
-- ============================================================

-- 1) Add username column to personnel
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2) Create temp_passwords table
CREATE TABLE IF NOT EXISTS public.temp_passwords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sicil_no VARCHAR(20) NOT NULL REFERENCES public.personnel(sicil_no) ON DELETE CASCADE,
  plain_password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(20), -- admin who reset
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  UNIQUE(sicil_no)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_temp_passwords_sicil ON public.temp_passwords (sicil_no);
