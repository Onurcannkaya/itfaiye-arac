import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import crypto from 'crypto';
import { getSessionFromRequest } from '@/lib/auth';
import { uploadToMinio } from '@/lib/storage';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf',
  // Telsiz ses kayıtları (mikrofon kaydı + harici dosya yükleme)
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/mp4',
  'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/x-m4a',
];

/**
 * POST /api/upload
 * Multipart form-data ile dosya yükleme.
 * Dosyalar MinIO'ya (assets.sivas.bel.tr) `public/itfaiye/<folder>/` altına yüklenir.
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

    // Benzersiz dosya adı: UUID + timestamp + orijinal uzantı
    const ext = path.extname(file.name) || '.bin';
    const uniqueName = `${crypto.randomUUID()}_${Date.now()}${ext}`;

    // MinIO'ya yükle ve herkese açık URL'yi al
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const publicUrl = await uploadToMinio(folder, uniqueName, buffer, file.type);

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
