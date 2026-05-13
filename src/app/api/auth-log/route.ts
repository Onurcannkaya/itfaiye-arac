import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * POST /api/auth-log
 * Kullanıcı giriş/çıkış/başarısız deneme olaylarını kaydeder.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sicil_no, event_type, details } = body;

    if (!sicil_no || !event_type) {
      return NextResponse.json(
        { error: "sicil_no ve event_type zorunludur." },
        { status: 400 }
      );
    }

    const validEvents = ["login_success", "login_failed", "logout"];
    if (!validEvents.includes(event_type)) {
      return NextResponse.json(
        { error: "Geçersiz event_type." },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip_address = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const user_agent = request.headers.get("user-agent") || "unknown";

    await query(
      `INSERT INTO auth_logs (sicil_no, event_type, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5)`,
      [sicil_no, event_type, ip_address, user_agent, details || null]
    );

    await query(
      `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details) VALUES ($1, $2, $3, $4, $5)`,
      [event_type, sicil_no, details || sicil_no, 'auth', JSON.stringify({ ip_address, user_agent })]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[auth-log] Sunucu hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
