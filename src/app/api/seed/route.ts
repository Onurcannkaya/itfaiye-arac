import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { mockVehicles, mockPersonnel, mockMaintenanceLogs, mockFuelLogs, mockTaskLogs } from "@/lib/data";

export async function GET() {
  try {
    let logs: string[] = [];
    const defaultPasswordHash = await hashPassword("1234");

    // 1. Seed Personel
    for (const p of mockPersonnel) {
      try {
        await query(
          `INSERT INTO personnel (sicil_no, ad, soyad, unvan, rol, aktif, view_only, can_approve, can_print, password_hash)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9)
           ON CONFLICT (sicil_no) DO UPDATE SET ad = $2, soyad = $3, unvan = $4, rol = $5, password_hash = $9`,
          [p.sicil_no, p.ad, p.soyad, p.unvan, p.rol, p.rol === 'User', p.rol === 'Shift_Leader' || p.rol === 'Admin', p.rol !== 'User', defaultPasswordHash]
        );
        logs.push(`✓ ${p.sicil_no} — ${p.ad} ${p.soyad} (${p.unvan}) eklendi/güncellendi.`);
      } catch (err: any) {
        logs.push(`✗ ${p.sicil_no}: ${err.message}`);
      }
    }

    // 2. Seed Vehicles
    for (const v of mockVehicles) {
      try {
        await query(
          `INSERT INTO vehicles (plaka, arac_tipi, durum, bolmeler, km, "motorSaatiPTO", "sigortaBitis", "muayeneBitis")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (plaka) DO UPDATE SET arac_tipi = $2, durum = $3, bolmeler = $4`,
          [v.plaka, v.aracTipi, v.durum, JSON.stringify(v.bolmeler), v.km, v.motorSaatiPTO, v.sigortaBitis, v.muayeneBitis]
        );
      } catch (err: any) {
        logs.push(`Hata Araç (${v.plaka}): ${err.message}`);
      }
    }

    // 3. Seed Maintenance
    for (const m of mockMaintenanceLogs) {
      try {
        await query(
          `INSERT INTO maintenance_logs (plaka, tip, "kmAt", "ptoAt", aciklama, maliyet, tarih, "yapanKisi") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [m.plaka, m.tip, m.kmAt, m.ptoAt, m.aciklama, m.maliyet, m.tarih, m.yapanKisi]
        );
      } catch {}
    }

    // 4. Seed Fuel
    for (const f of mockFuelLogs) {
      try {
        await query(
          `INSERT INTO fuel_logs (plaka, litre, tutar, "kmAt", istasyon, tarih, "kayitEden") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [f.plaka, f.litre, f.tutar, f.kmAt, f.istasyon, f.tarih, f.kayitEden]
        );
      } catch {}
    }

    // 5. Seed Tasks
    for (const t of mockTaskLogs) {
      try {
        await query(
          `INSERT INTO tasks (plaka, tip, checklist, durum, atanan, tarih, notlar, "tamamlanmaTarihi") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [t.plaka, t.tip, JSON.stringify(t.checklist), t.durum, t.atanan, t.tarih, t.notlar || null, t.tamamlanmaTarihi || null]
        );
      } catch {}
    }

    return NextResponse.json({
      message: "Seed işlemi tamamlandı.",
      logs
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
