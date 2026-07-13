import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Select all incidents with valid locations from postgresql
    if (!getSessionFromRequest(request)) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const result = await query(
      `SELECT * FROM public.incidents WHERE location IS NOT NULL`
    );

    return NextResponse.json({
      success: true,
      incidents: result.rows
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[harita-canli-vaka/GET] Hata:', msg);
    
    // Enforce returning valid JSON on error states to prevent client HTML-parsing failures
    return NextResponse.json(
      { success: false, incidents: [], error: msg },
      { status: 500 }
    );
  }
}
