import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ success: true, message: 'Arıza kaydı başarıyla belediye yerel veritabanına mühürlendi.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[arac-ariza-bildir/POST] Hata:', msg);
    return NextResponse.json({ success: false, error: 'Sunucu hatası oluştu: ' + msg }, { status: 500 });
  }
}
