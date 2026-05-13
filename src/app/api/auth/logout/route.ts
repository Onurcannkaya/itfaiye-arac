import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_CONFIG, getSessionFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * POST /api/auth/logout
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (session) {
      await query(
        'INSERT INTO auth_logs (sicil_no, event_type, details) VALUES ($1, $2, $3)',
        [session.sicilNo, 'logout', `${session.ad} ${session.soyad} çıkış yaptı`]
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_CONFIG.name, '', {
      httpOnly: true,
      secure: COOKIE_CONFIG.secure,
      sameSite: COOKIE_CONFIG.sameSite,
      path: '/',
      maxAge: 0, // Hemen expire et
    });

    return response;
  } catch (error: any) {
    console.error('[auth/logout] Sunucu hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
