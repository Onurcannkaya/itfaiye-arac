import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const results: Record<string, any> = {};

  // Personnel tablosunun yapısını test et - sicil_no PK mi yoksa id PK mi?
  const { data: testData, error: testErr } = await admin.from('personnel').select('*').limit(1);
  
  if (testErr) {
    results.personnelError = testErr.message;
  } else if (testData && testData.length > 0) {
    results.personnelColumns = Object.keys(testData[0]);
    results.hasIdColumn = 'id' in testData[0];
    results.hasSicilColumn = 'sicil_no' in testData[0];
    results.sampleRow = testData[0];
  } else {
    results.personnelEmpty = true;
  }

  // Personnel tablosuna sicil_no ile sorgu yap
  const { data: bySicil, error: sicilErr } = await admin.from('personnel').select('*').eq('sicil_no', 'SB5801');
  results.bySicilQuery = bySicil;
  if (sicilErr) results.bySicilError = sicilErr.message;

  return NextResponse.json(results);
}
