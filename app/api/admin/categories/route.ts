import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'products')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses kategori.' }, { status: 403 });
  }

  const db = getDb();
  const categories = db.prepare(`
    SELECT c.id, c.name, c.slug, c.description, c.display_order, c.is_active, c.created_at,
           (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
    FROM categories c
    ORDER BY c.display_order ASC, c.name ASC
  `).all();

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'products')) {
    return NextResponse.json({ error: 'Tidak memiliki izin mengubah kategori.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, id, name, description, displayOrder } = body;
  const db = getDb();
  const now = new Date().toISOString();

  if (action === 'create') {
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 });
    }

    const catId = 'cat_' + crypto.randomUUID().substring(0, 8);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    db.prepare(`
      INSERT INTO categories (id, name, slug, description, display_order, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(catId, name.trim(), slug, description || '', displayOrder || 0, now);

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'CREATE_CATEGORY', 'categories', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, catId, `Menambah kategori baru: ${name}`, now);

    return NextResponse.json({ success: true, message: 'Kategori berhasil ditambahkan.' });
  }

  if (action === 'toggle' && id) {
    const cat = db.prepare('SELECT is_active, name FROM categories WHERE id = ?').get(id) as { is_active: number; name: string } | undefined;
    if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });

    const newActive = cat.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE categories SET is_active = ? WHERE id = ?').run(newActive, id);

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'TOGGLE_CATEGORY', 'categories', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, id, `Mengubah status kategori ${cat.name} menjadi ${newActive === 1 ? 'Aktif' : 'Non-aktif'}`, now);

    return NextResponse.json({ success: true, isActive: newActive === 1 });
  }

  return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
}
