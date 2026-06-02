import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

interface ResultItem {
  malzeme: string;
  adet: number;
  durum: string;
  note?: string;
}

/**
 * POST /api/inventory-check
 * Envanter bölme sayım sonuçlarını kaydeder.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const body = await request.json();
    const { plaka, compartment_key, results } = body as {
      plaka: string;
      compartment_key: string;
      results: ResultItem[];
    };

    if (!plaka || !compartment_key || !results) {
      return NextResponse.json(
        { error: "plaka, compartment_key ve results zorunludur." },
        { status: 400 }
      );
    }

    const checked_by = session.sicilNo;
    const checked_by_name = `${session.ad} ${session.soyad}`;

    // 1. inventory_checks tablosuna kaydet
    const insertedRows: Array<{ id: string }> = [];
    for (const item of results) {
      const row = await queryOne<{ id: string }>(
        `INSERT INTO inventory_checks (plaka, bolme, malzeme, kontrol_eden, yeni_durum, adet, compartment_key, notlar) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          plaka,
          compartment_key, // bolme
          item.malzeme,
          checked_by, // kontrol_eden (sicil no)
          item.durum, // yeni_durum
          item.adet,
          compartment_key,
          item.note || null // notlar
        ]
      );
      if (row) insertedRows.push(row);
    }

    const firstCheckId = insertedRows.length > 0 ? insertedRows[0].id : null;

    // 2. Sorunlu malzemeleri tespit et
    const issues = results.filter(
      (r) => r.durum !== "Tam"
    );

    // 3. audit_logs tablosuna da yaz
    await query(
      `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details) VALUES ($1, $2, $3, $4, $5)`,
      [
        'envanter_sayim', checked_by, checked_by_name,
        `${plaka} / ${compartment_key}`,
        JSON.stringify({
          check_id: firstCheckId,
          total_items: results.length,
          issues_count: issues.length,
          issues: issues.map((i) => ({ malzeme: i.malzeme, durum: i.durum, note: i.note })),
        })
      ]
    );

    return NextResponse.json({
      success: true,
      check_id: firstCheckId,
      issues_count: issues.length,
    });
  } catch (error: unknown) {
    console.error("[inventory-check] Sunucu hatası:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Sunucu hatası: " + errMsg }, { status: 500 });
  }
}
