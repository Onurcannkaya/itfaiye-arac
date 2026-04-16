import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mockVehicles, mockPersonnel } from "@/lib/data";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // We create a standard supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    let logs = [];

    // 1. Seed Personel (Profiles)
    for (const p of mockPersonnel) {
      // Create a fake UUID based on their sicil/name or just let supabase handle it if we don't need auth immediately
      // Actually, since profiles are linked to auth.users, directly inserting into profiles without auth.users might fail if we have a foreign key.
      // Wait, in my SQL schema: id UUID REFERENCES auth.users(id) ON DELETE CASCADE
      // This means we CANNOT insert into profiles without having an auth user!
      // I'll skip inserting profiles for now, or just log a warning. We will manage users via Supabase UI.
    }

    // 2. Seed Vehicles
    for (const v of mockVehicles) {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          plaka: v.plaka,
          arac_tipi: v.aracTipi,
          durum: "aktif",
          bolmeler: v.bolmeler,
          km: Math.floor(Math.random() * 50000) + 10000 // Fake KM
        })
        .select()
        .single();
      
      if (error) {
        logs.push(`Hata (${v.plaka}): ${error.message}`);
      } else {
        logs.push(`Başarılı: ${v.plaka} eklendi.`);
      }
    }

    return NextResponse.json({
      message: "Seed işlemi tamamlandı.",
      logs
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
