import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'settings')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses notifikasi sistem.' }, { status: 403 });
  }

  const db = getDb();
  const notifications = db.prepare(`
    SELECT n.id, n.user_id, n.title, n.message, n.type, n.created_at,
           u.name as user_name, u.email as user_email
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.id
    ORDER BY n.created_at DESC
    LIMIT 100
  `).all();

  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'settings')) {
    return NextResponse.json({ error: 'Tidak memiliki izin mengirim notifikasi sistem.' }, { status: 403 });
  }

  const body = await req.json();
  const { title, message, audience, targetUserId, type } = body;

  if (!title || !message) {
    return NextResponse.json({ error: 'Judul dan pesan notifikasi wajib diisi.' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  if (audience === 'single' && targetUserId) {
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(notifId, targetUserId, title.trim(), message.trim(), type || 'system', now);

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'SEND_NOTIFICATION_TARGET', 'notifications', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, targetUserId, `Mengirim notifikasi khusus ke user ${targetUserId}: "${title}"`, now);

    return NextResponse.json({ success: true, message: 'Notifikasi berhasil dikirimkan ke pengguna.' });
  }

  // Broadcast to all users
  const notifId = 'notif_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
    VALUES (?, NULL, ?, ?, ?, 0, ?)
  `).run(notifId, title.trim(), message.trim(), type || 'system', now);

  db.prepare(`
    INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
    VALUES (?, ?, ?, ?, 'BROADCAST_NOTIFICATION', 'notifications', 'broadcast', ?, '127.0.0.1', ?)
  `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, `Mengirim siaran notifikasi massal: "${title}"`, now);

  return NextResponse.json({ success: true, message: 'Notifikasi siaran massal berhasil dipublikasikan.' });
}
