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
      'SELECT id, ad, soyad, istasyon, posta FROM public.personnel WHERE sicil_no = $1',
      [sicilNo]
    );

    if (!person) {
      return NextResponse.json({ error: 'Personel kaydı bulunamadı.' }, { status: 404 });
    }

    const personnelId = person.id;
    const adSoyad = `${person.ad} ${person.soyad}`;
    const istasyon = person.istasyon || 'Merkez İstasyonu';
    const posta = person.posta || 'İdari Kadro';
    const currentTimestamp = new Date().toISOString();

    // Check if there is already an active shift for this user (durum = 'GÖREVDE')
    const activeShift = await queryOne(
      "SELECT id FROM public.personnel_shifts_log WHERE personnel_id = $1 AND durum = 'GÖREVDE' AND cikis_tarihi IS NULL",
      [personnelId]
    );

    if (activeShift) {
      return NextResponse.json(
        { error: 'Zaten aktif bir göreviniz devam ediyor. Önce onu sonlandırmalısınız.' },
        { status: 400 }
      );
    }

    // Insert the new shift log
    const result = await queryOne(
      `INSERT INTO public.personnel_shifts_log (personnel_id, personel_ad_soyad, istasyon, posta, giris_tarihi, durum)
       VALUES ($1, $2, $3, $4, $5, 'GÖREVDE')
       RETURNING *`,
      [personnelId, adSoyad, istasyon, posta, currentTimestamp]
    );

    // Also add to audit logs to maintain log integrity
    await queryOne(
      `INSERT INTO public.audit_logs (action_type, actor_sicil_no, actor_name, target, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        'nobet_baslangic',
        sicilNo,
        adSoyad,
        istasyon,
        JSON.stringify({ cihaz: 'Web/PDKS', timestamp: currentTimestamp, geofence: '50m_ici' })
      ]
    ).catch(e => console.error('[StartShift] audit_logs insert error:', e));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[shift-log/start] Sunucu hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
