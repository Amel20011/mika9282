import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category');
    const search = searchParams.get('q');

    const db = getDb();

    let query = `
      SELECT p.id, p.name, p.slug, p.category_id, p.price, p.status, p.stock,
             p.delivery_info, p.features_json, p.created_at,
             c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `;
    const params: unknown[] = [];

    if (categorySlug && categorySlug !== 'all') {
      query += ` AND c.slug = ?`;
      params.push(categorySlug);
    }

    if (search && search.trim().length > 0) {
      query += ` AND (LOWER(p.name) LIKE ? OR LOWER(c.name) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    query += ` ORDER BY c.display_order ASC, p.price ASC`;

    const products = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

    const formattedProducts = products.map((p) => {
      let features: string[] = [];
      try {
        if (p.features_json) {
          features = JSON.parse(String(p.features_json));
        }
      } catch {
        features = [];
      }

      return {
        id: String(p.id),
        name: String(p.name),
        slug: String(p.slug),
        categoryId: String(p.category_id),
        categoryName: String(p.category_name),
        categorySlug: String(p.category_slug),
        price: Number(p.price),
        status: String(p.status),
        stock: Number(p.stock),
        deliveryInfo: p.delivery_info ? String(p.delivery_info) : null,
        features,
      };
    });

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat katalog produk' }, { status: 500 });
  }
}
