import { NextResponse } from "next/server";
import { query, queryMany } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const PERSONNEL = [
  { sicil: 'SB5801', ad: 'İbrahim', soyad: 'Alaçam', unvan: 'Müdür', rol: 'Admin', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5802', ad: 'Seyfi Ali', soyad: 'Gül', unvan: 'Amir', rol: 'Editor', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5803', ad: 'Ahmet', soyad: 'Çelimli', unvan: 'Amir', rol: 'Editor', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5804', ad: 'Ahmet', soyad: 'Yıldız', unvan: 'Amir', rol: 'Editor', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5805', ad: 'Hidayet', soyad: 'Yücekaya', unvan: 'Başçavuş', rol: 'Shift_Leader', view_only: false, can_approve: true, can_print: false },
  { sicil: 'SB5806', ad: 'Ömer', soyad: 'Çakmak', unvan: 'Çavuş', rol: 'Shift_Leader', view_only: false, can_approve: true, can_print: false },
  { sicil: 'SB5807', ad: 'Abdullah Übeyde', soyad: 'Özkur', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5826', ad: 'Onurcan', soyad: 'Kaya', unvan: 'İtfaiye Eri / Geliştirici', rol: 'Admin', view_only: false, can_approve: true, can_print: true },
];

export async function GET() {
  const logs: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  const defaultPasswordHash = await hashPassword("1234");

  // ─── ADIM 1: Personnel tablosunu temizle ───
  logs.push("── ADIM 1: Personnel tablosu temizleniyor...");
  await query("DELETE FROM personnel WHERE sicil_no != '___impossible___'");

  // ─── ADIM 2: Personel kayıtlarını oluştur ───
  logs.push("── ADIM 2: Kullanıcılar oluşturuluyor...");

  for (const p of PERSONNEL) {
    try {
      await query(
        `INSERT INTO personnel (sicil_no, ad, soyad, unvan, rol, view_only, can_approve, can_print, aktif, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         ON CONFLICT (sicil_no) DO UPDATE SET ad = $2, soyad = $3, unvan = $4, rol = $5, password_hash = $9`,
        [p.sicil, p.ad, p.soyad, p.unvan, p.rol, p.view_only, p.can_approve, p.can_print, defaultPasswordHash]
      );
      logs.push(`  ✓ ${p.sicil} — ${p.ad} ${p.soyad} (${p.unvan})`);
      successCount++;
    } catch (err: any) {
      logs.push(`  ✗ ${p.sicil}: ${err.message}`);
      errorCount++;
    }
  }

  // ─── ADIM 3: Doğrulama ───
  const finalPersonnel = await queryMany("SELECT sicil_no, ad, soyad FROM personnel ORDER BY sicil_no");

  return NextResponse.json({
    message: `${successCount} başarılı, ${errorCount} hata`,
    personnelCount: finalPersonnel.length,
    personnel: finalPersonnel,
    logs,
  });
}
