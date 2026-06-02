import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Session verification guard
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Oturum bulunamadı. Lütfen giriş yapın.' }, { status: 401 });
    }

    const body = await request.json();
    const { plaka, aciklama, durum } = body;

    if (!plaka || !aciklama) {
      return NextResponse.json({ success: false, error: 'Plaka ve Açıklama alanları zorunludur.' }, { status: 400 });
    }

    // Automatically append [ARIZALI] prefix in server side for critical unresolved alerts trigger
    const finalDesc = `[ARIZALI] ${aciklama.trim()}`;
    const finalStatus = durum || 'Bekliyor';

    // Parameterized INSERT query for SQL injection protection
    await query(
      `INSERT INTO public.arac_bakim_gecmisi (plaka, tarih, tip, aciklama, maliyet, durum)
       VALUES ($1, NOW(), 'tamir', $2, 0, $3)`,
      [plaka.toUpperCase().trim(), finalDesc, finalStatus]
    );

    // 2. Server-side parameterized audit logging
    await query(
      `INSERT INTO public.audit_logs (action_type, actor_sicil_no, actor_name, target, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'arac_ariza_bildirim',
        session.sicilNo,
        `${session.ad} ${session.soyad}`,
        plaka.toUpperCase().trim(),
        JSON.stringify({ aciklama: finalDesc, durum: finalStatus, tarih: new Date().toISOString() })
      ]
    ).catch(err => console.error('[Server AuditLog] Arıza bildirim log yazma hatası:', err));

    return NextResponse.json({ success: true, message: 'Arıza kaydı başarıyla belediye yerel veritabanına mühürlendi.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[arac-ariza-bildir/POST] Hata:', msg);
    return NextResponse.json({ success: false, error: 'Sunucu hatası oluştu: ' + msg }, { status: 500 });
  }
}
