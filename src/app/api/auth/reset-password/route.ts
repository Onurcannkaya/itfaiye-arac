import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, requireAuth, AuthError } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/auth/reset-password
 * Body: { sicil_no: string }
 * Admin-only: generates a random 6-char password, hashes it,
 * updates personnel, and upserts into temp_passwords.
 */
export async function POST(request: NextRequest) {
  try {
    const session = requireAuth(request, ['Admin']);

    const body = await request.json();
    const { sicil_no } = body;

    if (!sicil_no) {
      return NextResponse.json(
        { error: 'Sicil numarası zorunludur.' },
        { status: 400 }
      );
    }

    // Verify target personnel exists
    const person = await queryOne(
      'SELECT sicil_no, ad, soyad FROM personnel WHERE sicil_no = $1',
      [sicil_no]
    );

    if (!person) {
      return NextResponse.json(
        { error: 'Personel bulunamadı.' },
        { status: 404 }
      );
    }

    // Generate random 6-char password (alphanumeric)
    const plainPassword = crypto.randomBytes(4).toString('hex').substring(0, 6).toUpperCase();

    // Hash and update personnel
    const newHash = await hashPassword(plainPassword);
    await query(
      'UPDATE personnel SET password_hash = $1 WHERE sicil_no = $2',
      [newHash, sicil_no]
    );

    // Upsert into temp_passwords
    await query(
      `INSERT INTO temp_passwords (sicil_no, plain_password, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (sicil_no)
       DO UPDATE SET plain_password = $2, created_at = NOW(), created_by = $3, used = false, used_at = NULL`,
      [sicil_no, plainPassword, session.sicilNo]
    );

    // Auth log
    await query(
      'INSERT INTO auth_logs (sicil_no, event_type, details) VALUES ($1, $2, $3)',
      [sicil_no, 'password_reset', `Admin ${session.ad} ${session.soyad} tarafından şifre sıfırlandı`]
    );

    return NextResponse.json({
      success: true,
      newPassword: plainPassword,
      message: `${person.ad} ${person.soyad} için geçici şifre oluşturuldu.`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[auth/reset-password] Sunucu hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    );
  }
}
