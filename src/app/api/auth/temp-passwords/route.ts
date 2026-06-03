import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

/**
 * GET /api/auth/temp-passwords
 * Admin-only: returns all temp passwords with personnel details.
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['Admin']);

    const rows = await queryMany(
      `SELECT
         tp.sicil_no,
         p.username,
         p.ad,
         p.soyad,
         tp.plain_password,
         tp.created_at,
         tp.created_by,
         tp.used
       FROM temp_passwords tp
       JOIN personnel p ON tp.sicil_no = p.sicil_no
       ORDER BY tp.created_at DESC`
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[auth/temp-passwords] Sunucu hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    );
  }
}
