import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT key, value FROM website_settings
      WHERE key IN ('qris_owner_name', 'qris_merchant_id', 'qris_image_url', 'qris_instructions', 'deposits_enabled')
    `).all() as Array<{ key: string; value: string }>;

    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }

    return NextResponse.json({
      ownerName: settingsMap['qris_owner_name'] || 'PT AURELIA CATHERINE DIGITAL',
      merchantId: settingsMap['qris_merchant_id'] || 'NMID: ID1020038891024',
      imageUrl: settingsMap['qris_image_url'] || '/assets/qris-aurelia-catherine.svg',
      instructions: settingsMap['qris_instructions'] || 'Silakan transfer ke QRIS di atas dan unggah bukti pembayaran.',
      depositsEnabled: settingsMap['deposits_enabled'] !== 'false',
    });
  } catch (error) {
    console.error('QRIS info fetch error:', error);
    return NextResponse.json({ error: 'Gagal mengambil informasi pembayaran QRIS.' }, { status: 500 });
  }
}
