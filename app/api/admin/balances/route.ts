import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { manualBalanceAdjust } from '@/lib/financial';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'balances')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses saldo keuangan.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q');

  const db = getDb();

  // Users balance list
  let userQuery = `
    SELECT u.id, u.name, u.username, u.email, u.status,
           COALESCE(b.amount, 0) as balance, b.updated_at as balance_updated_at
    FROM users u
    LEFT JOIN balances b ON b.user_id = u.id
    WHERE 1=1
  `;
  const userParams: unknown[] = [];
  if (search && search.trim().length > 0) {
    userQuery += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    userParams.push(term, term, term);
  }
  userQuery += ` ORDER BY b.amount DESC LIMIT 50`;

  const userBalances = db.prepare(userQuery).all(...userParams);

  // Full ledger log
  const ledgerEntries = db.prepare(`
    SELECT l.id, l.user_id, l.amount, l.direction, l.previous_balance, l.new_balance,
           l.event_type, l.reason, l.related_entity_id, l.admin_id, l.created_at,
           u.name as user_name, u.username as user_username
    FROM balance_ledger l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 100
  `).all();

  return NextResponse.json({
    userBalances,
    ledgerEntries,
  });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'balances')) {
    return NextResponse.json({ error: 'Tidak memiliki izin mengubah saldo keuangan.' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, amount, direction, reason } = body;

  if (!userId || !amount || !direction || !reason) {
    return NextResponse.json({ error: 'Seluruh data penyesuaian saldo wajib diisi.' }, { status: 400 });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Nominal saldo harus bernilai angka positif lebih dari 0.' }, { status: 400 });
  }

  if (direction !== 'in' && direction !== 'out') {
    return NextResponse.json({ error: 'Arah mutasi saldo harus penambahan (in) atau pengurangan (out).' }, { status: 400 });
  }

  try {
    const result = manualBalanceAdjust(
      userId,
      parsedAmount,
      direction,
      reason.trim(),
      admin.adminId,
      admin.name,
      admin.role
    );

    return NextResponse.json({
      success: true,
      message: `Penyesuaian saldo berhasil dicatat. Saldo baru pengguna: Rp ${result.newBalance.toLocaleString('id-ID')}`,
      newBalance: result.newBalance,
    });
  } catch (error: unknown) {
    console.error('Balance adjustment error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal menyesuaikan saldo.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
