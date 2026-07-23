import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  STATION_SHIFT_TIMES,
  normalizeStationName,
  getActivePostaForStation,
} from "@/lib/shiftUtils";

/**
 * GET /api/cron/sayim-uyari
 *
 * Zamanlanmış görev (sunucu cron'u tarafından ~10 dk'da bir çağrılır).
 * Her istasyon için posta değişiminden 20 dk sonra, o vardiyada GÜNLÜK ARAÇ
 * KONTROLÜ ve/veya ENVANTER SAYIMI yapılmamış araçların plakalarını tespit eder
 * ve ilgili yetkililere (o günkü aktif postanın başçavuşu + çavuşları + Amir
 * Ahmet Yıldız) tek bir plaka-bazlı uyarı SMS'i gönderir.
 *
 * Idempotent: her istasyon+gün+tür için yalnızca bir kez SMS gider (audit_logs damgası).
 * Güvenlik: CRON_SECRET ile korunur (Authorization: Bearer <secret> veya ?secret=<secret>).
 *
 * NOT: Sunucu saat dilimi Europe/Istanbul kabul edilir (Dockerfile'da TZ ayarlı).
 */

const AMIR_SABIT_SICIL = "SB5803"; // Amir Ahmet Yıldız
const GECIKME_DK = 20; // posta değişiminden kaç dk sonra kontrol edilir
const PENCERE_DK = 90; // kontrol penceresi genişliği (cron gecikse de yakalar; idempotency tekrarı önler)

// Uyarı için değerlendirilecek istasyon grupları (posta saati anahtarları)
const ISTASYON_GRUPLARI: Array<{ key: keyof typeof STATION_SHIFT_TIMES; label: string }> = [
  { key: "Merkez", label: "Merkez İstasyonu" },
  { key: "Esentepe", label: "Esentepe Şubesi" },
  { key: "Organize", label: "Organize (OSB) İstasyonu" },
];

interface ShiftTimes { [k: string]: { hours: number; minutes: number } }

async function getShiftTimes(): Promise<typeof STATION_SHIFT_TIMES> {
  const times: ShiftTimes = JSON.parse(JSON.stringify(STATION_SHIFT_TIMES));
  try {
    const res = await query(
      "SELECT key, value FROM system_settings WHERE key IN ('merkez_shift_time','esentepe_shift_time','organize_shift_time')"
    );
    const map: Record<string, string> = {};
    for (const r of res.rows) map[r.key] = r.value;
    const parse = (v?: string) => {
      if (!v || !/^\d{1,2}:\d{2}$/.test(v)) return null;
      const [h, m] = v.split(":").map(Number);
      return { hours: h, minutes: m };
    };
    if (parse(map.merkez_shift_time)) times.Merkez = parse(map.merkez_shift_time)!;
    if (parse(map.esentepe_shift_time)) times.Esentepe = parse(map.esentepe_shift_time)!;
    if (parse(map.organize_shift_time)) times.Organize = parse(map.organize_shift_time)!;
  } catch { /* sistem ayarları yoksa varsayılan saatler kullanılır */ }
  return times as typeof STATION_SHIFT_TIMES;
}

async function sendSms(phoneNumbers: string[], content: string) {
  if (!process.env.SMS_API_KEY || !process.env.SMS_API_SECRET) {
    console.warn("[cron/sayim-uyari] SMS anahtarları yok — gönderim atlandı.");
    return false;
  }
  const res = await fetch("https://bildirim.sivas.bel.tr/api/v1/sms-send-bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.SMS_API_KEY,
      "X-Api-Secret": process.env.SMS_API_SECRET,
    },
    body: JSON.stringify({ phoneNumbers, content }),
  });
  if (!res.ok) {
    console.error("[cron/sayim-uyari] SMS API hatası:", res.status, await res.text());
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  // ── Yetki (CRON_SECRET) ──
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tanımlı değil." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const qs = new URL(request.url).searchParams.get("secret");
  if (bearer !== secret && qs !== secret) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const now = new Date(); // sunucu TZ = Europe/Istanbul
    const shiftTimes = await getShiftTimes();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Araçları çek ve istasyon grubuna göre ayır
    const vehRes = await query("SELECT plaka, istasyon FROM vehicles WHERE plaka IS NOT NULL");
    const gruplar: Record<string, string[]> = { Merkez: [], Esentepe: [], Organize: [] };
    for (const v of vehRes.rows) {
      const g = normalizeStationName(v.istasyon); // Default → Merkez'e katılır
      const key = g === "Default" ? "Merkez" : g;
      if (gruplar[key]) gruplar[key].push(v.plaka);
    }

    const rapor: any[] = [];

    for (const grup of ISTASYON_GRUPLARI) {
      const plakalar = gruplar[grup.key] || [];
      if (plakalar.length === 0) continue;

      const st = shiftTimes[grup.key];
      // Bugünkü posta değişim anı (TR) ve "20 dk sonrası"
      const shiftChange = new Date(now);
      shiftChange.setHours(st.hours, st.minutes, 0, 0);
      const kontrolAni = new Date(shiftChange.getTime() + GECIKME_DK * 60000);
      const pencereSonu = new Date(kontrolAni.getTime() + PENCERE_DK * 60000);

      // Yalnızca [posta+20dk, posta+20dk+pencere] aralığındaysak değerlendir
      if (now < kontrolAni || now > pencereSonu) {
        rapor.push({ istasyon: grup.label, atlandi: "zaman penceresi dışında" });
        continue;
      }

      // Bu vardiyada (posta değişiminden bu yana) yapılan kontrolleri çek
      const sinceIso = shiftChange.toISOString();
      const [dailyRes, invRes] = await Promise.all([
        query(
          "SELECT DISTINCT plaka FROM daily_vehicle_checks WHERE created_at >= $1 AND plaka = ANY($2)",
          [sinceIso, plakalar]
        ),
        query(
          "SELECT DISTINCT plaka FROM inventory_checks WHERE created_at >= $1 AND plaka = ANY($2)",
          [sinceIso, plakalar]
        ),
      ]);
      const gunlukYapilan = new Set(dailyRes.rows.map((r) => r.plaka));
      const envanterYapilan = new Set(invRes.rows.map((r) => r.plaka));

      const eksikGunluk = plakalar.filter((p) => !gunlukYapilan.has(p));
      const eksikEnvanter = plakalar.filter((p) => !envanterYapilan.has(p));

      if (eksikGunluk.length === 0 && eksikEnvanter.length === 0) {
        rapor.push({ istasyon: grup.label, durum: "tüm araçlar tamam" });
        continue;
      }

      // Idempotency: bugün bu istasyon için uyarı gönderildi mi?
      const damga = await query(
        `SELECT 1 FROM audit_logs
         WHERE action_type = 'sayim_uyari'
           AND target = $1
           AND (details->>'gun') = $2
         LIMIT 1`,
        [grup.label, today]
      );
      if (damga.rowCount && damga.rowCount > 0) {
        rapor.push({ istasyon: grup.label, atlandi: "bugün zaten gönderildi" });
        continue;
      }

      // Aktif posta ve alıcılar
      const aktifPosta = getActivePostaForStation(grup.label, now, shiftTimes);
      const postaLabel = `${aktifPosta}. Posta`;
      const alRes = await query(
        `SELECT DISTINCT COALESCE(p.telefon, pd.telefon) AS tel
         FROM public.personnel p
         LEFT JOIN public.personnel_details pd ON p.sicil_no = pd.sicil_no
         WHERE p.aktif = true
           AND (
             (p.posta = $1 AND (p.unvan ILIKE '%çvş%' OR p.unvan ILIKE '%çavuş%'))
             OR p.sicil_no = $2
           )
           AND COALESCE(p.telefon, pd.telefon) IS NOT NULL
           AND COALESCE(p.telefon, pd.telefon) <> ''`,
        [postaLabel, AMIR_SABIT_SICIL]
      );
      const phones = alRes.rows
        .map((r) => String(r.tel).replace(/\s+/g, ""))
        .filter((p) => p.length >= 10);

      // SMS içeriği (plaka bazlı, iki tür ayrı bölüm)
      let icerik = `[SAYIM UYARISI - ${grup.label} / ${postaLabel}]\n`;
      if (eksikGunluk.length > 0) {
        icerik += `\nGünlük kontrolü YAPILMAYAN araçlar:\n${eksikGunluk.join(", ")}\n`;
      }
      if (eksikEnvanter.length > 0) {
        icerik += `\nEnvanter sayımı YAPILMAYAN araçlar:\n${eksikEnvanter.join(", ")}\n`;
      }
      icerik += `\nLütfen ivedilikle tamamlatınız.`;

      if (dryRun) {
        rapor.push({ istasyon: grup.label, postaLabel, eksikGunluk, eksikEnvanter, aliciSayisi: phones.length, dryRun: true });
        continue;
      }

      let smsOk = false;
      if (phones.length > 0) smsOk = await sendSms(phones, icerik);

      // Damga (SMS başarısız olsa da gün içinde tekrar denememek için yaz; ama alıcı yoksa damgalamayalım ki tel eklenince ertesi cron yakalasın)
      if (phones.length > 0) {
        await query(
          `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
           VALUES ('sayim_uyari', 'SYSTEM', 'Otomatik Uyarı', $1, $2)`,
          [grup.label, JSON.stringify({ gun: today, posta: postaLabel, eksikGunluk, eksikEnvanter, aliciSayisi: phones.length, smsOk })]
        );
      }

      rapor.push({ istasyon: grup.label, postaLabel, eksikGunluk, eksikEnvanter, aliciSayisi: phones.length, smsOk });
    }

    return NextResponse.json({ success: true, zaman: now.toISOString(), rapor });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/sayim-uyari] Hata:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
