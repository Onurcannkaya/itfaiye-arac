import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * POST /api/audit-log
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const body = await request.json();
    const { action_type, target, details } = body;

    if (!action_type) {
      return NextResponse.json(
        { error: "action_type zorunludur." },
        { status: 400 }
      );
    }

    // Aktör bilgisi istemciden DEĞİL, doğrulanmış oturumdan alınır (sahte denetim
    // kaydı enjeksiyonunu önlemek için body'deki actor alanları yok sayılır).
    const actorSicilNo = session.sicilNo;
    const actorName = `${session.ad || ''} ${session.soyad || ''}`.trim() || session.sicilNo;

    await query(
      `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details) VALUES ($1, $2, $3, $4, $5)`,
      [action_type, actorSicilNo, actorName, target || null, details ? JSON.stringify(details) : null]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[audit-log] Sunucu hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
