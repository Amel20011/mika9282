import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'products')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses manajemen produk.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category_id');
  const search = searchParams.get('q');

  const db = getDb();
  let query = `
    SELECT p.id, p.name, p.slug, p.category_id, p.price, p.status, p.stock,
           p.delivery_info, p.features_json, p.created_at, p.updated_at,
           c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (categoryId && categoryId !== 'all') {
    query += ` AND p.category_id = ?`;
    params.push(categoryId);
  }

  if (search && search.trim().length > 0) {
    query += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.slug) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term);
  }

  query += ` ORDER BY c.display_order ASC, p.price ASC`;

  const products = db.prepare(query).all(...params);

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'products')) {
    return NextResponse.json({ error: 'Tidak memiliki izin mengubah produk.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, id, name, categoryId, price, status, stock, deliveryInfo, features } = body;
  const db = getDb();
  const now = new Date().toISOString();

  if (action === 'create') {
    if (!name || !categoryId || !price) {
      return NextResponse.json({ error: 'Nama produk, kategori, dan harga wajib diisi.' }, { status: 400 });
    }

    const prodId = 'prod_' + crypto.randomUUID();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    const parsedPrice = parseInt(price, 10);
    const parsedStock = stock ? parseInt(stock, 10) : 999;
    const featuresJson = JSON.stringify(Array.isArray(features) ? features : []);

    db.prepare(`
      INSERT INTO products (id, name, slug, category_id, price, status, stock, delivery_info, features_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(prodId, name.trim(), slug, categoryId, parsedPrice, status || 'active', parsedStock, deliveryInfo || '', featuresJson, now, now);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'CREATE_PRODUCT', 'products', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, prodId, `Membuat produk digital baru: ${name} (Rp ${parsedPrice.toLocaleString('id-ID')})`, now);

    return NextResponse.json({ success: true, message: 'Produk digital berhasil ditambahkan.', productId: prodId });
  }

  if (action === 'update' && id) {
    const existing = db.prepare('SELECT id, name, price FROM products WHERE id = ?').get(id) as { id: string; name: string; price: number } | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    const parsedPrice = parseInt(price, 10);
    const parsedStock = stock !== undefined ? parseInt(stock, 10) : 999;
    const featuresJson = JSON.stringify(Array.isArray(features) ? features : []);

    db.prepare(`
      UPDATE products
      SET name = ?, category_id = ?, price = ?, status = ?, stock = ?, delivery_info = ?, features_json = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim(), categoryId, parsedPrice, status, parsedStock, deliveryInfo || '', featuresJson, now, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'UPDATE_PRODUCT', 'products', ?, ?, '127.0.0.1', ?)
    `).run(
      'aud_' + crypto.randomUUID(),
      admin.adminId,
      admin.name,
      admin.role,
      id,
      `Memperbarui produk ${name} (Harga: Rp ${existing.price.toLocaleString('id-ID')} -> Rp ${parsedPrice.toLocaleString('id-ID')}, Status: ${status})`,
      now
    );

    return NextResponse.json({ success: true, message: 'Produk berhasil diperbarui.' });
  }

  if (action === 'toggle_status' && id) {
    const current = db.prepare('SELECT status, name FROM products WHERE id = ?').get(id) as { status: string; name: string } | undefined;
    if (!current) return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });

    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    db.prepare('UPDATE products SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'TOGGLE_PRODUCT_STATUS', 'products', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, id, `Mengubah status produk ${current.name} menjadi ${newStatus}`, now);

    return NextResponse.json({ success: true, newStatus });
  }

  return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
}
