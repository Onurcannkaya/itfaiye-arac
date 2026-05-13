import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

/**
 * POST /api/inventory-check
 * Envanter bölme sayım sonuçlarını kaydeder.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plaka, compartment_key, checked_by, checked_by_name, results, notes } = body;

    if (!plaka || !compartment_key || !checked_by || !checked_by_name || !results) {
      return NextResponse.json(
        { error: "plaka, compartment_key, checked_by, checked_by_name ve results zorunludur." },
        { status: 400 }
      );
    }

    // 1. inventory_checks tablosuna kaydet
    const checkData = await queryOne(
      `INSERT INTO inventory_checks (plaka, compartment_key, checked_by, checked_by_name, results, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [plaka, compartment_key, checked_by, checked_by_name, JSON.stringify(results), notes || null]
    );

    // 2. Sorunlu malzemeleri tespit et
    const issues = (results as any[]).filter(
      (r) => r.durum !== "Tam" && r.checkStatus !== "Tam"
    );

    // 3. audit_logs tablosuna da yaz
    await query(
      `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details) VALUES ($1, $2, $3, $4, $5)`,
      [
        'inventory_check', checked_by, checked_by_name,
        `${plaka} / ${compartment_key}`,
        JSON.stringify({
          check_id: checkData?.id,
          total_items: (results as any[]).length,
          issues_count: issues.length,
          issues: issues.map((i: any) => ({ malzeme: i.malzeme, durum: i.durum || i.checkStatus, note: i.note })),
        })
      ]
    );

    return NextResponse.json({
      success: true,
      check_id: checkData?.id,
      issues_count: issues.length,
    });
  } catch (error: any) {
    console.error("[inventory-check] Sunucu hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
