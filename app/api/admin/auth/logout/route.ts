import { NextResponse } from 'next/server';
import { revokeAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  await revokeAdminSession();
  return NextResponse.json({ success: true, message: 'Administrator berhasil keluar.' });
}
