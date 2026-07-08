import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const N2_TOKEN = process.env.N2MOBIL_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicle_id = searchParams.get('vehicle_id');

    if (!vehicle_id) {
      return NextResponse.json({ error: "vehicle_id gerekli." }, { status: 400 });
    }

    try {
      const res = await fetch(`https://ats2.n2mobil.com/api/camera/?vehicle_id=${vehicle_id}`, {
        headers: { Authorization: `JWT ${N2_TOKEN}` },
        next: { revalidate: 0 } // Always fresh
      });
      
      if (!res.ok) throw new Error("Kamera API isteği başarısız.");
      const data = await res.json();
      
      return NextResponse.json(data);

    } catch (apiErr: any) {
      console.warn('[N2Mobil Camera API] Bağlantı hatası:', apiErr.message);
      return NextResponse.json({ success: false, error: "Kamera bağlantısı kurulamadı." }, { status: 500 });
    }

  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
