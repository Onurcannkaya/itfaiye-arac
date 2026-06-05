import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const { sicilNo } = session;

    // Fetch the personnel details
    const person = await queryOne(
      'SELECT id, ad, soyad, istasyon FROM public.personnel WHERE sicil_no = $1',
      [sicilNo]
    );

    if (!person) {
      return NextResponse.json({ error: 'Personel kaydı bulunamadı.' }, { status: 404 });
    }

    const personnelId = person.id;
    const adSoyad = `${person.ad} ${person.soyad}`;
    const istasyon = person.istasyon || 'Merkez İstasyonu';
    const currentTimestamp = new Date().toISOString();

    // Find the latest active shift for this user (durum = 'GÖREVDE' AND cikis_tarihi IS NULL)
    const activeShift = await queryOne(
      `SELECT id FROM public.personnel_shifts_log
       WHERE personnel_id = $1 AND durum = 'GÖREVDE' AND cikis_tarihi IS NULL
       ORDER BY giris_tarihi DESC
       LIMIT 1`,
      [personnelId]
    );

    if (!activeShift) {
      return NextResponse.json(
        { error: 'Sonlandırılacak aktif bir göreviniz bulunmamaktadır.' },
        { status: 400 }
      );
    }

    // Update the active shift record
    const result = await queryOne(
      `UPDATE public.personnel_shifts_log
       SET cikis_tarihi = $1, durum = 'TAMAMLANDI'
       WHERE id = $2
       RETURNING *`,
      [currentTimestamp, activeShift.id]
    );

    // Also add to audit logs to maintain log integrity
    await queryOne(
      `INSERT INTO public.audit_logs (action_type, actor_sicil_no, actor_name, target, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        'nobet_bitis',
        sicilNo,
        adSoyad,
        istasyon,
        JSON.stringify({ cihaz: 'Web/PDKS', timestamp: currentTimestamp })
      ]
    ).catch(e => console.error('[EndShift] audit_logs insert error:', e));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[shift-log/end] Sunucu hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
