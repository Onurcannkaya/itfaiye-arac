import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, queryMany } from '@/lib/db';

interface BacaRow {
  id: number;
  takip_kodu: string;
  ad_soyad: string;
  telefon: string;
  adres: string;
  bina_tipi: string;
  created_at: string;
}

interface YanginRow {
  id: number;
  takip_kodu: string;
  ad_soyad: string;
  telefon: string;
  adres: string;
  bina_tipi: string;
  isyeri_adi_turu: string;
  created_at: string;
}

interface CitizenRequestRow {
  id: string | number;
  talep_turu: string;
  basvuru_tarihi: string;
  basvuran_tc: string;
  basvuran_ad_soyad: string;
  irtibat_tel: string;
  adres: string;
  durum: 'Bekliyor' | 'Ekip Atandı' | 'Ödeme Bekliyor' | 'Onaylandı' | 'Reddedildi';
  created_at: string;
  baca_detaylari?: Record<string, unknown>;
  isyeri_detaylari?: Record<string, unknown>;
}

async function ensureTablesExist(): Promise<void> {
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
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureTablesExist();

    // 1. COUNT(*) queries for each table
    const bacaCountRes = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM public.baca_temizlik_basvurulari');
    const yanginCountRes = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM public.yangin_rapor_basvurulari');

    const rawBacaCount = bacaCountRes ? parseInt(bacaCountRes.count, 10) : 0;
    const rawYanginCount = yanginCountRes ? parseInt(yanginCountRes.count, 10) : 0;

    // 2. Fetch all records from public.citizen_requests
    const citizenRequests = await queryMany<CitizenRequestRow>('SELECT * FROM public.citizen_requests');
    const bacaRequests = await queryMany<BacaRow>('SELECT * FROM public.baca_temizlik_basvurulari');
    const yanginRequests = await queryMany<YanginRow>('SELECT * FROM public.yangin_rapor_basvurulari');

    // 3. Map and unify all requests
    const unifiedRequests: CitizenRequestRow[] = [];

    // Map existing citizen_requests
    citizenRequests.forEach((req) => {
      unifiedRequests.push({
        id: String(req.id),
        talep_turu: req.talep_turu,
        basvuru_tarihi: req.basvuru_tarihi || req.created_at,
        basvuran_tc: req.basvuran_tc || '11111111111',
        basvuran_ad_soyad: req.basvuran_ad_soyad,
        irtibat_tel: req.irtibat_tel,
        adres: req.adres,
        baca_detaylari: req.baca_detaylari || undefined,
        isyeri_detaylari: req.isyeri_detaylari || undefined,
        durum: req.durum || 'Bekliyor',
        created_at: req.created_at
      });
    });

    // Map and append baca_temizlik_basvurulari
    bacaRequests.forEach((req) => {
      const exists = unifiedRequests.some(r => r.basvuran_tc === req.takip_kodu);
      if (!exists) {
        unifiedRequests.push({
          id: `baca-${req.id}`,
          talep_turu: 'Baca Temizliği',
          basvuru_tarihi: req.created_at,
          basvuran_tc: req.takip_kodu,
          basvuran_ad_soyad: req.ad_soyad,
          irtibat_tel: req.telefon,
          adres: req.adres,
          baca_detaylari: {
            kat_sayisi: 1,
            daire_sayisi: 1,
            yakit_tipi: 'Doğalgaz',
            baca_tipi: req.bina_tipi
          },
          durum: 'Bekliyor',
          created_at: req.created_at
        });
      }
    });

    // Map and append yangin_rapor_basvurulari
    yanginRequests.forEach((req) => {
      const exists = unifiedRequests.some(r => r.basvuran_tc === req.takip_kodu);
      if (!exists) {
        unifiedRequests.push({
          id: `yangin-${req.id}`,
          talep_turu: 'İtfaiye Uygunluk Raporu',
          basvuru_tarihi: req.created_at,
          basvuran_tc: req.takip_kodu,
          basvuran_ad_soyad: req.ad_soyad,
          irtibat_tel: req.telefon,
          adres: req.adres,
          isyeri_detaylari: {
            faaliyet_konusu: req.isyeri_adi_turu,
            alan_m2: 100,
            yangin_dolabi: 'Mevcut',
            acil_cikis: '1 Adet',
            bina_tipi: req.bina_tipi
          },
          durum: 'Bekliyor',
          created_at: req.created_at
        });
      }
    });

    // Sort unified requests by date descending
    unifiedRequests.sort((a, b) => new Date(b.basvuru_tarihi).getTime() - new Date(a.basvuru_tarihi).getTime());

    // Calculate dynamic counts including manuals
    const totalBaca = unifiedRequests.filter(r => r.talep_turu.includes('Baca')).length;
    const totalYangin = unifiedRequests.filter(r => r.talep_turu.includes('Uygunluk') || r.talep_turu.includes('Ruhsat')).length;
    const totalEgitim = unifiedRequests.filter(r => r.talep_turu.includes('Eğitim')).length;

    // Total simulated revenue based on approved applications
    const revenue = unifiedRequests
      .filter(r => r.durum === 'Onaylandı')
      .reduce((sum, r) => {
        if (r.talep_turu.includes('Baca')) return sum + 650;
        if (r.talep_turu.includes('Eğitim')) return sum + 1200;
        return sum + 2450; // İtfaiye Uygunluk Raporu / Ruhsat
      }, 0);

    return NextResponse.json({
      success: true,
      bacaTableCount: rawBacaCount,
      yanginTableCount: rawYanginCount,
      bacaCount: totalBaca,
      yanginCount: totalYangin,
      egitimCount: totalEgitim,
      revenue,
      requests: unifiedRequests
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[hizmet-yonetimi] GET Hata:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
