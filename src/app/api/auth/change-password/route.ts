import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, verifyPassword, getSessionFromRequest, AuthError, signToken, COOKIE_CONFIG } from '@/lib/auth';

/**
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 * Requires authenticated session.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mevcut parola ve yeni parola zorunludur.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'Yeni parola en az 4 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    // Fetch personnel record
    const person = await queryOne(
      'SELECT sicil_no, password_hash FROM personnel WHERE sicil_no = $1',
      [session.sicilNo]
    );

    if (!person) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    // Verify current password
    if (person.password_hash) {
      const valid = await verifyPassword(currentPassword, person.password_hash);
      if (!valid) {
        await query(
          'INSERT INTO auth_logs (sicil_no, event_type, details) VALUES ($1, $2, $3)',
          [session.sicilNo, 'password_change_failed', 'Mevcut parola hatalı']
        );
        return NextResponse.json(
          { error: 'Mevcut parola hatalı.' },
          { status: 401 }
        );
      }
    } else {
      // No hash stored; accept "1234" as the default
      if (currentPassword !== '1234') {
        return NextResponse.json(
          { error: 'Mevcut parola hatalı.' },
          { status: 401 }
        );
      }
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    await query(
      'UPDATE personnel SET password_hash = $1 WHERE sicil_no = $2',
      [newHash, session.sicilNo]
    );

    // Mark any temp password as used
    await query(
      'UPDATE temp_passwords SET used = true, used_at = NOW() WHERE sicil_no = $1 AND used = false',
      [session.sicilNo]
    );

    // Auth log
    await query(
      'INSERT INTO auth_logs (sicil_no, event_type, details) VALUES ($1, $2, $3)',
      [session.sicilNo, 'password_changed', `${session.ad} ${session.soyad} parolasını değiştirdi`]
    );

    // Sign a new token since mustChangePassword is now false
    const token = signToken({
      sicilNo: session.sicilNo,
      ad: session.ad,
      soyad: session.soyad,
      rol: session.rol,
      unvan: session.unvan,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Parola başarıyla değiştirildi.',
      token: token,
      user: {
        sicilNo: session.sicilNo,
        ad: session.ad,
        soyad: session.soyad,
        unvan: session.unvan,
        rol: session.rol,
        mustChangePassword: false,
      }
    });

    response.cookies.set(COOKIE_CONFIG.name, token, {
      httpOnly: COOKIE_CONFIG.httpOnly,
      secure: COOKIE_CONFIG.secure,
      sameSite: COOKIE_CONFIG.sameSite,
      path: COOKIE_CONFIG.path,
      maxAge: COOKIE_CONFIG.maxAge,
    });

    return response;
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[auth/change-password] Sunucu hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    );
  }
}
