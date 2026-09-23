import { NextResponse } from 'next/server';
import { getCurrentAdmin, revokeAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ authenticated: false, admin: null });
  }

  return NextResponse.json({
    authenticated: true,
    admin,
  });
}

export async function POST() {
  await revokeAdminSession();
  return NextResponse.json({ success: true, message: 'Administrator berhasil keluar.' });
}
