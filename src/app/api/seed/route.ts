import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockVehicles, mockPersonnel, mockMaintenanceLogs, mockFuelLogs, mockTaskLogs } from "@/lib/data";

export async function GET() {
  try {
    const supabase = createAdminClient();
    let logs: string[] = [];

    // 1. Seed Personel (Auth Users & Profile)
    for (const p of mockPersonnel) {
      const email = `${p.sicil_no.toLowerCase()}@itfaiye.local`;
      const password = "1234";

      try {
        // Önce auth kullanıcısını oluştur
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            sicil_no: p.sicil_no,
            ad: p.ad,
            soyad: p.soyad,
          }
        });

        if (authError && authError.message.includes('already been registered')) {
          logs.push(`Mevcut: ${p.sicil_no} — zaten kayıtlı, profil güncelleniyor...`);
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const existingUser = usersData.users.find(u => u.email === email);
          
          if (existingUser) {
             const { error: upsertErr } = await supabase.from('personnel').upsert({
               id: existingUser.id,
               sicil_no: p.sicil_no,
               ad: p.ad,
               soyad: p.soyad,
               unvan: p.unvan,
               rol: p.rol,
               aktif: true,
               view_only: p.rol === 'User',
               can_approve: p.rol === 'Shift_Leader' || p.rol === 'Admin',
               can_print: p.rol !== 'User'
             }, { onConflict: 'sicil_no' });
             if (upsertErr) logs.push(`  → Profil güncelleme hatası: ${upsertErr.message}`);
             else logs.push(`  → Profil güncellendi.`);
          }
        } else if (authError) {
          // Detaylı hata logla
          logs.push(`Hata Auth (${p.sicil_no}): ${authError.message} | status: ${(authError as any).status || 'N/A'} | code: ${(authError as any).code || 'N/A'}`);
        } else if (authData.user) {
          const { error: profileError } = await supabase.from('personnel').insert({
            id: authData.user.id,
            sicil_no: p.sicil_no,
            ad: p.ad,
            soyad: p.soyad,
            unvan: p.unvan,
            rol: p.rol,
            aktif: true,
            view_only: p.rol === 'User',
            can_approve: p.rol === 'Shift_Leader' || p.rol === 'Admin',
            can_print: p.rol !== 'User'
          });

          if (profileError) {
            logs.push(`Hata Profil (${p.sicil_no}): ${profileError.message}`);
          } else {
            logs.push(`✓ ${p.sicil_no} — ${p.ad} ${p.soyad} (${p.unvan}) eklendi.`);
          }
        }
      } catch (err: any) {
        logs.push(`Exception (${p.sicil_no}): ${err.message}`);
      }
    }

    // 2. Seed Vehicles
    for (const v of mockVehicles) {
      const { error } = await supabase.from('vehicles').upsert({
        plaka: v.plaka,
        arac_tipi: v.aracTipi,
        durum: v.durum,
        bolmeler: v.bolmeler,
        km: v.km,
        motorSaatiPTO: v.motorSaatiPTO,
        sigortaBitis: v.sigortaBitis,
        muayeneBitis: v.muayeneBitis
      }, { onConflict: 'plaka' });
      
      if (error) logs.push(`Hata Araç (${v.plaka}): ${error.message}`);
    }

    // 3. Seed Maintenance
    for (const m of mockMaintenanceLogs) {
      await supabase.from('maintenance_logs').insert({
        plaka: m.plaka,
        tip: m.tip,
        kmAt: m.kmAt,
        ptoAt: m.ptoAt,
        aciklama: m.aciklama,
        maliyet: m.maliyet,
        tarih: m.tarih,
        yapanKisi: m.yapanKisi
      });
    }

    // 4. Seed Fuel
    for (const f of mockFuelLogs) {
      await supabase.from('fuel_logs').insert({
        plaka: f.plaka,
        litre: f.litre,
        tutar: f.tutar,
        kmAt: f.kmAt,
        istasyon: f.istasyon,
        tarih: f.tarih,
        kayitEden: f.kayitEden
      });
    }

    // 5. Seed Tasks
    for (const t of mockTaskLogs) {
      await supabase.from('tasks').insert({
        plaka: t.plaka,
        tip: t.tip,
        checklist: t.checklist,
        durum: t.durum,
        atanan: t.atanan,
        tarih: t.tarih,
        notlar: t.notlar || null,
        tamamlanmaTarihi: t.tamamlanmaTarihi || null
      });
    }

    return NextResponse.json({
      message: "Seed işlemi tamamlandı.",
      logs
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
