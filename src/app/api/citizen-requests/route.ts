import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

interface BacaTemizlikBody {
  type: 'baca_temizligi';
  ad_soyad: string;
  telefon: string;
  adres: string;
  bina_tipi: string;
}

interface YanginRaporBody {
  type: 'yangin_olur_raporu';
  ad_soyad: string;
  telefon: string;
  adres: string;
  bina_tipi: string;
  isyeri_adi_turu: string;
}

type CitizenRequestBody = BacaTemizlikBody | YanginRaporBody;

// Otomatik tablo oluşturma yardımcıları (KVKK Temizliği Yapıldı)
async function ensureTablesExist() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.baca_temizlik_basvurulari (
        id SERIAL PRIMARY KEY,
        takip_kodu VARCHAR(50) UNIQUE NOT NULL,
        ad_soyad VARCHAR(100) NOT NULL,
        telefon VARCHAR(20) NOT NULL,
        adres TEXT NOT NULL,
        bina_tipi VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.yangin_rapor_basvurulari (
        id SERIAL PRIMARY KEY,
        takip_kodu VARCHAR(50) UNIQUE NOT NULL,
        ad_soyad VARCHAR(100) NOT NULL,
        telefon VARCHAR(20) NOT NULL,
        adres TEXT NOT NULL,
        bina_tipi VARCHAR(50) NOT NULL,
        isyeri_adi_turu VARCHAR(150) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[citizen-requests] Tablo oluşturma hatası:', msg);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Tabloların varlığını garanti et
    await ensureTablesExist();

    const body = (await request.json()) as CitizenRequestBody;
    const year = new Date().getFullYear();

    if (body.type === 'baca_temizligi') {
      const { ad_soyad, telefon, adres, bina_tipi } = body;
      if (!ad_soyad || !telefon || !adres || !bina_tipi) {
        return NextResponse.json(
          { error: 'Tüm alanların doldurulması zorunludur.' },
          { status: 400 }
        );
      }

      // Aynı yıl içindeki mevcut başvuruları sayıp takip kodu üret
      const pattern = `SVS-BACA-${year}-%`;
      const countRes = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM public.baca_temizlik_basvurulari WHERE takip_kodu LIKE $1',
        [pattern]
      );
      const count = countRes ? parseInt(countRes.count, 10) : 0;
      const trackingCode = `SVS-BACA-${year}-${String(count + 1).padStart(3, '0')}`;

      // Güvenli kayıt işlemi
      const insertRes = await query(
        `INSERT INTO public.baca_temizlik_basvurulari (takip_kodu, ad_soyad, telefon, adres, bina_tipi)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [trackingCode, ad_soyad.trim(), telefon.trim(), adres.trim(), bina_tipi.trim()]
      );

      // Ayrıca public.citizen_requests tablosuna da kaydet
      try {
        await query(
          `INSERT INTO public.citizen_requests (talep_turu, basvuru_tarihi, basvuran_tc, basvuran_ad_soyad, irtibat_tel, adres, durum, baca_detaylari)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'Baca Temizliği',
            new Date().toISOString(),
            trackingCode,
            ad_soyad.trim(),
            telefon.trim(),
            adres.trim(),
            'Bekliyor',
            JSON.stringify({
              kat_sayisi: 1,
              daire_sayisi: 1,
              yakit_tipi: 'Doğalgaz',
              baca_tipi: bina_tipi.trim()
            })
          ]
        );
      } catch (err) {
        console.error('[citizen-requests] citizen_requests tablosuna kaydedilemedi:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'Baca temizliği başvurunuz başarıyla alınmıştır.',
        trackingCode,
        data: insertRes.rows[0],
      });

    } else if (body.type === 'yangin_olur_raporu') {
      const { ad_soyad, telefon, adres, bina_tipi, isyeri_adi_turu } = body;
      if (!ad_soyad || !telefon || !adres || !bina_tipi || !isyeri_adi_turu) {
        return NextResponse.json(
          { error: 'Tüm alanların doldurulması zorunludur.' },
          { status: 400 }
        );
      }

      // Aynı yıl içindeki mevcut başvuruları sayıp takip kodu üret
      const pattern = `SVS-YANGIN-${year}-%`;
      const countRes = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM public.yangin_rapor_basvurulari WHERE takip_kodu LIKE $1',
        [pattern]
      );
      const count = countRes ? parseInt(countRes.count, 10) : 0;
      const trackingCode = `SVS-YANGIN-${year}-${String(count + 1).padStart(3, '0')}`;

      // Güvenli kayıt işlemi
      const insertRes = await query(
        `INSERT INTO public.yangin_rapor_basvurulari (takip_kodu, ad_soyad, telefon, adres, bina_tipi, isyeri_adi_turu)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [trackingCode, ad_soyad.trim(), telefon.trim(), adres.trim(), bina_tipi.trim(), isyeri_adi_turu.trim()]
      );

      // Ayrıca public.citizen_requests tablosuna da kaydet
      try {
        await query(
          `INSERT INTO public.citizen_requests (talep_turu, basvuru_tarihi, basvuran_tc, basvuran_ad_soyad, irtibat_tel, adres, durum, isyeri_detaylari)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'İtfaiye Uygunluk Raporu',
            new Date().toISOString(),
            trackingCode,
            ad_soyad.trim(),
            telefon.trim(),
            adres.trim(),
            'Bekliyor',
            JSON.stringify({
              faaliyet_konusu: isyeri_adi_turu.trim(),
              alan_m2: 100,
              yangin_dolabi: 'Mevcut',
              acil_cikis: '1 Adet',
              bina_tipi: bina_tipi.trim()
            })
          ]
        );
      } catch (err) {
        console.error('[citizen-requests] citizen_requests tablosuna kaydedilemedi:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'İtfaiye olur raporu başvurunuz başarıyla alınmıştır.',
        trackingCode,
        data: insertRes.rows[0],
      });

    } else {
      return NextResponse.json(
        { error: 'Geçersiz başvuru türü.' },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[citizen-requests/POST] Hata:', msg);
    return NextResponse.json(
      { error: 'Sunucu hatası oluştu: ' + msg },
      { status: 500 }
    );
  }
}
