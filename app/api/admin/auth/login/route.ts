import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/Email dan Password admin wajib diisi.' }, { status: 400 });
    }

    const db = getDb();
    const trimmedId = identifier.trim().toLowerCase();

    const admin = db.prepare(`
      SELECT id, name, username, email, password_hash, role, status
      FROM admins
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(trimmedId, trimmedId) as {
      id: string;
      name: string;
      username: string;
      email: string;
      password_hash: string;
      role: string;
      status: string;
    } | undefined;

    if (!admin) {
      return NextResponse.json({ error: 'Kredensial administrator tidak valid.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      // Record failed security event
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO security_events (id, actor_type, actor_id, event_type, description, severity, ip_address, created_at)
        VALUES (?, 'admin', ?, 'ADMIN_FAILED_LOGIN', 'Percobaan login admin gagal dengan kredensial tidak cocok', 'warning', '127.0.0.1', ?)
      `).run('sec_' + Math.random().toString(36).substring(2, 9), admin.id, now);

      return NextResponse.json({ error: 'Kredensial administrator tidak valid.' }, { status: 401 });
    }

    if (admin.status !== 'active') {
      return NextResponse.json({ error: `Akun administrator berstatus ${admin.status}. Hubungi Super Admin.` }, { status: 403 });
    }

    // Create admin session
    await createAdminSession(admin.id);

    // Record audit
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'ADMIN_LOGIN', 'admins', ?, 'Administrator berhasil masuk ke portal kendali sistem', '127.0.0.1', ?)
    `).run('aud_' + Math.random().toString(36).substring(2, 9), admin.id, admin.name, admin.role, admin.id, now);

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat proses masuk administrator.' }, { status: 500 });
  }
}
