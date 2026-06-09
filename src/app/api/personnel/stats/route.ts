import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // 1. Session verification
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const personnelId = searchParams.get("personnel_id"); // sicil_no

    if (personnelId) {
      // 2. Fetch stats for a single personnel member by sicil_no
      const personnel = await queryOne(`
        SELECT ad, soyad, sicil_no, unvan, istasyon, aktif, durum
        FROM public.personnel
        WHERE sicil_no = $1
      `, [personnelId]);

      if (!personnel) {
        return NextResponse.json({ error: "Personel bulunamadı." }, { status: 404 });
      }

      // Fetch incident records for this personnel member
      const rows = await queryMany(`
        SELECT i.olay_turu, COUNT(ip.id) as count
        FROM public.incident_personnel ip
        JOIN public.incidents i ON ip.incident_id = i.id
        WHERE ip.sicil_no = $1
        GROUP BY i.olay_turu
      `, [personnelId]);

      const categories = {
        "Yangın Müdahale": 0,
        "Kurtarma Operasyonu": 0,
        "Dış Görev": 0,
        "Lojistik": 0
      };

      let totalMissions = 0;
      for (const row of rows) {
        const type = (row.olay_turu || "").toLowerCase();
        const count = Number(row.count || 0);
        totalMissions += count;

        if (type.includes("yangın") || type.includes("yangin") || type.includes("alev")) {
          categories["Yangın Müdahale"] += count;
        } else if (type.includes("kurtarma") || type.includes("kaza") || type.includes("sıkışma") || type.includes("asansör")) {
          categories["Kurtarma Operasyonu"] += count;
        } else if (type.includes("dış") || type.includes("dis") || type.includes("görev") || type.includes("gorev") || type.includes("sevk") || type.includes("refakat") || type.includes("baca")) {
          categories["Dış Görev"] += count;
        } else {
          categories["Lojistik"] += count;
        }
      }

      const stats = [
        { subject: "Yangın Müdahale", value: categories["Yangın Müdahale"] },
        { subject: "Kurtarma Operasyonu", value: categories["Kurtarma Operasyonu"] },
        { subject: "Dış Görev", value: categories["Dış Görev"] },
        { subject: "Lojistik", value: categories["Lojistik"] }
      ];

      return NextResponse.json({
        success: true,
        personnel: {
          ad: personnel.ad,
          soyad: personnel.soyad,
          sicil_no: personnel.sicil_no,
          unvan: personnel.unvan,
          istasyon: personnel.istasyon,
          durum: personnel.durum,
          aktif: personnel.aktif
        },
        stats,
        total: totalMissions
      });

    } else {
      // 3. Fetch stats for all active personnel (ordered by mission count ascending)
      const rows = await queryMany(`
        SELECT 
          p.sicil_no,
          p.ad,
          p.soyad,
          p.unvan,
          p.istasyon,
          p.aktif,
          p.durum,
          COUNT(ip.id) as total_missions
        FROM public.personnel p
        LEFT JOIN public.incident_personnel ip ON p.sicil_no = ip.sicil_no
        LEFT JOIN public.incidents i ON ip.incident_id = i.id 
          AND (i.cikis_saati >= NOW() - INTERVAL '30 days' OR i.created_at >= NOW() - INTERVAL '30 days')
        WHERE p.aktif = true OR p.aktif IS NULL
        GROUP BY p.sicil_no, p.ad, p.soyad, p.unvan, p.istasyon, p.aktif, p.durum
        ORDER BY total_missions ASC, p.ad ASC, p.soyad ASC
      `);

      const statsList = rows.map(r => ({
        sicil_no: r.sicil_no,
        ad: r.ad,
        soyad: r.soyad,
        unvan: r.unvan,
        istasyon: r.istasyon,
        aktif: r.aktif,
        durum: r.durum,
        last30DaysMissions: Number(r.total_missions || 0)
      }));

      return NextResponse.json({
        success: true,
        stats: statsList
      });
    }

  } catch (error: any) {
    console.error("[Personnel Stats API] Error:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
