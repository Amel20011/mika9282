import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'settings')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses pengaturan sistem.' }, { status: 403 });
  }

  const db = getDb();
  const rows = db.prepare('SELECT key, value, updated_at FROM website_settings').all() as Array<{ key: string; value: string; updated_at: string }>;

  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }

  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'settings')) {
    return NextResponse.json({ error: 'Tidak memiliki izin mengubah pengaturan sistem.' }, { status: 403 });
  }

  const body = await req.json();
  const { settings } = body as { settings: Record<string, string> };

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Format pengaturan tidak valid.' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE;');

  for (const [key, value] of Object.entries(settings)) {
    db.prepare(`
      INSERT INTO website_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).run(key, String(value), now, String(value), now);
  }

  db.prepare(`
    INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
    VALUES (?, ?, ?, ?, 'UPDATE_SETTINGS', 'website_settings', 'all', ?, '127.0.0.1', ?)
  `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, `Memperbarui konfigurasi website dan QRIS: ${Object.keys(settings).join(', ')}`, now);

  db.exec('COMMIT;');

  return NextResponse.json({ success: true, message: 'Pengaturan sistem berhasil disimpan.' });
}
