import { NextRequest, NextResponse } from "next/server";
import { runSayimUyari } from "@/lib/sayimUyari";

/**
 * GET /api/cron/sayim-uyari — MANUEL TEST / ÖNİZLEME ucu.
 *
 * Sayım uyarıları artık HARİCİ CRON GEREKTİRMEZ; uygulama içi zamanlayıcı
 * (src/instrumentation.ts) her ~10 dk çalışıp her şubenin posta+20dk anını
 * kendisi yakalar. Bu endpoint yalnızca elle test/önizleme içindir:
 *   - ?dryRun=1  → SMS göndermeden "şu an kimlere ne gider" raporu
 *   - (dryRun'sız) → gerçek çalışma (pencere + idempotency geçerli)
 *
 * CRON_SECRET ile korunur (Authorization: Bearer <secret> veya ?secret=<secret>).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tanımlı değil." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const { searchParams } = new URL(request.url);
  if (bearer !== secret && searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const dryRun = searchParams.get("dryRun") === "1";
  try {
    const result = await runSayimUyari(dryRun);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/sayim-uyari] Hata:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
