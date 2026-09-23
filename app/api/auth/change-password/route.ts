import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword, confirmNewPassword } = body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return NextResponse.json({ error: 'Semua kolom kata sandi wajib diisi.' }, { status: 400 });
  }

  if (newPassword !== confirmNewPassword) {
    return NextResponse.json({ error: 'Konfirmasi kata sandi baru tidak cocok.' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Kata sandi baru minimal 8 karakter.' }, { status: 400 });
  }

  const db = getDb();
  const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.userId) as { password_hash: string } | undefined;
  if (!userRow) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
  }

  const isValid = await verifyPassword(currentPassword, userRow.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Kata sandi saat ini salah.' }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, user.userId);

  // Security notification
  const notifId = 'notif_' + Math.random().toString(36).substring(2, 9);
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
    VALUES (?, ?, 'Keamanan Akun', 'Kata sandi akun Anda baru saja berhasil diperbarui.', 'security', 0, '/account/security', ?)
  `).run(notifId, user.userId, now);

  return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
}
