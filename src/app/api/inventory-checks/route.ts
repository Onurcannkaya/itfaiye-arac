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

    let sql = `SELECT * FROM inventory_checks WHERE plaka = $1`;
    const params: any[] = [plaka];

    if (compartment) {
      sql += ` AND compartment_key = $2`;
      params.push(compartment);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error("[inventory-checks] Sunucu hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
