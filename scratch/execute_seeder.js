const { Pool } = require('pg');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Load env variables manually (since dotenv might not be installed)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // remove quotes
      process.env[key] = val;
    }
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function query(text, params) {
  return await pool.query(text, params);
}

// 24 Real Vehicles definition for Sivas Fire Dept
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

function getPresetCompartments(type) {
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

function extractPlate(str) {
  if (!str) return null;
  let s = str.replace(/ı/gi, 'i').replace(/ş/gi, 's').replace(/ğ/gi, 'g').replace(/ç/gi, 'c').replace(/ö/gi, 'o').replace(/ü/gi, 'u').toUpperCase();
  
  if (s.includes('DOBLO') && s.includes('58 NN 694')) return '58 NN 694';
  if (s.includes('DOBLO')) return '58 NN 694';
  if (s.includes('ACCENT') || s.includes('HYUNDAI ACCENT') || s.includes('TD 315')) return '58 TD 315';
  if (s.includes('58 AY 164') || s.includes('AY 164')) return '58 AY 164';
  if (s.includes('1936 MODEL') || s.includes('58 AC 113') || s.includes('AC 113')) return '58 AC 113';
  if (s.includes('JENERATOR')) return 'JENERATOR';
  
  const match = s.match(/(\d{2})\s*([A-Z]{1,3})\s*(\d{2,4})/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return null;
}

function parseDate(str) {
  if (!str) return null;
  const match = str.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

async function executeSeeder() {
  console.log('[SEEDER] Başlatılıyor...');
  try {
    // 1. Create table structure if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS public.arac_bakim_gecmisi (
        id SERIAL PRIMARY KEY,
        plaka VARCHAR(15) NOT NULL,
        tarih DATE NOT NULL,
        tip VARCHAR(50) NOT NULL,
        aciklama TEXT NOT NULL,
        maliyet NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_arac_bakim_gecmisi_plaka ON public.arac_bakim_gecmisi(plaka)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_arac_bakim_gecmisi_tarih ON public.arac_bakim_gecmisi(tarih DESC)`);
    await query(`TRUNCATE TABLE public.arac_bakim_gecmisi RESTART IDENTITY`);
    console.log('[SEEDER] arac_bakim_gecmisi tablosu hazırlandı.');

    // 2. Ensure su_kapasite & kopuk_kapasite exist
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS su_kapasite INTEGER DEFAULT 0`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS kopuk_kapasite INTEGER DEFAULT 0`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS marka VARCHAR`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS model VARCHAR`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS istasyon VARCHAR`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS yil INTEGER`);

    // 3. Seed vehicles
    for (const v of REAL_VEHICLES) {
      const presetCompartments = getPresetCompartments(v.arac_tipi);
      await query(
        `INSERT INTO vehicles (plaka, arac_tipi, marka, model, yil, su_kapasite, kopuk_kapasite, istasyon, durum, bolmeler, km, "motorSaatiPTO")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aktif', $9, $10, $11)
         ON CONFLICT (plaka) DO UPDATE SET 
           arac_tipi = $2, marka = $3, model = $4, yil = $5, 
           su_kapasite = $6, kopuk_kapasite = $7, istasyon = $8,
           bolmeler = $9`,
        [
          v.plaka,
          v.arac_tipi,
          v.marka,
          v.model,
          v.yil,
          v.su_kapasite,
          v.kopuk_kapasite,
          v.istasyon,
          JSON.stringify(presetCompartments),
          v.yil > 2018 ? 24000 : 124000,
          v.yil > 2018 ? 450 : 2100
        ]
      );
    }
    console.log(`[SEEDER] ${REAL_VEHICLES.length} adet araç seed edildi.`);

    // 4. Seeding Excel files
    const rootDir = path.join(__dirname, '..');
    const tamirPath = path.join(rootDir, "public", "data", "arac_tamir_takip.xlsx");
    const yagPath = path.join(rootDir, "public", "data", "yag_bakım_takip.xlsx");

    let totalTamirLogs = 0;
    let totalYagLogs = 0;

    if (fs.existsSync(tamirPath)) {
      const tamirWb = xlsx.readFile(tamirPath);
      const tamirSheet = tamirWb.Sheets[tamirWb.SheetNames[0]];
      const tamirRange = xlsx.utils.decode_range(tamirSheet['!ref']);

      for (let c = 0; c <= tamirRange.e.c; c++) {
        const headerVal = tamirSheet[xlsx.utils.encode_cell({ r: 0, c })]?.v;
        if (!headerVal) continue;
        const plate = extractPlate(String(headerVal));
        if (!plate) continue;

        for (let r = 1; r <= tamirRange.e.r; r++) {
          const cellVal = tamirSheet[xlsx.utils.encode_cell({ r, c })]?.v;
          if (!cellVal) continue;

          const txt = String(cellVal).trim();
          if (!txt || txt === '(empty)') continue;

          const date = parseDate(txt) || "2024-07-10";
          const cleanedText = txt.replace(/^\d{2}[./-]\d{2}[./-]\d{4}\s*/, '').trim();

          await query(
            `INSERT INTO arac_bakim_gecmisi (plaka, tarih, tip, aciklama, maliyet)
             VALUES ($1, $2, 'tamir', $3, 0)`,
            [plate, date, cleanedText || txt]
          );
          totalTamirLogs++;
        }
      }
      console.log(`[SEEDER] Tamir takip dosyasından ${totalTamirLogs} adet log seed edildi.`);
    }

    if (fs.existsSync(yagPath)) {
      const yagWb = xlsx.readFile(yagPath);
      const yagSheet = yagWb.Sheets[yagWb.SheetNames[0]];
      const yagRange = xlsx.utils.decode_range(yagSheet['!ref']);

      for (let c = 0; c <= yagRange.e.c; c++) {
        const headerVal = yagSheet[xlsx.utils.encode_cell({ r: 0, c })]?.v;
        if (!headerVal) continue;
        const plate = extractPlate(String(headerVal));
        if (!plate) continue;

        const baselineVal = yagSheet[xlsx.utils.encode_cell({ r: 1, c })]?.v;
        if (baselineVal) {
          const txt = String(baselineVal).trim();
          if (txt && txt !== '(empty)') {
            const date = parseDate(String(headerVal)) || "2024-09-01";
            await query(
              `INSERT INTO arac_bakim_gecmisi (plaka, tarih, tip, aciklama, maliyet)
               VALUES ($1, $2, 'yag_bakimi', $3, 0)`,
              [plate, date, txt]
            );
            totalYagLogs++;
          }
        }

        for (let r = 2; r <= yagRange.e.r; r++) {
          const cellVal = yagSheet[xlsx.utils.encode_cell({ r, c })]?.v;
          if (!cellVal) continue;

          const txt = String(cellVal).trim();
          if (!txt || txt === '(empty)') continue;

          const dateRegex = /(\d{2})[./-](\d{2})[./-](\d{4})/g;
          const matches = [];
          let match;
          while ((match = dateRegex.exec(txt)) !== null) {
            matches.push({
              index: match.index,
              dateStr: match[0],
              formattedDate: `${match[3]}-${match[2]}-${match[1]}`
            });
          }

          if (matches.length === 0) {
            const date = parseDate(String(headerVal)) || "2024-09-01";
            await query(
              `INSERT INTO arac_bakim_gecmisi (plaka, tarih, tip, aciklama, maliyet)
               VALUES ($1, $2, 'yag_bakimi', $3, 0)`,
              [plate, date, txt]
            );
            totalYagLogs++;
          } else {
            for (let i = 0; i < matches.length; i++) {
              const current = matches[i];
              const next = matches[i + 1];
              const start = current.index + current.dateStr.length;
              const end = next ? next.index : txt.length;
              let blockText = txt.substring(start, end).trim();
              blockText = blockText.replace(/^[\s*:*,*-]*|[\s*:*,*-]*$/g, '').trim();

              if (!blockText) {
                blockText = `Yağ/Antifriz periyodik kontrolü gerçekleştirildi.`;
              }

              await query(
                `INSERT INTO arac_bakim_gecmisi (plaka, tarih, tip, aciklama, maliyet)
                 VALUES ($1, $2, 'yag_bakimi', $3, 0)`,
                [plate, current.formattedDate, blockText]
              );
              totalYagLogs++;
            }
          }
        }
      }
      console.log(`[SEEDER] Yağ bakım dosyasından ${totalYagLogs} adet log seed edildi.`);
    }

    // Update vehicle KM and PTO using the highest records in our maintenance database
    await query(`
      UPDATE vehicles v
      SET km = COALESCE((
        SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(REGEXP_SUBSTR(aciklama, 'KM:\\s*\\d+'), 'KM:\\s*', ''), '') AS INTEGER))
        FROM arac_bakim_gecmisi l
        WHERE l.plaka = v.plaka AND l.aciklama ~ 'KM:\\s*\\d+'
      ), v.km)
    `);

    console.log('[SEEDER] Seed işlemi BAŞARIYLA TAMAMLANDI!');
  } catch (err) {
    console.error('[SEEDER] Hata oluştu:', err);
  } finally {
    await pool.end();
  }
}

executeSeeder();
