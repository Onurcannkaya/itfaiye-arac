import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/inventory-check
 * Envanter bölme sayım sonuçlarını kaydeder.
 * 
 * Body: {
 *   plaka: string,
 *   compartment_key: string,
 *   checked_by: string,        // sicil_no
 *   checked_by_name: string,   // Ad Soyad
 *   results: { malzeme: string, durum: string, note?: string }[],
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plaka, compartment_key, checked_by, checked_by_name, results, notes } = body;

    // Validasyon
    if (!plaka || !compartment_key || !checked_by || !checked_by_name || !results) {
      return NextResponse.json(
        { error: "plaka, compartment_key, checked_by, checked_by_name ve results zorunludur." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. inventory_checks tablosuna kaydet
    const { data: checkData, error: checkError } = await supabase
      .from("inventory_checks")
      .insert({
        plaka,
        compartment_key,
        checked_by,
        checked_by_name,
        results,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (checkError) {
      console.error("[inventory-check] Kayıt hatası:", checkError.message);
      return NextResponse.json(
        { error: "Sayım kaydı başarısız: " + checkError.message },
        { status: 500 }
      );
    }

    // 2. Sorunlu malzemeleri tespit et
    const issues = (results as any[]).filter(
      (r) => r.durum !== "Tam" && r.checkStatus !== "Tam"
    );

    // 3. audit_logs tablosuna da yaz
    await supabase.from("audit_logs").insert({
      action_type: "inventory_check",
      actor_sicil_no: checked_by,
      actor_name: checked_by_name,
      target: `${plaka} / ${compartment_key}`,
      details: {
        check_id: checkData?.id,
        total_items: (results as any[]).length,
        issues_count: issues.length,
        issues: issues.map((i: any) => ({
          malzeme: i.malzeme,
          durum: i.durum || i.checkStatus,
          note: i.note,
        })),
      },
    });

    return NextResponse.json({
      success: true,
      check_id: checkData?.id,
      issues_count: issues.length,
    });
  } catch (error: any) {
    console.error("[inventory-check] Sunucu hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası: " + error.message },
      { status: 500 }
    );
  }
}
