import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PERSONNEL = [
  { sicil: 'SB5801', ad: 'İbrahim', soyad: 'Alaçam', unvan: 'Müdür', rol: 'Admin', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5802', ad: 'Seyfi Ali', soyad: 'Gül', unvan: 'Amir', rol: 'Editor', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5803', ad: 'Ahmet', soyad: 'Çelimli', unvan: 'Amir', rol: 'Editor', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5804', ad: 'Ahmet', soyad: 'Yıldız', unvan: 'Amir', rol: 'Editor', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5805', ad: 'Hidayet', soyad: 'Yücekaya', unvan: 'Başçavuş', rol: 'Shift_Leader', view_only: false, can_approve: true, can_print: false },
  { sicil: 'SB5806', ad: 'Ömer', soyad: 'Çakmak', unvan: 'Çavuş', rol: 'Shift_Leader', view_only: false, can_approve: true, can_print: false },
  { sicil: 'SB5807', ad: 'Abdullah Übeyde', soyad: 'Özkur', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5808', ad: 'Beyza', soyad: 'Durak', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5809', ad: 'Beyza', soyad: 'Kılıç', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5810', ad: 'Elif', soyad: 'Tunçer', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5811', ad: 'Emir Furkan', soyad: 'Taşdelen', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5812', ad: 'Fatih', soyad: 'Güler', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5813', ad: 'Fatmanur', soyad: 'Kişi', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5814', ad: 'Gülenay', soyad: 'Koçak', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5815', ad: 'Hasan Çınar', soyad: 'Kuzu', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5816', ad: 'İsmail', soyad: 'Aslan', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5817', ad: 'Kadir', soyad: 'Kuru', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5818', ad: 'Melih', soyad: 'Arslan', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5819', ad: 'Muhammed Emin', soyad: 'Kara', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5820', ad: 'Muhammed Enes', soyad: 'Yıldırım', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5821', ad: 'Muhammed', soyad: 'Kara', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5822', ad: 'Muhammed Yasir', soyad: 'İnce', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5823', ad: 'Mustafa', soyad: 'Demir', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5824', ad: 'Mustafa', soyad: 'Köse', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5825', ad: 'Mustafa Metin', soyad: 'Bıçakcigil', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5826', ad: 'Onurcan', soyad: 'Kaya', unvan: 'İtfaiye Eri / Geliştirici', rol: 'Admin', view_only: false, can_approve: true, can_print: true },
  { sicil: 'SB5827', ad: 'Selahattin', soyad: 'Tosun', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5828', ad: 'Sencer', soyad: 'Yıldız', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5829', ad: 'Uğur', soyad: 'Budak', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
  { sicil: 'SB5830', ad: 'Yağmur', soyad: 'Aydın', unvan: 'İtfaiye Eri', rol: 'User', view_only: true, can_approve: false, can_print: false },
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const logs: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  // ─── ADIM 1: Mevcut auth kullanıcılarını temizle ───
  logs.push("── ADIM 1: Mevcut auth kullanıcıları temizleniyor...");
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  if (existingUsers?.users) {
    for (const u of existingUsers.users) {
      if (u.email?.endsWith('@itfaiye.local')) {
        await admin.auth.admin.deleteUser(u.id);
        logs.push(`  Silindi: ${u.email}`);
      }
    }
  }

  // ─── ADIM 2: Personnel tablosunu temizle ───
  logs.push("── ADIM 2: Personnel tablosu temizleniyor...");
  await admin.from('personnel').delete().neq('sicil_no', '___impossible___');

  // ─── ADIM 3: Her personel için auth user + personnel kaydı oluştur ───
  logs.push("── ADIM 3: 30 kullanıcı oluşturuluyor...");

  for (const p of PERSONNEL) {
    const email = `${p.sicil.toLowerCase()}@itfaiye.local`;

    // Auth kullanıcı oluştur
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: '1234',
      email_confirm: true,
      user_metadata: { sicil_no: p.sicil, ad: p.ad, soyad: p.soyad },
    });

    if (authError) {
      logs.push(`  ✗ ${p.sicil} (${p.ad} ${p.soyad}) AUTH: ${authError.message}`);
      errorCount++;
      continue;
    }

    // Personnel kaydı oluştur (id = auth user id)
    const { error: persError } = await admin.from('personnel').insert({
      id: authData.user.id,
      sicil_no: p.sicil,
      ad: p.ad,
      soyad: p.soyad,
      unvan: p.unvan,
      rol: p.rol,
      view_only: p.view_only,
      can_approve: p.can_approve,
      can_print: p.can_print,
      aktif: true,
    });

    if (persError) {
      logs.push(`  ✗ ${p.sicil} (${p.ad} ${p.soyad}) PERSONNEL: ${persError.message}`);
      errorCount++;
    } else {
      logs.push(`  ✓ ${p.sicil} — ${p.ad} ${p.soyad} (${p.unvan})`);
      successCount++;
    }
  }

  // ─── ADIM 4: Login testi ───
  logs.push("── ADIM 4: Login testi (SB5826 / 1234)...");
  const anon = createClient(supabaseUrl, anonKey);
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email: 'sb5826@itfaiye.local',
    password: '1234',
  });
  
  if (signErr) {
    logs.push(`  ✗ Login BAŞARISIZ: ${signErr.message}`);
  } else {
    logs.push(`  ✓ Login BAŞARILI! Kullanıcı: ${signIn.user?.email}`);
  }

  // ─── ADIM 5: Doğrulama ───
  const { data: finalPersonnel } = await admin.from('personnel').select('sicil_no, ad, soyad').order('sicil_no');
  const { data: finalAuth } = await admin.auth.admin.listUsers();

  return NextResponse.json({
    message: `${successCount} başarılı, ${errorCount} hata`,
    authUserCount: finalAuth?.users?.length || 0,
    personnelCount: finalPersonnel?.length || 0,
    loginTestResult: signErr ? `FAIL: ${signErr.message}` : 'SUCCESS',
    personnel: finalPersonnel,
    logs,
  });
}
