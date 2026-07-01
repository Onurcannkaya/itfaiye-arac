import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Session check to prevent unauthorized external access
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const baseUrl = process.env.MOBILIZ_BASE_URL || 'https://ng.mobiliz.com.tr/su2/api/integrations';
    const token = process.env.MOBILIZ_TOKEN;

    // Sivas Fire Station coordinates: [lng, lat] = [37.0209312, 39.7339522]
    const STATION_LAT = 39.7339522;
    const STATION_LNG = 37.0209312;

    // Check if token exists and is not the default demo token
    const isRealTokenAvailable = token && token !== 'ecfba725cc7b912da16c9db786d0086e68ec39f27e25c06e0b7aa94e193585de';

    if (isRealTokenAvailable) {
      try {
        const targetUrl = baseUrl.endsWith('/activity/last') ? baseUrl : `${baseUrl}/activity/last`;
        const res = await fetch(targetUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Mobiliz-Token': token
          },
          next: { revalidate: 2 } // Cache for 2 seconds max
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.result) && data.result.length > 0) {
            const allowedGroups = ["itfaiye müdürlüğü afad", "İtfaiye Müdürlüğü"];
            const itfaiyeOnly = data.result.filter((v: any) => {
              const gName = String(v.groupName || '').toLowerCase();
              return gName.includes('itfaiye') || allowedGroups.some(g => g.toLowerCase() === gName);
            });

            const mappedVehicles = itfaiyeOnly.map((v: any) => ({
              plate: v.plate || '',
              latitude: Number(v.latitude || 0),
              longitude: Number(v.longitude || 0),
              speed: Number(v.speed || 0),
              ignition: v.ignition === 'A' || v.ignition === 'active' ? 'aktif' : 'pasif',
              address: v.address || 'Konum Bilgisi Alınamadı',
              dataTime: v.dataTime || new Date().toISOString()
            }));

            return NextResponse.json({
              success: true,
              mode: 'realtime',
              vehicles: mappedVehicles
            });
          }
        }
        console.warn('[Mobiliz API] Real API call returned non-ok status or invalid format, falling back to simulation.');
      } catch (apiErr) {
        console.warn('[Mobiliz API] Failed to connect to external service:', apiErr);
      }
    }

    // 2. Fall-Back Simulation Mode: Load database vehicles and simulate motion
    const dbVehicles = await queryMany(`SELECT plaka, arac_tipi, durum FROM public.vehicles`);
    const now = Date.now();

    const simulatedVehicles = dbVehicles.map((v: any, i: number) => {
      // Rotate some vehicles out, keep others at the station
      const isMoving = i % 3 !== 0 && v.durum !== 'Bakımda';
      let lat = STATION_LAT;
      let lng = STATION_LNG;
      let speed = 0;
      let ignition = 'pasif';
      let address = "Sivas İtfaiye Komuta Merkezi";

      if (isMoving) {
        // Slow circular movement around Sivas center to show dynamic simulation
        const angle = (now / 45000) + (i * 0.9); // rotation speed
        const radius = 0.004 + (i * 0.001); // spread radius
        lat += Math.sin(angle) * radius;
        lng += Math.cos(angle) * radius;
        speed = Math.floor(35 + Math.sin(angle) * 15);
        ignition = 'aktif';
        address = `Sivas Canlı Devriye Bölgesi - Kod ${i + 10}`;
      } else if (v.durum === 'Bakımda') {
        // Position at Makine Ikmal coordinates (offset slightly from station)
        lat += 0.0015;
        lng += 0.0015;
        address = "Makine İkmal Müdürlüğü (Bakım-Onarım Garajı)";
      } else {
        // Spread station vehicles slightly so they don't overlap completely
        const angle = (i * 2 * Math.PI) / 8;
        lat += Math.sin(angle) * 0.0002;
        lng += Math.cos(angle) * 0.0002;
      }

      return {
        plate: v.plaka,
        latitude: lat,
        longitude: lng,
        speed: speed,
        ignition: ignition,
        address: address,
        dataTime: new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      mode: 'simulation',
      vehicles: simulatedVehicles
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Mobiliz API Route/GET] Hata:', msg);
    return NextResponse.json(
      { success: false, vehicles: [], error: msg },
      { status: 500 }
    );
  }
}
