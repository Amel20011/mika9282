import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Hanya Super Administrator yang berhak mengelola akun staf.' }, { status: 403 });
  }

  const db = getDb();
  const admins = db.prepare(`
    SELECT id, name, username, email, role, status, created_at, updated_at, last_login_at
    FROM admins
    ORDER BY created_at ASC
  `).all();

  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Hanya Super Administrator yang berhak mengelola akun staf.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, id, name, username, email, password, role, status } = body;
  const db = getDb();
  const now = new Date().toISOString();

  if (action === 'create') {
    if (!name || !username || !email || !password || !role) {
      return NextResponse.json({ error: 'Seluruh data staf administrator wajib diisi.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existing = db.prepare('SELECT id FROM admins WHERE LOWER(username) = ? OR LOWER(email) = ?').get(cleanUsername, cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'Username atau email staf sudah terdaftar.' }, { status: 409 });
    }

    const adminId = 'adm_' + crypto.randomUUID();
    const passHash = await hashPassword(password);

    db.prepare(`
      INSERT INTO admins (id, name, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(adminId, name.trim(), cleanUsername, cleanEmail, passHash, role, now, now);

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'CREATE_ADMIN', 'admins', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, adminId, `Membuat akun administrator baru: ${name} (${role})`, now);

    return NextResponse.json({ success: true, message: 'Akun administrator baru berhasil dibuat.' });
  }

  if (action === 'update' && id) {
    if (id === admin.adminId && status && status !== 'active') {
      return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan akun Super Admin Anda sendiri.' }, { status: 400 });
    }

    let updateSql = 'UPDATE admins SET name = ?, email = ?, role = ?, status = ?, updated_at = ?';
    const params: unknown[] = [name.trim(), email.trim().toLowerCase(), role, status, now];

    if (password && password.trim().length >= 8) {
      const newHash = await hashPassword(password.trim());
      updateSql = 'UPDATE admins SET name = ?, email = ?, role = ?, status = ?, password_hash = ?, updated_at = ?';
      params.splice(4, 0, newHash);
    }

    updateSql += ' WHERE id = ?';
    params.push(id);

    db.prepare(updateSql).run(...params);

    if (status !== 'active') {
      db.prepare('UPDATE admin_sessions SET is_revoked = 1 WHERE admin_id = ?').run(id);
    }

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'UPDATE_ADMIN', 'admins', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, id, `Memperbarui akun administrator ${name} (${role}, ${status})`, now);

    return NextResponse.json({ success: true, message: 'Data administrator berhasil diperbarui.' });
  }

  return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
}
