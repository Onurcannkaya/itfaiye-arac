import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth-log
 * Kullanıcı giriş/çıkış/başarısız deneme olaylarını kaydeder.
 * 
 * Body: { sicil_no: string, event_type: 'login_success' | 'login_failed' | 'logout', details?: string }
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

    // Validate event_type
    const validEvents = ["login_success", "login_failed", "logout"];
    if (!validEvents.includes(event_type)) {
      return NextResponse.json(
        { error: "Geçersiz event_type. Geçerli değerler: " + validEvents.join(", ") },
        { status: 400 }
      );
    }

    // Sunucu tarafında IP ve User-Agent al
    const forwarded = request.headers.get("x-forwarded-for");
    const ip_address = forwarded?.split(",")[0]?.trim() || 
                       request.headers.get("x-real-ip") || 
                       "unknown";
    const user_agent = request.headers.get("user-agent") || "unknown";

    const supabase = createAdminClient();

    // auth_logs tablosuna yaz
    const { error: authLogError } = await supabase
      .from("auth_logs")
      .insert({
        sicil_no,
        event_type,
        ip_address,
        user_agent,
        details: details || null,
      });

    if (authLogError) {
      console.error("[auth-log] Kayıt hatası:", authLogError.message);
      return NextResponse.json(
        { error: "Log kaydı başarısız: " + authLogError.message },
        { status: 500 }
      );
    }

    // Aynı zamanda audit_logs tablosuna da yaz (merkezi log)
    await supabase.from("audit_logs").insert({
      action_type: event_type,
      actor_sicil_no: sicil_no,
      actor_name: details || sicil_no,
      target: "auth",
      details: { ip_address, user_agent },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[auth-log] Sunucu hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası: " + error.message },
      { status: 500 }
    );
  }
}
