import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { Vehicle, AracBakimGecmisi, FuelLog } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // JWT yetki kontrolü
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    // 1. vehicles tablosunu sorgula (GARAJ hariç, bolmeler JSON parse edilir)
    const vehiclesResult = await query("SELECT * FROM vehicles WHERE plaka != 'GARAJ' ORDER BY plaka ASC");
    const vehicles: Vehicle[] = vehiclesResult.rows.map((row: any) => ({
      plaka: row.plaka,
      aracTipi: row.arac_tipi || row.aracTipi,
      arac_tipi: row.arac_tipi || row.aracTipi,
      marka: row.marka || '',
      km: row.km || 0,
      motorSaatiPTO: row.motorSaatiPTO || 0,
      durum: row.durum || 'aktif',
      sigortaBitis: row.sigortaBitis || '',
      muayeneBitis: row.muayeneBitis || '',
      next_inspection_date: row.next_inspection_date
        ? new Date(row.next_inspection_date).toISOString().split('T')[0]
        : (row.muayeneBitis
            ? new Date(row.muayeneBitis).toISOString().split('T')[0]
            : 'Tarih Girilmedi'),
      istasyon: row.istasyon || '',
      yil: row.yil || 0,
      model: row.model || '',
      su_kapasite: row.su_kapasite || 0,
      kopuk_kapasite: row.kopuk_kapasite || 0,
      bolmeler: typeof row.bolmeler === 'string' ? JSON.parse(row.bolmeler) : (row.bolmeler || {}),
    }));

    // 2. arac_bakim_gecmisi tablosunu sorgula
    const logsResult = await query('SELECT * FROM public.arac_bakim_gecmisi ORDER BY tarih DESC');
    const logs: AracBakimGecmisi[] = logsResult.rows.map((row: any) => ({
      id: row.id,
      plaka: row.plaka,
      tarih: row.tarih ? new Date(row.tarih).toISOString().split('T')[0] : '',
      tip: row.tip as 'tamir' | 'yag_bakimi',
      aciklama: row.aciklama,
      maliyet: Number(row.maliyet) || 0,
      created_at: row.created_at,
    }));

    // 3. fuel_logs tablosunu sorgula
    const fuelLogsResult = await query('SELECT * FROM public.fuel_logs ORDER BY tarih DESC');
    const fuelLogs: FuelLog[] = fuelLogsResult.rows.map((row: any) => ({
      id: row.id,
      plaka: row.plaka,
      litre: Number(row.litre) || 0,
      tutar: Number(row.tutar) || 0,
      kmAt: row.kmAt || 0,
      istasyon: row.istasyon || '',
      tarih: row.tarih ? new Date(row.tarih).toISOString().split('T')[0] : '',
      kayitEden: row.kayitEden || '',
    }));

    return NextResponse.json({
      vehicles,
      logs,
      fuelLogs,
    });
  } catch (error: any) {
    console.error('[api/bakim] Hata:', error);
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
