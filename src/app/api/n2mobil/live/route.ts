import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const N2_TOKEN = process.env.N2MOBIL_TOKEN;
const FLEET_ID = "6044";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    try {
      // 1. Fetch Vehicles List
      const vehiclesRes = await fetch(`https://ats2.n2mobil.com/api/ats/get_vehicles_list?fleet_id=${FLEET_ID}`, {
        headers: { Authorization: `JWT ${N2_TOKEN}` },
        next: { revalidate: 60 }
      });
      
      if (!vehiclesRes.ok) throw new Error("Araç listesi alınamadı.");
      const vehiclesData = await vehiclesRes.json();
      
      const vehicleMap = new Map();
      if (vehiclesData.data) {
        vehiclesData.data.forEach((v: any) => {
          vehicleMap.set(v.value, v.plate);
        });
      }

      // 2. Fetch Last Signals
      const signalsRes = await fetch(`https://ats2.n2mobil.com/api/ats/get_devices_last_signal?fleet_id=${FLEET_ID}`, {
        headers: { Authorization: `JWT ${N2_TOKEN}` },
        next: { revalidate: 2 }
      });

      if (!signalsRes.ok) throw new Error("Sinyal verisi alınamadı.");
      const signalsData = await signalsRes.json();

      if (signalsData.data && signalsData.data.features) {
        const mappedVehicles = signalsData.data.features.map((feature: any) => {
          const props = feature.properties;
          const plate = vehicleMap.get(props.id) || props.device_id;
          
          return {
            vehicle_id: props.id,
            plate: plate,
            latitude: props.point.coordinates[1],
            longitude: props.point.coordinates[0],
            speed: props.speed || 0,
            ignition: props.ignition ? 'aktif' : 'pasif',
            direction: props.angle || 0,
            address: props.address || 'Konum Bilgisi Alınamadı',
            dataTime: props.last_signal ? new Date(props.last_signal * 1000).toISOString() : new Date().toISOString()
          };
        });

        return NextResponse.json({
          success: true,
          mode: 'realtime',
          vehicles: mappedVehicles
        });
      }

    } catch (apiErr: any) {
      console.warn('[N2Mobil API] Bağlantı hatası:', apiErr.message);
    }

    // 3. Fall-Back Simulation Mode
    const dbVehicles = await queryMany(`SELECT plaka, arac_tipi, durum FROM public.vehicles`);
    const now = Date.now();
    const STATION_LAT = 39.7339522;
    const STATION_LNG = 37.0209312;

    const simulatedVehicles = dbVehicles.map((v: any, i: number) => {
      const isMoving = i % 3 !== 0 && v.durum !== 'Bakımda';
      let lat = STATION_LAT;
      let lng = STATION_LNG;
      let speed = 0;
      let ignition = 'pasif';
      let heading = 0;
      let address = "Sivas İtfaiye Komuta Merkezi";

      if (isMoving) {
        const angle = (now / 45000) + (i * 0.9);
        const radius = 0.004 + (i * 0.001);
        lat += Math.sin(angle) * radius;
        lng += Math.cos(angle) * radius;
        speed = Math.floor(35 + Math.sin(angle) * 15);
        ignition = 'aktif';
        heading = angle + Math.PI / 2;
        heading = (heading % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        address = `Sivas Canlı Devriye Bölgesi - Kod ${i + 10}`;
      } else if (v.durum === 'Bakımda') {
        lat += 0.0015;
        lng += 0.0015;
        address = "Makine İkmal Müdürlüğü (Bakım-Onarım Garajı)";
      } else {
        const angle = (i * 2 * Math.PI) / 8;
        lat += Math.sin(angle) * 0.0002;
        lng += Math.cos(angle) * 0.0002;
        heading = angle + Math.PI;
      }

      return {
        vehicle_id: null,
        plate: v.plaka,
        latitude: lat,
        longitude: lng,
        speed: speed,
        ignition: ignition,
        direction: heading,
        address: address,
        dataTime: new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      mode: 'simulation',
      fallbackReason: "N2 Mobil verisi alınamadı, simülasyon aktif",
      vehicles: simulatedVehicles
    });

  } catch (err: unknown) {
    return NextResponse.json({ success: false, vehicles: [], error: String(err) }, { status: 500 });
  }
}
