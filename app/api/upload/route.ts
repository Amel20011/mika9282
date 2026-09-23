import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Authenticate: must be logged in user or admin
    const user = await getCurrentUser();
    const admin = await getCurrentAdmin();
    if (!user && !admin) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk mengunggah berkas.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Berkas tidak ditemukan dalam formulir.' }, { status: 400 });
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran berkas melebihi batas maksimal 5 MB.' }, { status: 400 });
    }

    // Validate MIME type strictly
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format berkas tidak didukung. Harap unggah PNG, JPG, JPEG, atau WebP.' }, { status: 400 });
    }

    // Determine extension
    let ext = '.png';
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') ext = '.jpg';
    else if (file.type === 'image/webp') ext = '.webp';
    else if (file.type === 'image/svg+xml') ext = '.svg';

    const safeFilename = 'upload_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex') + ext;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadsDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${safeFilename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah berkas ke server.' }, { status: 500 });
  }
}
