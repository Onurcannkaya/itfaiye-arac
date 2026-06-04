import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest, AuthError, hashPassword } from '@/lib/auth';

// Turkish character mapping and username helpers
function removeTurkishChars(str: string): string {
  const map: Record<string, string> = {
    İ: "i", ı: "i", Ö: "o", ö: "o", Ü: "u", ü: "u",
    Ş: "s", ş: "s", Ç: "c", ç: "c", Ğ: "g", ğ: "g",
  };
  return str.replace(/[İıÖöÜüŞşÇçĞğ]/g, (ch) => map[ch] || ch);
}

function generateUsername(ad: string, soyad: string): string {
  const firstLetter = removeTurkishChars(ad.charAt(0)).toLowerCase();
  const surname = removeTurkishChars(soyad).toLowerCase();
  return firstLetter + surname;
}


// İzin verilen tablolar (SQL injection koruması)
const ALLOWED_TABLES = [
  'vehicles', 'personnel', 'maintenance_logs', 'fuel_logs', 'tasks',
  'task_templates', 'scba_cylinders', 'scba_fill_logs', 'incident_reports',
  'auth_logs', 'audit_logs', 'inventory_checks', 'personnel_details',
  'personnel_leaves', 'personnel_records', 'personnel_equipment',
  'incidents', 'incident_vehicles', 'incident_personnel', 'incident_media',
  'citizen_requests', 'activities_and_trainings', 'personnel_activities',
  'vehicle_maintenances', 'fire_hydrants', 'spatial_addresses',
  'staff_certifications', 'vw_expiring_certifications', 'unified_system_logs', 'daily_vehicle_checks',
  'role_permissions', 'duty_logs', 'arac_bakim_gecmisi', 'temp_passwords',
  'baca_temizlik_basvurulari', 'yangin_rapor_basvurulari', 'inventory', 'vehicle_inventory'
];

async function ensureRolePermissionsTableExists() {
  try {
    // Tablo oluştur
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        rol TEXT NOT NULL,
        sayfa_id TEXT NOT NULL,
        izinli BOOLEAN NOT NULL DEFAULT true,
        UNIQUE(rol, sayfa_id)
      )
    `);

    // Tabloda veri var mı kontrol et ve seed/eksik kayıtları tamamla
    // 5 rol: 'Müdür', 'Amir', 'Çavuş', 'Santral', 'Er'
    // 5 sayfa_id: 'harita', 'personel_yonetimi', 'arac_bakim', 'envanter', 'raporlar'
    const defaultPermissions = [
      // Müdür (Her şeye izinli)
      { rol: 'Müdür', sayfa_id: 'harita', izinli: true },
      { rol: 'Müdür', sayfa_id: 'personel_yonetimi', izinli: true },
      { rol: 'Müdür', sayfa_id: 'arac_bakim', izinli: true },
      { rol: 'Müdür', sayfa_id: 'envanter', izinli: true },
      { rol: 'Müdür', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Müdür', sayfa_id: 'egitimler', izinli: true },
      { rol: 'Müdür', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Müdür', sayfa_id: 'gorevler', izinli: true },

      // Amir
      { rol: 'Amir', sayfa_id: 'harita', izinli: true },
      { rol: 'Amir', sayfa_id: 'personel_yonetimi', izinli: true },
      { rol: 'Amir', sayfa_id: 'arac_bakim', izinli: true },
      { rol: 'Amir', sayfa_id: 'envanter', izinli: true },
      { rol: 'Amir', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Amir', sayfa_id: 'egitimler', izinli: true },
      { rol: 'Amir', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Amir', sayfa_id: 'gorevler', izinli: true },

      // Çavuş
      { rol: 'Çavuş', sayfa_id: 'harita', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'personel_yonetimi', izinli: false },
      { rol: 'Çavuş', sayfa_id: 'arac_bakim', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'envanter', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'egitimler', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'gorevler', izinli: true },

      // Santral
      { rol: 'Santral', sayfa_id: 'harita', izinli: true },
      { rol: 'Santral', sayfa_id: 'personel_yonetimi', izinli: false },
      { rol: 'Santral', sayfa_id: 'arac_bakim', izinli: false },
      { rol: 'Santral', sayfa_id: 'envanter', izinli: false },
      { rol: 'Santral', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Santral', sayfa_id: 'egitimler', izinli: false },
      { rol: 'Santral', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Santral', sayfa_id: 'gorevler', izinli: true },

      // Er
      { rol: 'Er', sayfa_id: 'harita', izinli: true },
      { rol: 'Er', sayfa_id: 'personel_yonetimi', izinli: false },
      { rol: 'Er', sayfa_id: 'arac_bakim', izinli: false },
      { rol: 'Er', sayfa_id: 'envanter', izinli: true },
      { rol: 'Er', sayfa_id: 'raporlar', izinli: false },
      { rol: 'Er', sayfa_id: 'egitimler', izinli: false },
      { rol: 'Er', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Er', sayfa_id: 'gorevler', izinli: true }
    ];

    for (const p of defaultPermissions) {
      await query(
        'INSERT INTO role_permissions (rol, sayfa_id, izinli) VALUES ($1, $2, $3) ON CONFLICT (rol, sayfa_id) DO NOTHING',
        [p.rol, p.sayfa_id, p.izinli]
      );
    }
  } catch (err) {
    console.error('ensureRolePermissionsTableExists hatası:', err);
  }
}

async function ensureDutyLogsTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS duty_logs (
        id SERIAL PRIMARY KEY,
        sicil_no TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION
      )
    `);
  } catch (err) {
    console.error('ensureDutyLogsTableExists hatası:', err);
  }
}

async function ensureVehicleColumnsExist() {
  try {
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS marka VARCHAR;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS istasyon TEXT;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS yil INTEGER;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS model TEXT;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS su_kapasite INTEGER DEFAULT 0;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS kopuk_kapasite INTEGER DEFAULT 0;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS next_inspection_date DATE;`);
    await query(`UPDATE public.vehicles SET next_inspection_date = "muayeneBitis" WHERE next_inspection_date IS NULL AND "muayeneBitis" IS NOT NULL;`);
    
    // Phase 28.21: Add physical status column and sync
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';`);
    await query(`UPDATE public.vehicles SET status = 'maintenance' WHERE durum IN ('bakımda', 'serviste', 'Bekliyor', 'Serviste', 'maintenance', 'Bakımda');`);
    await query(`UPDATE public.vehicles SET status = 'active' WHERE status != 'maintenance' OR status IS NULL;`);
  } catch (err) {
    console.error('ensureVehicleColumnsExist hatası:', err);
  }
}

async function ensureAracBakimGecmisiTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.arac_bakim_gecmisi (
        id SERIAL PRIMARY KEY,
        plaka VARCHAR(15) NOT NULL,
        tarih DATE NOT NULL,
        tip VARCHAR(50) NOT NULL, -- 'tamir' veya 'yag_bakimi'
        aciklama TEXT NOT NULL,
        maliyet NUMERIC(10, 2) DEFAULT 0,
        durum VARCHAR(20) DEFAULT 'Onaylandı',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE public.arac_bakim_gecmisi ADD COLUMN IF NOT EXISTS durum VARCHAR(20) DEFAULT 'Onaylandı'`);
    await query(`CREATE INDEX IF NOT EXISTS idx_arac_bakim_gecmisi_plaka ON public.arac_bakim_gecmisi(plaka)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_arac_bakim_gecmisi_tarih ON public.arac_bakim_gecmisi(tarih DESC)`);
  } catch (err: unknown) {
    console.error('ensureAracBakimGecmisiTableExists hatası:', err);
  }
}

async function ensureUnifiedSystemLogsViewExists() {
  try {
    await query(`
      CREATE OR REPLACE VIEW public.unified_system_logs AS
      SELECT 
        id, 
        created_at AS tarih, 
        plaka, 
        'Günlük Kontrol' AS islem_tipi, 
        kontrol_eden_sicil AS sicil, 
        kontrol_eden_ad AS ad_soyad,
        (CASE 
          WHEN yakit_durumu IN ('Boş', 'Az') 
            OR su_durumu IN ('Boş', 'Az') 
            OR kopuk_durumu IN ('Boş', 'Az') 
            OR pompa_durumu = 'Arızalı' 
            OR lastik_durumu = 'Kötü' 
            OR far_durumu = 'Arızalı' 
            OR genel_temizlik = 'Kötü'
          THEN 'Sorunlu' 
          ELSE 'Kusursuz' 
        END) AS durum, 
        notlar AS detaylar
      FROM public.daily_vehicle_checks
      
      UNION ALL
      
      SELECT 
        id, 
        created_at AS tarih, 
        plaka, 
        'Envanter Sayımı' AS islem_tipi, 
        kontrol_eden AS sicil, 
        kontrol_eden AS ad_soyad,
        (CASE WHEN yeni_durum IN ('Eksik', 'Arızalı') THEN 'Sorunlu' ELSE 'Kusursuz' END) AS durum, 
        CONCAT(bolme, ' - ', malzeme, ' (', yeni_durum, ')', COALESCE(' - Not: ' || notlar, '')) AS detaylar
      FROM public.inventory_checks

      UNION ALL

      SELECT 
        id, 
        created_at AS tarih, 
        '-' AS plaka, 
        (CASE WHEN action_type = 'nobet_baslangic' THEN 'Nöbet Başlangıcı' ELSE 'Nöbet Bitişi' END) AS islem_tipi, 
        actor_sicil_no AS sicil, 
        actor_name AS ad_soyad, 
        'Kusursuz' AS durum, 
        CONCAT(target, COALESCE(' - Cihaz: ' || (details->>'cihaz'), ''), COALESCE(' - Geofence: ' || (details->>'geofence'), '')) AS detaylar
      FROM public.audit_logs
      WHERE action_type IN ('nobet_baslangic', 'nobet_bitis')
    `);
  } catch (err: unknown) {
    console.error('ensureUnifiedSystemLogsViewExists hatası:', err);
  }
}

const REAL_VEHICLES = [
  { plaka: "58 AEL 289", arac_tipi: "Arazöz", marka: "IVECO", model: "Iveco Eurocargo", yil: 2020, su_kapasite: 6000, kopuk_kapasite: 500, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AP 614", arac_tipi: "Merdivenli", marka: "FORD", model: "Ford Cargo Merdiven", yil: 2015, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Esentepe Şubesi" },
  { plaka: "58 FR 021", arac_tipi: "Tanker", marka: "BMC", model: "BMC Fatih Tanker", yil: 2016, su_kapasite: 18000, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 FP 968", arac_tipi: "Arazöz", marka: "BMC", model: "BMC Profesyonel Arazöz", yil: 2014, su_kapasite: 8000, kopuk_kapasite: 800, istasyon: "Fatih İstasyonu" },
  { plaka: "58 NN 694", arac_tipi: "Lojistik", marka: "FIAT", model: "Fiat Doblo", yil: 2018, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 FR 872", arac_tipi: "Arazöz", marka: "HINO", model: "Hino Arazöz", yil: 2008, su_kapasite: 4000, kopuk_kapasite: 300, istasyon: "Merkez İstasyonu" },
  { plaka: "58 TU 817", arac_tipi: "Merdivenli", marka: "FORD", model: "Ford Platform Merdivenli", yil: 2019, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Kılavuz İstasyonu" },
  { plaka: "58 TL 737", arac_tipi: "Lojistik", marka: "FORD", model: "Ford Transit Klavuz", yil: 2012, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "34 UP 2541", arac_tipi: "Kurtarma", marka: "MERCEDES", model: "Mercedes Sprinter Kurtarma", yil: 2017, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 ACT 367", arac_tipi: "Arazöz", marka: "FORD", model: "Ford Arazöz", yil: 2021, su_kapasite: 6000, kopuk_kapasite: 500, istasyon: "Merkez İstasyonu" },
  { plaka: "58 ACU 765", arac_tipi: "Arazöz", marka: "MAN", model: "MAN Arazöz", yil: 2018, su_kapasite: 10000, kopuk_kapasite: 1000, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AP 601", arac_tipi: "Merdivenli", marka: "FORD", model: "Ford Cargo Merdiven", yil: 2010, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AY 164", arac_tipi: "Antika", marka: "FORD", model: "Antika Merdiven", yil: 1960, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AC 113", arac_tipi: "Antika", marka: "DODGE", model: "Antika Dodge 1936", yil: 1936, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 DK 650", arac_tipi: "Merdivenli", marka: "MERCEDES", model: "Organize Sanayi Merdivenli", yil: 2015, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Organize İstasyonu" },
  { plaka: "58 TH 256", arac_tipi: "Kurtarma", marka: "IVECO", model: "Iveco Daily Hızlı Müdahale", yil: 2022, su_kapasite: 1000, kopuk_kapasite: 100, istasyon: "Merkez İstasyonu" },
  { plaka: "58 TH 257", arac_tipi: "Kurtarma", marka: "IVECO", model: "Iveco Arama Kurtarma", yil: 2022, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AF 240", arac_tipi: "Tanker", marka: "BMC", model: "BMC Organize Tanker", yil: 2013, su_kapasite: 15000, kopuk_kapasite: 0, istasyon: "Organize İstasyonu" },
  { plaka: "58 NC 182", arac_tipi: "Kurtarma", marka: "MERCEDES", model: "Mercedes 8 Numara Arazöz", yil: 2005, su_kapasite: 3000, kopuk_kapasite: 200, istasyon: "Merkez İstasyonu" },
  { plaka: "58 NC 184", arac_tipi: "Merdivenli", marka: "MERCEDES", model: "Mercedes 54 Metre Dev Merdiven", yil: 2012, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 TD 315", arac_tipi: "Lojistik", marka: "HYUNDAI", model: "Hyundai Accent Lojistik", yil: 2011, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AGF 355", arac_tipi: "Arazöz", marka: "RENAULT", model: "Renault Midlum Arazöz", yil: 2020, su_kapasite: 7000, kopuk_kapasite: 600, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AEH 221", arac_tipi: "Merdivenli", marka: "MAN", model: "MAN 42m Merdivenli", yil: 2016, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 HD 458", arac_tipi: "Tanker", marka: "MERCEDES", model: "Mercedes Actros 22 Ton Tanker", yil: 2018, su_kapasite: 22000, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" }
];

function getPresetCompartments(type: string) {
  switch (type) {
    case "Arazöz":
      return {
        kabin_ici: [
          { malzeme: "Kriko", adet: 1, durum: "Tam" },
          { malzeme: "Lastik Şişirme Aparatı", adet: 1, durum: "Tam" },
          { malzeme: "Çeki Demiri", adet: 1, durum: "Tam" },
          { malzeme: "Şarjlı Projektör", adet: 1, durum: "Tam" }
        ],
        sag_on_kapak: [
          { malzeme: "Ayaklı Aydınlatma Lambası", adet: 1, durum: "Tam" },
          { malzeme: "Jeneratör", adet: 1, durum: "Tam" },
          { malzeme: "Hidrolik Güç Ünitesi", adet: 1, durum: "Tam" },
          { malzeme: "Hidrolik Kesici", adet: 1, durum: "Tam" },
          { malzeme: "Hidrolik Ayırıcı", adet: 2, durum: "Tam" }
        ],
        sol_arka_kapak: [
          { malzeme: "85'lik Hortum", adet: 5, durum: "Tam" },
          { malzeme: "85'lik Turbo Lans", adet: 2, durum: "Tam" },
          { malzeme: "85'lik Kollu Lans", adet: 2, durum: "Tam" },
          { malzeme: "Ağır Köpük Lansı", adet: 1, durum: "Tam" }
        ]
      };
    case "Hızlı Müdahale":
      return {
        sol_on_kapak: [
          { malzeme: "Holmatro Güç Ünitesi", adet: 1, durum: "Tam" },
          { malzeme: "Holmatro Kesici", adet: 1, durum: "Tam" },
          { malzeme: "Holmatro Ayırıcı", adet: 1, durum: "Tam" },
          { malzeme: "Hilti", adet: 1, durum: "Tam" },
          { malzeme: "Amir Baltası", adet: 1, durum: "Tam" }
        ],
        sol_arka_kapak: [
          { malzeme: "85'lik Hortum", adet: 5, durum: "Tam" },
          { malzeme: "85'lik Turbo Lans", adet: 2, durum: "Tam" },
          { malzeme: "Ala Hortum Süzgeci", adet: 1, durum: "Tam" }
        ],
        arac_ustu: [
          { malzeme: "Alıcı Hortum", adet: 2, durum: "Tam" },
          { malzeme: "Dalgıç Pompa", adet: 1, durum: "Tam" },
          { malzeme: "Seyyar Merdiven", adet: 1, durum: "Tam" }
        ]
      };
    case "Kurtarma":
      return {
        sol_on_kapak: [
          { malzeme: "Kaşık Sedye", adet: 1, durum: "Tam" },
          { malzeme: "Tripot", adet: 1, durum: "Tam" },
          { malzeme: "Jeneratör", adet: 2, durum: "Tam" }
        ],
        sol_orta_kapak: [
          { malzeme: "Hidrolik El Manueli ve Hortumu", adet: 1, durum: "Tam" },
          { malzeme: "Manuel Kapı Açma", adet: 1, durum: "Tam" },
          { malzeme: "Cam Kırma Aparatı", adet: 1, durum: "Tam" }
        ],
        sol_arka_kapak: [
          { malzeme: "Beton Kesme Motoru", adet: 1, durum: "Tam" },
          { malzeme: "Kıvılcımsız Testere", adet: 1, durum: "Tam" },
          { malzeme: "Trifor ve Halatı", adet: 1, durum: "Tam" }
        ],
        sag_on_kapak: [
          { malzeme: "Holmatro Ayırma Şarjlı", adet: 1, durum: "Tam" },
          { malzeme: "Holmatro Kesici Şarjlı", adet: 1, durum: "Tam" },
          { malzeme: "Tahta Takoz", adet: 4, durum: "Tam" },
          { malzeme: "Sapan", adet: 1, durum: "Tam" }
        ]
      };
    case "Merdivenli":
      return {
        arac_ici: [
          { malzeme: "El Feneri", adet: 3, durum: "Tam" },
          { malzeme: "Yangın Battaniyesi", adet: 1, durum: "Tam" },
          { malzeme: "Yaralı Sabitleme Sargısı", adet: 2, durum: "Tam" }
        ],
        sag_on_kapak: [
          { malzeme: "6 KG YSK Tüpü", adet: 2, durum: "Tam" },
          { malzeme: "Temiz Hava Solunum Cihazı", adet: 2, durum: "Tam" }
        ],
        sol_on_kapak: [
          { malzeme: "Büyük Amir Baltası", adet: 1, durum: "Tam" },
          { malzeme: "Büyük Balta", adet: 1, durum: "Tam" },
          { malzeme: "Duba", adet: 2, durum: "Tam" }
        ]
      };
    case "Lojistik":
    case "Tanker":
    default:
      return {
        kabin_ici: [
          { malzeme: "İlk Yardım Çantası", adet: 1, durum: "Tam" },
          { malzeme: "El Feneri", adet: 2, durum: "Tam" }
        ],
        arka_bolme: [
          { malzeme: "85'lik Hortum", adet: 4, durum: "Tam" },
          { malzeme: "Alıcı Hortum Süzgeci", adet: 1, durum: "Tam" },
          { malzeme: "85'lik Kollu Lans", adet: 2, durum: "Tam" }
        ]
      };
  }
}

async function autoSeedVehiclesIfEmpty() {
  try {
    const countRes = await query('SELECT COUNT(*) FROM vehicles');
    const count = parseInt(countRes.rows[0]?.count || '0', 10);
    if (count === 0) {
      for (const v of REAL_VEHICLES) {
        const presetCompartments = getPresetCompartments(v.arac_tipi);
        await query(
          'INSERT INTO vehicles (plaka, arac_tipi, marka, durum, bolmeler, km, "motorSaatiPTO", "sigortaBitis", "muayeneBitis", next_inspection_date, istasyon, yil, model) ' +
          'VALUES ($1, $2, $3, ' + (v.yil > 1960 ? "'aktif'" : "'arızalı'") + ', $4, $5, $6, $7, $8, $9, $10, $11, $12) ' +
          'ON CONFLICT (plaka) DO NOTHING',
          [
            v.plaka,
            v.arac_tipi,
            v.marka || null,
            JSON.stringify(presetCompartments),
            v.yil > 2018 ? 24000 : 124000,
            v.yil > 2018 ? 450 : 2100,
            null,
            null,
            null,
            v.istasyon || null,
            v.yil || null,
            v.model || null
          ]
        );
      }
      console.log('✓ 24 taktik araç başarıyla seed edildi.');
    }
  } catch (err) {
    console.error('autoSeedVehiclesIfEmpty hatası:', err);
  }
}



function parseFilters(searchParams: URLSearchParams): Array<{ column: string; op: string; value: string }> {
  const filters: Array<{ column: string; op: string; value: string }> = [];
  searchParams.getAll('filter').forEach(f => {
    const parts = f.split(':');
    if (parts.length >= 3) {
      filters.push({ column: parts[0], op: parts[1], value: parts.slice(2).join(':') });
    }
  });
  return filters;
}

function buildWhereClause(filters: Array<{ column: string; op: string; value: string }>, startIdx = 1): { clause: string; params: any[] } {
  if (filters.length === 0) return { clause: '', params: [] };
  
  const conditions: string[] = [];
  const params: any[] = [];
  let currentIdx = startIdx;
  
  filters.forEach((f) => {
    // Column name sanitization
    const col = f.column.replace(/[^a-zA-Z0-9_"]/g, '');
    switch (f.op) {
      case 'in':
        const vals = f.value.split(',');
        const placeholders = vals.map(() => `$${currentIdx++}`).join(', ');
        conditions.push(`"${col}" IN (${placeholders})`);
        params.push(...vals);
        break;
      case 'eq':
        if (f.value === 'null') { conditions.push(`"${col}" IS NULL`); }
        else { conditions.push(`"${col}" = $${currentIdx++}`); params.push(f.value); }
        break;
      case 'neq':
        if (f.value === 'null') { conditions.push(`"${col}" IS NOT NULL`); }
        else { conditions.push(`"${col}" != $${currentIdx++}`); params.push(f.value); }
        break;
      case 'gt': conditions.push(`"${col}" > $${currentIdx++}`); params.push(f.value); break;
      case 'gte': conditions.push(`"${col}" >= $${currentIdx++}`); params.push(f.value); break;
      case 'lt': conditions.push(`"${col}" < $${currentIdx++}`); params.push(f.value); break;
      case 'lte': conditions.push(`"${col}" <= $${currentIdx++}`); params.push(f.value); break;
      case 'like': conditions.push(`"${col}" LIKE $${currentIdx++}`); params.push(f.value); break;
      case 'ilike': conditions.push(`"${col}" ILIKE $${currentIdx++}`); params.push(f.value); break;
      default: conditions.push(`"${col}" = $${currentIdx++}`); params.push(f.value);
    }
  });

  return { clause: 'WHERE ' + conditions.join(' AND '), params };
}

/**
 * GET /api/db/[table] — SELECT
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'vehicles') {
      await ensureVehicleColumnsExist();
      await autoSeedVehiclesIfEmpty();
    }
    if (table === 'fire_hydrants') {
      await query(`ALTER TABLE public.fire_hydrants ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';`);
      await query(`UPDATE public.fire_hydrants SET status = 'broken' WHERE durum IN ('Arızalı', 'Bakımda', 'DEVRE_DIŞI', 'broken', 'Arızalı Musluk');`);
      await query(`UPDATE public.fire_hydrants SET status = 'active' WHERE durum NOT IN ('Arızalı', 'Bakımda', 'DEVRE_DIŞI', 'broken', 'Arızalı Musluk') OR durum IS NULL;`);
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
    }
    if (table === 'unified_system_logs') {
      await ensureUnifiedSystemLogsViewExists();
    }

    const { searchParams } = new URL(request.url);
    const select = searchParams.get('select') || '*';
    const filters = parseFilters(searchParams);
    const orderParam = searchParams.get('order');
    const limitParam = searchParams.get('limit');
    const countOnly = searchParams.get('count') === 'exact';

    const { clause, params: whereParams } = buildWhereClause(filters);

    let sql = '';
    if (countOnly) {
      sql = `SELECT COUNT(*) as count FROM ${table} ${clause}`;
    } else {
      // Select sanitization: allow * or comma-separated column names
      const safeCols = select === '*' ? '*' : select.split(',').map(c => `"${c.trim().replace(/[^a-zA-Z0-9_]/g, '')}"`).join(', ');
      sql = `SELECT ${safeCols} FROM ${table} ${clause}`;
    }

    if (orderParam) {
      const [col, dir] = orderParam.split(':');
      const safeCol = col.replace(/[^a-zA-Z0-9_"]/g, '');
      sql += ` ORDER BY "${safeCol}" ${dir === 'desc' ? 'DESC' : 'ASC'}`;
    }

    if (limitParam) {
      sql += ` LIMIT ${parseInt(limitParam, 10)}`;
    }

    const result = await query(sql, whereParams);

    if (countOnly) {
      return NextResponse.json({ count: parseInt(result.rows[0]?.count || '0', 10) });
    }

    return NextResponse.json({ data: result.rows, count: result.rowCount });
  } catch (error: any) {
    console.error(`[db/GET] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/db/[table] — INSERT / UPSERT
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    // JWT yetki kontrolü
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'vehicles') {
      await ensureVehicleColumnsExist();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
    }

    const body = await request.json();
    const rows = Array.isArray(body.data) ? body.data : [body.data];
    const upsert = body.upsert === true;
    const conflictColumn = body.conflictColumn;

    const insertedRows: any[] = [];

    for (const row of rows) {
      if (table === 'fire_hydrants' && row.status !== undefined) {
        row.durum = row.status === 'broken' ? 'DEVRE_DIŞI' : 'MEVCUT';
      }
      if (table === 'vehicles' && row.status !== undefined) {
        row.durum = row.status === 'maintenance' ? 'Bakımda' : 'aktif';
      }
      if (table === 'personnel') {
        // Generate username
        if (!row.username && row.ad && row.soyad) {
          const baseUsername = generateUsername(row.ad, row.soyad);
          let finalUsername = baseUsername;
          let counter = 1;
          while (true) {
            const check = await query('SELECT sicil_no FROM personnel WHERE username = $1', [finalUsername]);
            if (check.rows.length === 0) break;
            finalUsername = baseUsername + counter;
            counter++;
          }
          row.username = finalUsername;
        }

        // Handle password hashing if plain password is provided
        if (row.password) {
          const plainPassword = row.password;
          delete row.password; // remove plain password field before inserting to personnel table
          
          const hashed = await hashPassword(plainPassword);
          row.password_hash = hashed;

          // Insert/Upsert into temp_passwords
          await query(
            `INSERT INTO temp_passwords (sicil_no, username, ad, soyad, plain_password, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (sicil_no)
             DO UPDATE SET username = $2, ad = $3, soyad = $4, plain_password = $5, created_by = $6, created_at = NOW(), used = false, used_at = NULL`,
            [row.sicil_no, row.username || null, row.ad, row.soyad, plainPassword, session.sicilNo]
          );
        }
      }

      const keys = Object.keys(row);
      const safeCols = keys.map(k => `"${k.replace(/[^a-zA-Z0-9_]/g, '')}"`);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const values = keys.map(k => row[k]);

      let sql = `INSERT INTO ${table} (${safeCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      
      if (upsert && conflictColumn) {
        const updateCols = safeCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        sql += ` ON CONFLICT ("${conflictColumn.replace(/[^a-zA-Z0-9_]/g, '')}") DO UPDATE SET ${updateCols}`;
      }

      sql += ' RETURNING *';

      const result = await query(sql, values);
      if (result.rows[0]) insertedRows.push(result.rows[0]);
    }

    if (table === 'duty_logs') {
      for (const row of insertedRows) {
        const actionType = row.action === 'START_DUTY' ? 'nobet_baslangic' : 'nobet_bitis';
        const details = row.action === 'START_DUTY' 
          ? { cihaz: 'Mobil/Web', tarih: new Date().toISOString(), geofence: '50m_ici' }
          : { cihaz: 'Mobil/Web', tarih: new Date().toISOString() };
        
        await query(
          `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            actionType,
            session.sicilNo,
            `${session.ad} ${session.soyad}`,
            'Merkez İstasyonu',
            JSON.stringify(details)
          ]
        ).catch((err: unknown) => console.error('[Server AuditLog] Nöbet log yazma hatası:', err));
      }
    }

    return NextResponse.json({ data: insertedRows, error: null });
  } catch (error: unknown) {
    console.error(`[db/POST] Hata:`, error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/db/[table] — UPDATE
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'vehicles') {
      await ensureVehicleColumnsExist();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
    }

    const body = await request.json();
    const { data, filters } = body;

    // Sync durum/status on updates
    if (table === 'fire_hydrants' && data && data.status !== undefined) {
      data.durum = data.status === 'broken' ? 'DEVRE_DIŞI' : 'MEVCUT';
    }
    if (table === 'vehicles' && data && data.status !== undefined) {
      data.durum = data.status === 'maintenance' ? 'Bakımda' : 'aktif';
    }

    // Authorize vehicle inspection update
    if (table === 'vehicles' && data && data.next_inspection_date !== undefined) {
      const uRol = session.rol || '';
      const uUnvan = session.unvan || '';
      
      const isAuthorized = 
        uUnvan === 'Müdür' || uRol === 'Admin' || uRol?.toLowerCase() === 'admin' || uUnvan?.toLowerCase() === 'müdür' ||
        uUnvan === 'Amir' || uRol === 'Editor' || uRol?.toLowerCase() === 'editor' || uUnvan?.toLowerCase() === 'amir' ||
        uUnvan === 'Başçavuş' || uUnvan === 'Çavuş' || uRol === 'Shift_Leader' ||
        uUnvan.includes('Santral') || uUnvan.includes('İhbar') || uUnvan.includes('Memur') || uRol === 'Santral' ||
        uUnvan.toLowerCase().includes('santral') || uUnvan.toLowerCase().includes('ihbar') || uUnvan.toLowerCase().includes('memur');
        
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Muayene tarihini değiştirme yetkiniz bulunmamaktadır.' }, { status: 403 });
      }
    }

    // Fetch previous inspection date if updating next_inspection_date in vehicles table
    let oldInspectionDate: string | null = null;
    if (table === 'vehicles' && data && data.next_inspection_date !== undefined) {
      const plaka = filters?.plaka;
      if (plaka) {
        try {
          const oldRowRes = await query('SELECT next_inspection_date, "muayeneBitis" FROM vehicles WHERE plaka = $1', [plaka]);
          if (oldRowRes.rows[0]) {
            oldInspectionDate = oldRowRes.rows[0].next_inspection_date || oldRowRes.rows[0].muayeneBitis || null;
          }
        } catch (e) {
          console.error('[Server AuditLog] Eski muayene tarihi okuma hatası:', e);
        }
      }
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(data).forEach(([key, val]) => {
      setClauses.push(`"${key.replace(/[^a-zA-Z0-9_]/g, '')}" = $${idx}`);
      values.push(val);
      idx++;
    });

    const whereClauses: string[] = [];
    Object.entries(filters || {}).forEach(([key, val]) => {
      whereClauses.push(`"${key.replace(/[^a-zA-Z0-9_]/g, '')}" = $${idx}`);
      values.push(val);
      idx++;
    });

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} ${whereStr} RETURNING *`;

    const result = await query(sql, values);

    // Dynamic Server-Side Audit Log hooks for vehicles next_inspection_date update
    if (table === 'vehicles' && result.rows[0] && data && data.next_inspection_date !== undefined) {
      const row = result.rows[0];
      const formatToISO = (d: any) => {
        if (!d) return 'Tarih Girilmedi';
        try {
          return new Date(d).toISOString().split('T')[0];
        } catch {
          return 'Tarih Girilmedi';
        }
      };
      const eski_tarih = formatToISO(oldInspectionDate);
      const yeni_tarih = formatToISO(row.next_inspection_date);
      
      await query(
        `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'arac_muayene_guncelleme',
          session.sicilNo || 'SYSTEM',
          `${session.ad || ''} ${session.soyad || ''}`.trim() || 'Sistem',
          row.plaka,
          JSON.stringify({ eski_tarih, yeni_tarih })
        ]
      ).catch(err => console.error('[Server AuditLog] Araç muayene log yazma hatası:', err));
    }

    // 6. Dynamic Server-Side Audit Log hooks for fire_hydrants status update
    if (table === 'fire_hydrants' && result.rows[0]) {
      const row = result.rows[0];
      await query(
        `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'hydrant_status_change',
          session.sicilNo,
          `${session.ad} ${session.soyad}`,
          String(row.id || row.no || ''),
          JSON.stringify({ id: row.id, no: row.no, newStatus: row.durum, tarih: new Date().toISOString() })
        ]
      ).catch(err => console.error('[Server AuditLog] Hidrant log yazma hatası:', err));
    }

    return NextResponse.json({ data: result.rows, error: null });
  } catch (error: any) {
    console.error(`[db/PATCH] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/db/[table] — DELETE
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }
    // Silme yetkisi sadece Admin ve Editor'da
    if (!['Admin', 'Editor'].includes(session.rol)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
    }

    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);
    
    if (filters.length === 0) {
      return NextResponse.json({ error: 'Filtre olmadan toplu silme yapılamaz.' }, { status: 400 });
    }

    const { clause, params: whereParams } = buildWhereClause(filters);
    const sql = `DELETE FROM ${table} ${clause} RETURNING *`;

    const result = await query(sql, whereParams);
    return NextResponse.json({ data: result.rows, error: null });
  } catch (error: any) {
    console.error(`[db/DELETE] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
