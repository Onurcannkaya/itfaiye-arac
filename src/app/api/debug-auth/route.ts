import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const results: Record<string, any> = {};

  try {
    // 1) auth.users kullanıcı sayısı
    const { data: userData, error: userErr } = await admin.auth.admin.listUsers();
    if (userErr) {
      results.listUsersError = userErr.message;
    } else {
      results.authUserCount = userData.users.length;
      results.authEmails = userData.users.map(u => u.email).slice(0, 5);
    }

    // 2) personnel tablosu
    const { data: personnelData, error: persErr } = await admin.from('personnel').select('sicil_no, ad, soyad').limit(3);
    results.personnelSample = personnelData;
    if (persErr) results.personnelError = persErr.message;

    // 3) createUser dene
    const testEmail = `test_${Date.now()}@itfaiye.local`;
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: '1234',
      email_confirm: true,
    });
    
    if (createErr) {
      results.createUserError = createErr.message;
      results.createUserCode = (createErr as any).code;
      
      // REST API ile doğrudan dene
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
          body: JSON.stringify({
            email: `test2_${Date.now()}@itfaiye.local`,
            password: '1234',
            email_confirm: true,
          }),
        });
        const body = await res.json();
        results.directApiStatus = res.status;
        results.directApiResponse = body;
        
        if (body.id) {
          await admin.auth.admin.deleteUser(body.id);
          results.directApiCleanup = "deleted";
        }
      } catch (e: any) {
        results.directApiError = e.message;
      }
    } else {
      results.createUserSuccess = true;
      results.createdUserId = createData.user.id;
      
      // Login testi
      const anon = createClient(supabaseUrl, anonKey);
      const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
        email: testEmail,
        password: '1234',
      });
      results.signInSuccess = !!signIn?.user;
      if (signErr) results.signInError = signErr.message;
      
      // Temizle
      await admin.auth.admin.deleteUser(createData.user.id);
      results.cleanup = "test user deleted";
    }
  } catch (e: any) {
    results.fatalError = e.message;
  }

  return NextResponse.json(results, { status: 200 });
}
