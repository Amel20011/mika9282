import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const db = getDb();

    const product = db.prepare(`
      SELECT p.id, p.name, p.slug, p.category_id, p.price, p.status, p.stock,
             p.delivery_info, p.features_json, p.created_at,
             c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ?
    `).get(slug) as Record<string, unknown> | undefined;

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    let features: string[] = [];
    try {
      if (product.features_json) {
        features = JSON.parse(String(product.features_json));
      }
    } catch {
      features = [];
    }

    return NextResponse.json({
      product: {
        id: String(product.id),
        name: String(product.name),
        slug: String(product.slug),
        categoryId: String(product.category_id),
        categoryName: String(product.category_name),
        categorySlug: String(product.category_slug),
        price: Number(product.price),
        status: String(product.status),
        stock: Number(product.stock),
        deliveryInfo: product.delivery_info ? String(product.delivery_info) : null,
        features,
      },
    });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat detail produk' }, { status: 500 });
  }
}
