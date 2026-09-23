import { NextResponse } from 'next/server';
import { revokeUserSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  await revokeUserSession();
  return NextResponse.json({ success: true, message: 'Berhasil keluar.' });
}
