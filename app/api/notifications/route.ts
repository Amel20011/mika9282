import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    const notifications = db.prepare(`
      SELECT id, title, message, type, is_read, link_url, created_at
      FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `).all(user.userId);

    const unreadCountRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
    `).get(user.userId) as { count: number };

    return NextResponse.json({
      notifications,
      unreadCount: unreadCountRow ? Number(unreadCountRow.count) : 0,
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat notifikasi.' }, { status: 500 });
  }
}
