import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'users')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses pengguna.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q');
  const statusFilter = searchParams.get('status');

  const db = getDb();
  let query = `
    SELECT u.id, u.name, u.username, u.email, u.phone, u.status, u.created_at, u.last_login_at,
           COALESCE(b.amount, 0) as balance,
           (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as total_orders,
           (SELECT COUNT(*) FROM deposits WHERE user_id = u.id AND status = 'approved') as total_approved_deposits
    FROM users u
    LEFT JOIN balances b ON b.user_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (statusFilter && statusFilter !== 'all') {
    query += ` AND u.status = ?`;
    params.push(statusFilter);
  }

  if (search && search.trim().length > 0) {
    query += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY u.created_at DESC LIMIT 100`;

  const users = db.prepare(query).all(...params);

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'users')) {
    return NextResponse.json({ error: 'Tidak memiliki izin mengubah status pengguna.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, userId, reason } = body;

  if (!userId) {
    return NextResponse.json({ error: 'ID Pengguna wajib disertakan.' }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, name, username, email, status FROM users WHERE id = ?').get(userId) as {
    id: string;
    name: string;
    username: string;
    email: string;
    status: string;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (action === 'ban' || action === 'suspend' || action === 'restore') {
    const newStatus = action === 'ban' ? 'banned' : action === 'suspend' ? 'suspended' : 'active';
    const actionReason = reason?.trim() || `Status diubah menjadi ${newStatus} oleh ${admin.name}`;

    db.exec('BEGIN IMMEDIATE;');

    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, userId);

    // If banned or suspended, immediately revoke all active sessions
    if (newStatus !== 'active') {
      db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(userId);
    }

    // Security event
    db.prepare(`
      INSERT INTO security_events (id, actor_type, actor_id, event_type, description, severity, ip_address, created_at)
      VALUES (?, 'admin', ?, ?, ?, 'warning', '127.0.0.1', ?)
    `).run('sec_' + crypto.randomUUID(), admin.adminId, `USER_${action.toUpperCase()}`, `Status user ${user.username} diubah menjadi ${newStatus}. Alasan: ${actionReason}`, now);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, 'users', ?, ?, '127.0.0.1', ?)
    `).run(
      'aud_' + crypto.randomUUID(),
      admin.adminId,
      admin.name,
      admin.role,
      `USER_${action.toUpperCase()}`,
      userId,
      `Mengubah status user ${user.name} (@${user.username}) menjadi ${newStatus}. Alasan: ${actionReason}`,
      now
    );

    // Notification to user
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
      VALUES (?, ?, 'Pembaruan Status Akun', ?, 'security', 0, ?)
    `).run(
      'notif_' + crypto.randomUUID(),
      userId,
      newStatus === 'active'
        ? 'Akun Anda telah diaktifkan kembali oleh Administrator.'
        : `Akun Anda berstatus ${newStatus}. Alasan: ${actionReason}`,
      now
    );

    db.exec('COMMIT;');

    return NextResponse.json({ success: true, message: `Status pengguna berhasil diperbarui menjadi ${newStatus}.` });
  }

  if (action === 'force_logout') {
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(userId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'FORCE_LOGOUT_USER', 'users', ?, ?, '127.0.0.1', ?)
    `).run(
      'aud_' + crypto.randomUUID(),
      admin.adminId,
      admin.name,
      admin.role,
      userId,
      `Memaksa keluar (force logout) seluruh sesi aktif user ${user.username}`,
      now
    );

    return NextResponse.json({ success: true, message: 'Seluruh sesi aktif pengguna telah dihentikan.' });
  }

  return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
}
