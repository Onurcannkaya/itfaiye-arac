import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

function calculateSlotHours(slot: string): number {
  if (!slot) return 0;
  const parts = slot.split("-").map(s => s.trim());
  if (parts.length !== 2) return 0;
  const [startH, startM] = parts[0].split(":").map(Number);
  const [endH, endM] = parts[1].split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const diffMin = endMin - startMin;
  return diffMin > 0 ? diffMin / 60 : 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const personnelId = searchParams.get("id"); // Can be UUID or sicil_no

    if (!personnelId) {
      return NextResponse.json({ error: "Personel ID/Sicil No belirtilmelidir." }, { status: 400 });
    }

    // 1. Fetch the personnel info
    const personnel = await queryOne(`
      SELECT id, ad, soyad, sicil_no, unvan, istasyon
      FROM public.personnel
      WHERE id::text = $1 OR sicil_no = $1
    `, [personnelId]);

    if (!personnel) {
      return NextResponse.json({ error: "Personel bulunamadı." }, { status: 404 });
    }

    // 2. Fetch completed educations where this personnel is a trainer
    const educations = await queryMany(`
      SELECT id, kurum_adi, planlanan_tarih, saat_slot, durum, egitimci_personel_ids
      FROM public.external_educations
      WHERE durum = 'Tamamlandı' AND $1 = ANY(egitimci_personel_ids)
    `, [personnel.id]);

    let totalHours = 0;
    const details = educations.map(edu => {
      const hours = calculateSlotHours(edu.saat_slot);
      totalHours += hours;
      return {
        id: edu.id,
        kurum_adi: edu.kurum_adi,
        tarih: edu.planlanan_tarih,
        saat_slot: edu.saat_slot,
        hours
      };
    });

    const threshold = 40; // 40 hours threshold
    const eligible = totalHours >= threshold;

    return NextResponse.json({
      success: true,
      personnel: {
        id: personnel.id,
        ad: personnel.ad,
        soyad: personnel.soyad,
        sicil_no: personnel.sicil_no,
        unvan: personnel.unvan,
        istasyon: personnel.istasyon
      },
      total_hours: Number(totalHours.toFixed(2)),
      eligible,
      threshold,
      details
    });

  } catch (err: any) {
    console.error("Certificate check error:", err);
    return NextResponse.json({ error: err.message || "Bilinmeyen bir hata oluştu" }, { status: 500 });
  }
}
