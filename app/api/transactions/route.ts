import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');

    const db = getDb();

    let query = `
      SELECT id, transaction_number, type, title, amount, direction, status,
             reference_id, details_json, created_at, updated_at
      FROM transactions
      WHERE user_id = ?
    `;
    const params: unknown[] = [user.userId];

    if (typeFilter && typeFilter !== 'all') {
      query += ` AND type = ?`;
      params.push(typeFilter);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const rawRows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

    const transactions = rawRows.map((tx) => {
      let details = {};
      try {
        if (tx.details_json) {
          details = JSON.parse(String(tx.details_json));
        }
      } catch {
        details = {};
      }

      return {
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
      };
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat transaksi.' }, { status: 500 });
  }
}
