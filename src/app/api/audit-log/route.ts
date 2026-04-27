import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/audit-log
 * Genel amaçlı audit log kaydı oluşturur.
 * 
 * Body: {
 *   action_type: string,       // 'inventory_update', 'personnel_add', 'permission_change', 'task_create' vb.
 *   actor_sicil_no: string,
 *   actor_name: string,
 *   target?: string,           // Etkilenen kaynak (plaka, sicil_no vb.)
 *   details?: object           // Ek detaylar
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_type, actor_sicil_no, actor_name, target, details } = body;

    if (!action_type || !actor_sicil_no || !actor_name) {
      return NextResponse.json(
        { error: "action_type, actor_sicil_no ve actor_name zorunludur." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("audit_logs").insert({
      action_type,
      actor_sicil_no,
      actor_name,
      target: target || null,
      details: details || null,
    });

    if (error) {
      console.error("[audit-log] Kayıt hatası:", error.message);
      return NextResponse.json(
        { error: "Audit log kaydı başarısız: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[audit-log] Sunucu hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası: " + error.message },
      { status: 500 }
    );
  }
}
