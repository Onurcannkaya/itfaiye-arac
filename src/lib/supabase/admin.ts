import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client — Service Role Key ile RLS bypass eder.
 * Sadece sunucu tarafında (API routes) kullanılmalıdır.
 * 
 * .env dosyanıza eklemeniz gereken değişken:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * 
 * Bu key Supabase Dashboard → Settings → API → service_role key
 * altında bulunur.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ortam değişkeni tanımlanmamış.");
  }

  if (!serviceRoleKey) {
    console.warn(
      "[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY tanımlanmamış. " +
      "Anon key ile devam ediliyor — RLS aktifse yazma işlemleri başarısız olabilir."
    );
    // Fallback: anon key ile dene (RLS aktifse çalışmayabilir)
    return createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
