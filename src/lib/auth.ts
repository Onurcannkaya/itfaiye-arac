import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me-in-production';
const COOKIE_NAME = 'itfaiye_token';
const TOKEN_EXPIRY = '24h';

export interface JWTPayload {
  sicilNo: string;
  ad: string;
  soyad: string;
  rol: string;
  unvan: string;
}

/**
 * Şifre hash'le (kayıt sırasında).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Şifre doğrulama (giriş sırasında).
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * JWT token üret.
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * JWT token doğrula.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Cookie'den token'ı oku ve doğrula (Server Components ve API Routes için).
 */
export async function getSessionFromCookies(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Request header veya cookie'den token'ı doğrula (API middleware).
 */
export function getSessionFromRequest(request: NextRequest): JWTPayload | null {
  // Önce Authorization header'ı kontrol et
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // Sonra cookie'yi kontrol et
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

/**
 * API route koruma — yetkisiz istekleri engeller.
 * Yetki kontrolü: belirtilen roller dışındaki kullanıcıları reddeder.
 */
export function requireAuth(request: NextRequest, allowedRoles?: string[]): JWTPayload {
  const session = getSessionFromRequest(request);
  if (!session) {
    throw new AuthError('Oturum açmanız gerekiyor.', 401);
  }
  if (allowedRoles && !allowedRoles.includes(session.rol)) {
    throw new AuthError('Bu işlem için yetkiniz bulunmamaktadır.', 403);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export const COOKIE_CONFIG = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 saat
};
