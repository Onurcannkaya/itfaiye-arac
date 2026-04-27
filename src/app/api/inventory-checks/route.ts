import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/inventory-checks?plaka=58+ACT+367&compartment=kabin_ici
 * AuditTimeline bileşeni için envanter sayım geçmişini döner.
 * 
 * Query Params:
 *   plaka: string (zorunlu)
 *   compartment: string (opsiyonel — verilirse filtreler)
 *   limit: number (opsiyonel — varsayılan 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plaka = searchParams.get("plaka");
    const compartment = searchParams.get("compartment");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!plaka) {
      return NextResponse.json(
        { error: "plaka query parametresi zorunludur." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    let query = supabase
      .from("inventory_checks")
      .select("*")
      .eq("plaka", plaka)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (compartment) {
      query = query.eq("compartment_key", compartment);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[inventory-checks] Sorgu hatası:", error.message);
      return NextResponse.json(
        { error: "Sorgu hatası: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error("[inventory-checks] Sunucu hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası: " + error.message },
      { status: 500 }
    );
  }
}
