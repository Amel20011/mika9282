import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, avatarUrl } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nama tidak boleh kosong.' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users
    SET name = ?, phone = ?, avatar_url = ?, updated_at = ?
    WHERE id = ?
  `).run(name.trim(), phone ? phone.trim() : null, avatarUrl || null, now, user.userId);

  return NextResponse.json({
    success: true,
    user: {
      ...user,
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      avatarUrl: avatarUrl || null,
    },
  });
}
