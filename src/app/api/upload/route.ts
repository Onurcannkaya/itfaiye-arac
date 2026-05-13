import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSessionFromRequest } from '@/lib/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf'
];

/**
 * POST /api/upload
 * Multipart form-data ile dosya yükleme.
 * Dosyalar public/uploads/ dizinine kaydedilir.
 */
export async function POST(request: NextRequest) {
  try {
    // JWT yetki kontrolü
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    // Boyut kontrolü
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Dosya boyutu çok büyük. Maksimum: ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    // Tip kontrolü
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Desteklenmeyen dosya türü: ' + file.type }, { status: 400 });
    }

    // Klasör oluştur
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadDir = path.resolve(UPLOAD_DIR, safeFolder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Benzersiz dosya adı: UUID + timestamp + orijinal uzantı
    const ext = path.extname(file.name) || '.jpg';
    const uniqueName = `${crypto.randomUUID()}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Dosyayı kaydet
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Public URL döndür
    const publicUrl = `/uploads/${safeFolder}/${uniqueName}`;

    return NextResponse.json({
      url: publicUrl,
      fileName: uniqueName,
      size: file.size,
      type: file.type,
      error: null,
    });
  } catch (error: any) {
    console.error('[upload] Hata:', error);
    return NextResponse.json({ error: 'Dosya yükleme hatası: ' + error.message }, { status: 500 });
  }
}
