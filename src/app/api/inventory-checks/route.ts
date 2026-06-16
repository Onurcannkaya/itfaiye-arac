import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/inventory-checks?plaka=58+ACT+367&compartment=kabin_ici
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plaka = searchParams.get("plaka");
    const compartment = searchParams.get("compartment");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!plaka) {
      return NextResponse.json({ error: "plaka query parametresi zorunludur." }, { status: 400 });
    }

    let sql = `
      SELECT ic.*, p.ad, p.soyad 
      FROM public.inventory_checks ic
      LEFT JOIN public.personnel p ON ic.kontrol_eden = p.sicil_no
      WHERE ic.plaka = $1
    `;
    const params: any[] = [plaka];

    if (compartment) {
      sql += ` AND ic.compartment_key = $2`;
      params.push(compartment);
    }

    sql += ` ORDER BY ic.created_at DESC LIMIT 500`;

    const result = await query(sql, params);
    const rows = result.rows;

    // Seans bazlı gruplama algoritması (10 saniye tolerans penceresi)
    const sessions: any[] = [];

    rows.forEach((row: any) => {
      const timestamp = new Date(row.created_at).getTime();
      const checked_by = row.kontrol_eden;
      const checked_by_name = row.ad ? `${row.ad} ${row.soyad}` : row.kontrol_eden || "Bilinmeyen";

      // Aynı araç, aynı kapak, aynı kontrolör ve en fazla 10 saniye zaman farkı olan bir seans bul
      const foundSession = sessions.find((s: any) => 
        s.plaka === row.plaka &&
        s.compartment_key === row.compartment_key &&
        s.checked_by === checked_by &&
        Math.abs(new Date(s.created_at).getTime() - timestamp) <= 10000
      );

      const resultItem = {
        malzeme: row.malzeme,
        durum: row.yeni_durum,
        note: row.notlar || undefined
      };

      if (foundSession) {
        foundSession.results.push(resultItem);
        if (row.notlar && !foundSession.notes) {
          foundSession.notes = row.notlar;
        }
      } else {
        sessions.push({
          id: row.id,
          plaka: row.plaka,
          compartment_key: row.compartment_key,
          checked_by: checked_by,
          checked_by_name: checked_by_name,
          results: [resultItem],
          notes: row.notlar || undefined,
          created_at: row.created_at
        });
      }
    });

    const limitedData = sessions.slice(0, limit);
    return NextResponse.json({ data: limitedData });
  } catch (error: any) {
    console.error("[inventory-checks] Sunucu hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
