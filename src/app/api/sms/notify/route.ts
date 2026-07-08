import { NextResponse } from "next/server";
import { Client } from "pg";
import { getActivePostaForStation } from "@/lib/shiftUtils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'incident'; // 'incident', 'training', 'inventory'

    if (!process.env.SMS_API_KEY || !process.env.SMS_API_SECRET) {
      console.warn("SMS_API_KEY or SMS_API_SECRET is not configured. Skipping SMS notification.");
      return NextResponse.json({ success: false, error: "SMS API keys missing" }, { status: 500 });
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      let query = "";
      let queryParams: any[] = [];
      let smsContent = "";

      if (action === 'incident') {
        const { missionTitle, missionAddress, missionType, detail } = body;
        const activePosta = getActivePostaForStation('Merkez', new Date());
        query = `
          SELECT p.ad, p.soyad, COALESCE(p.telefon, pd.telefon) as phone
          FROM public.personnel p
          LEFT JOIN public.personnel_details pd ON p.sicil_no = pd.sicil_no
          WHERE (
            p.posta_no = $1 
            OR p.posta_no IS NULL 
            OR p.posta_no = 0 
            OR p.durum = 'Görevde' 
            OR p.unvan IN ('Müdür', 'Amir', 'Baş Şoför', 'Eğitim Çavuşu')
          )
            AND COALESCE(p.telefon, pd.telefon) IS NOT NULL
            AND COALESCE(p.telefon, pd.telefon) != ''
            AND p.aktif = true
        `;
        queryParams = [activePosta];
        smsContent = `[YENİ OLAY - ${missionType}]\nKonu: ${missionTitle}\nAdres: ${missionAddress}\nDetay: ${detail || '-'}\nLütfen olay yerine intikal ediniz.`;
      } 
      else if (action === 'training') {
        const { date, topic, personnelIds } = body;
        const activePosta = getActivePostaForStation('Merkez', new Date(date));
        query = `
          SELECT p.ad, p.soyad, COALESCE(p.telefon, pd.telefon) as phone
          FROM public.personnel p
          LEFT JOIN public.personnel_details pd ON p.sicil_no = pd.sicil_no
          WHERE (
            p.posta_no = $1 
            OR p.posta_no IS NULL 
            OR p.posta_no = 0 
            OR p.unvan IN ('Müdür', 'Amir', 'Baş Şoför', 'Eğitim Çavuşu')
            OR p.id::text = ANY($2::text[])
            OR p.sicil_no = ANY($2::text[])
          )
            AND COALESCE(p.telefon, pd.telefon) IS NOT NULL
            AND COALESCE(p.telefon, pd.telefon) != ''
            AND p.aktif = true
        `;
        queryParams = [activePosta, personnelIds || []];
        smsContent = `[EĞİTİM PLANLAMASI]\nTarih: ${date}\nKonu: ${topic}\nİlgili posta ve idari kadroya duyurulur. Lütfen katılım sağlayınız.`;
      } 
      else if (action === 'inventory') {
        const { plaka } = body;
        query = `
          SELECT p.ad, p.soyad, COALESCE(p.telefon, pd.telefon) as phone
          FROM public.personnel p
          LEFT JOIN public.personnel_details pd ON p.sicil_no = pd.sicil_no
          WHERE (p.unvan IN ('Müdür', 'Amir', 'Baş Şoför', 'Eğitim Çavuşu') OR (p.ad ILIKE '%Onurcan%' AND p.soyad ILIKE '%Kaya%'))
            AND COALESCE(p.telefon, pd.telefon) IS NOT NULL
            AND COALESCE(p.telefon, pd.telefon) != ''
            AND p.aktif = true
        `;
        smsContent = `[ENVANTER SAYIMI]\n${plaka} plakalı aracın bölme ve envanter sayımı gerçekleştirilmiştir.\nBilgilerinize sunulur.`;
      } 
      else {
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
      }

      const { rows } = await client.query(query, queryParams);

      if (rows.length === 0) {
        return NextResponse.json({ success: true, message: "No personnel to notify" });
      }

      const phoneNumbers = rows
        .map(r => r.phone.replace(/\s+/g, ''))
        .filter(p => p.length >= 10);

      if (phoneNumbers.length === 0) {
        return NextResponse.json({ success: true, message: "No valid phone numbers found" });
      }

      const smsResponse = await fetch('https://bildirim.sivas.bel.tr/api/v1/sms-send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.SMS_API_KEY,
          'X-Api-Secret': process.env.SMS_API_SECRET
        },
        body: JSON.stringify({
          phoneNumbers,
          content: smsContent
        })
      });

      if (!smsResponse.ok) {
        const errorText = await smsResponse.text();
        throw new Error(`SMS API error: ${smsResponse.status} ${errorText}`);
      }

      const result = await smsResponse.json();
      return NextResponse.json({ success: true, recipients: phoneNumbers.length, apiResponse: result });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error(`Failed to send SMS notification:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
