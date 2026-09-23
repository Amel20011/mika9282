import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT id, name, slug, description, display_order, is_active
      FROM categories
      WHERE is_active = 1
      ORDER BY display_order ASC, name ASC
    `).all();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json({ error: 'Gagal memuat kategori produk' }, { status: 500 });
  }
}
