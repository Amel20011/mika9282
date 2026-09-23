import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    const db = getDb();

    if (markAll) {
      db.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ? OR user_id IS NULL
      `).run(user.userId);
      return NextResponse.json({ success: true, message: 'Semua notifikasi telah ditandai dibaca.' });
    }

    if (notificationId) {
      db.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND (user_id = ? OR user_id IS NULL)
      `).run(notificationId, user.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status notifikasi.' }, { status: 500 });
  }
}
