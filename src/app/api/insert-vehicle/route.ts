import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const updateData = {
    "marka": "Mercedes Atego",
    "aracTipi": "2 Nolu İlk Müdahale",
    "plaka": "58 TH 256",
    "bolmeler": {
      "sag_on_kapak": [
        { "malzeme": "Jeneratör", "adet": 1, "durum": "Tam" },
        { "malzeme": "Rodex Şarjlı Alet Seti", "adet": 1, "durum": "Tam" },
        { "malzeme": "6 Kg'lık Yangın Söndürme Tüpü KKT", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kare Kurtarma Takozu", "adet": 3, "durum": "Tam" },
        { "malzeme": "Kurtarma İpi", "adet": 2, "durum": "Tam" },
        { "malzeme": "Makaralı Kablo", "adet": 3, "durum": "Tam" },
        { "malzeme": "Elektrikli Araç Yangın Battaniyesi", "adet": 1, "durum": "Tam" },
        { "malzeme": "Baltalı Kemer", "adet": 1, "durum": "Tam" },
        { "malzeme": "Bel Emniyet Kemeri", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kurtarma Kemeri (İsveç Oturağı)", "adet": 2, "durum": "Tam" },
        { "malzeme": "Büyük Makara", "adet": 2, "durum": "Tam" },
        { "malzeme": "Küçük Makara", "adet": 5, "durum": "Tam" },
        { "malzeme": "2'li Büyük Makara", "adet": 1, "durum": "Tam" },
        { "malzeme": "Karabina", "adet": 14, "durum": "Tam" },
        { "malzeme": "8 Demiri", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kulaklı 8 Demiri", "adet": 1, "durum": "Tam" },
        { "malzeme": "Şan", "adet": 1, "durum": "Tam" },
        { "malzeme": "Göğüs Jumarı", "adet": 1, "durum": "Tam" },
        { "malzeme": "El Jumarı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Perlon", "adet": 10, "durum": "Tam" },
        { "malzeme": "Anti Panik Sistemli İniş Aleti (ID)", "adet": 1, "durum": "Tam" }
      ],
      "sag_arka_kapak": [
        { "malzeme": "Kıvılcımsız Testere", "adet": 1, "durum": "Tam" },
        { "malzeme": "Araç Zincir Takımı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Spiral", "adet": 1, "durum": "Tam" },
        { "malzeme": "Perde Lans", "adet": 1, "durum": "Tam" },
        { "malzeme": "Figrasyon", "adet": 1, "durum": "Tam" },
        { "malzeme": "Melanjör", "adet": 1, "durum": "Tam" },
        { "malzeme": "Melanjör Hortumu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Köpük Bidonu", "adet": 1, "durum": "Tam" }
      ]
    }
  };

  try {
    // 1. Mevcut aracı çek
    const { data: existing, error: fetchError } = await admin
      .from('vehicles')
      .select('bolmeler')
      .eq('plaka', updateData.plaka)
      .single();

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    // 2. Mevcut bölmelerle yeni bölmeleri merge et
    const mergedBolmeler = {
      ...existing.bolmeler,
      ...updateData.bolmeler
    };

    // 3. Güncelle
    const { data, error } = await admin.from('vehicles').update({
      bolmeler: mergedBolmeler,
    }).eq('plaka', updateData.plaka).select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Araç ${updateData.plaka} bölmeleri başarıyla birleştirildi/güncellendi`, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
