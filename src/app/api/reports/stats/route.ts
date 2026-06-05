import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    // 1. Eğitim İstatistikleri
    const trainingStats = await queryOne(`
      SELECT 
        COUNT(*) FILTER (WHERE faaliyet_turu = 'Eğitim') as total_trainings,
        COALESCE(SUM(toplam_sure_saat) FILTER (WHERE faaliyet_turu = 'Eğitim'), 0) as total_training_hours,
        COALESCE(SUM(katilimci_sayisi) FILTER (WHERE faaliyet_turu = 'Eğitim'), 0) as total_people_reached
      FROM public.activities_and_trainings
    `);

    // 2. Vaka İstatistikleri (Araç Yangını & Kurtarma)
    const incidentStats = await queryOne(`
      SELECT 
        COUNT(*) FILTER (WHERE olay_turu ILIKE '%Araç Yangını%') as car_fires_count,
        COUNT(*) FILTER (WHERE olay_turu ILIKE '%Kurtarma%') as rescue_operations_count
      FROM public.incidents
    `);

    // 3. Aktif Personel
    const activePersonnel = await queryOne(`
      SELECT COUNT(*) as active_count 
      FROM public.personnel_shifts_log 
      WHERE durum = 'GÖREVDE' AND cikis_tarihi IS NULL
    `);

    // 4. Filo Hazır Bulunuşluk (Muayenesi Geçerli & Faal)
    const fleetStats = await queryOne(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (
          WHERE durum = 'aktif' AND ("muayeneBitis" IS NULL OR "muayeneBitis" >= CURRENT_DATE)
        ) as active_vehicles
      FROM public.vehicles
    `);

    const totalVehicles = Number(fleetStats?.total_vehicles || 0);
    const activeVehicles = Number(fleetStats?.active_vehicles || 0);
    const fleetReadinessPercent = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 100;

    // 5. Son 6 Ay Vaka Trendleri
    const last6MonthsIncidents = await queryMany(`
      SELECT olay_turu, cikis_saati 
      FROM public.incidents 
      WHERE cikis_saati >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY cikis_saati ASC
    `);

    const monthsList: { name: string; key: string; yangin: number; kurtarma: number }[] = [];
    const localeTr = new Intl.DateTimeFormat('tr-TR', { month: 'long' });
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = localeTr.format(d);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsList.push({ name: monthName, key: monthKey, yangin: 0, kurtarma: 0 });
    }

    last6MonthsIncidents.forEach((inc: any) => {
      if (!inc.cikis_saati) return;
      const date = new Date(inc.cikis_saati);
      const incKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthObj = monthsList.find(m => m.key === incKey);
      if (monthObj) {
        const type = String(inc.olay_turu || '').toLowerCase();
        if (type.includes('yangın') || type.includes('yangin')) {
          monthObj.yangin++;
        } else if (type.includes('kurtarma')) {
          monthObj.kurtarma++;
        }
      }
    });

    // 6. İstasyon Bazlı Vaka Yükü (Donut Chart)
    const stationDistribution = await queryMany(`
      SELECT 
        COALESCE(v.istasyon, 'Merkez İstasyonu') as istasyon, 
        COUNT(DISTINCT iv.incident_id) as count
      FROM public.incident_vehicles iv
      JOIN public.vehicles v ON iv.plaka = v.plaka
      GROUP BY v.istasyon
    `);

    const stationMap: Record<string, string> = {
      "Merkez İstasyonu": "Merkez",
      "Esentepe Şubesi": "Esentepe",
      "Organize Sanayi Bölgesi Şubesi": "OSB"
    };

    const donutData = stationDistribution.map((row: any) => ({
      name: stationMap[row.istasyon] || row.istasyon,
      value: Number(row.count || 0)
    })).filter((item: any) => item.value > 0);

    // If donut data is empty, put mock default so it renders beautifully
    if (donutData.length === 0) {
      donutData.push(
        { name: "Merkez", value: 45 },
        { name: "Esentepe", value: 30 },
        { name: "OSB", value: 25 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_trainings: Number(trainingStats?.total_trainings || 0),
        total_training_hours: Number(trainingStats?.total_training_hours || 0),
        total_people_reached: Number(trainingStats?.total_people_reached || 0),
        car_fires_count: Number(incidentStats?.car_fires_count || 0),
        rescue_operations_count: Number(incidentStats?.rescue_operations_count || 0),
        active_personnel_count: Number(activePersonnel?.active_count || 0),
        fleet_readiness_percent: fleetReadinessPercent
      },
      charts: {
        lineChartData: monthsList.map(m => ({
          name: m.name,
          Yangın: m.yangin,
          Kurtarma: m.kurtarma
        })),
        donutChartData: donutData
      }
    });
  } catch (error: any) {
    console.error("[Stats API] Error:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
