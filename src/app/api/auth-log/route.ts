import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * POST /api/auth-log
 * Oturum içi kimlik doğrulama olaylarını kaydeder.
 *
 * Not: Başarılı/başarısız giriş ve çıkış olayları zaten /api/auth/login ve
 * /api/auth/logout içinde sunucu tarafında loglanır. Bu endpoint yalnızca
 * doğrulanmış oturumdan gelen ek istemci olayları için kullanılır; sicil_no
 * istemci gövdesinden DEĞİL oturumdan alınır (kimlik sahteciliği engellenir).
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, details } = body;

    const validEvents = ["login_success", "login_failed", "logout"];
    if (!event_type || !validEvents.includes(event_type)) {
      return NextResponse.json(
        { error: "Geçersiz veya eksik event_type." },
        { status: 400 }
      );
    }

    const sicil_no = session.sicilNo;
    const actorName = `${session.ad || ''} ${session.soyad || ''}`.trim() || sicil_no;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip_address = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const user_agent = request.headers.get("user-agent") || "unknown";

    await query(
      `INSERT INTO auth_logs (sicil_no, event_type, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5)`,
      [sicil_no, event_type, ip_address, user_agent, details || null]
    );

    await query(
      `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details) VALUES ($1, $2, $3, $4, $5)`,
      [event_type, sicil_no, actorName, 'auth', JSON.stringify({ ip_address, user_agent })]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[auth-log] Sunucu hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
