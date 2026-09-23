import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const db = getDb();

    // Query unread notification count
    const notifRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0').get(user.userId) as { count: number };
    const unreadNotifications = notifRow ? Number(notifRow.count) : 0;

    // Check maintenance mode
    const maintSetting = db.prepare("SELECT value FROM website_settings WHERE key = 'maintenance_mode'").get() as { value: string } | undefined;
    const maintenanceMode = maintSetting?.value === 'true';

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        unreadNotifications,
      },
      maintenanceMode,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
