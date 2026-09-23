import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const tx = db.prepare(`
      SELECT id, transaction_number, user_id, type, title, amount, direction, status,
             reference_id, details_json, created_at, updated_at
      FROM transactions
      WHERE id = ? AND user_id = ?
    `).get(id, user.userId) as Record<string, unknown> | undefined;

    if (!tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    let details = {};
    try {
      if (tx.details_json) {
        details = JSON.parse(String(tx.details_json));
      }
    } catch {
      details = {};
    }

    return NextResponse.json({
      transaction: {
        id: String(tx.id),
        transactionNumber: String(tx.transaction_number),
        type: String(tx.type),
        title: String(tx.title),
        amount: Number(tx.amount),
        direction: String(tx.direction),
        status: String(tx.status),
        referenceId: tx.reference_id ? String(tx.reference_id) : null,
        details,
        createdAt: String(tx.created_at),
        updatedAt: String(tx.updated_at),
      },
    });
  } catch (error) {
    console.error('Transaction detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat rincian transaksi.' }, { status: 500 });
  }
}
