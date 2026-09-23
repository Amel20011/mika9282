import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'users')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses pengguna.' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const user = db.prepare(`
    SELECT u.id, u.name, u.username, u.email, u.phone, u.avatar_url, u.status,
           u.created_at, u.updated_at, u.last_login_at,
           COALESCE(b.amount, 0) as balance
    FROM users u
    LEFT JOIN balances b ON b.user_id = u.id
    WHERE u.id = ?
  `).get(id);

  if (!user) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
  }

  // Financial ledger
  const ledger = db.prepare(`
    SELECT id, amount, direction, previous_balance, new_balance, event_type, reason, created_at
    FROM balance_ledger
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(id);

  // Transactions
  const transactions = db.prepare(`
    SELECT id, transaction_number, type, title, amount, direction, status, created_at
    FROM transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(id);

  // Deposits
  const deposits = db.prepare(`
    SELECT id, deposit_number, amount, payment_method, proof_url, status, rejection_reason, created_at
    FROM deposits
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(id);

  // Orders
  const orders = db.prepare(`
    SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
           (SELECT GROUP_CONCAT(product_name, ', ') FROM order_items WHERE order_id = o.id) as items_summary
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
    LIMIT 20
  `).all(id);

  // Support tickets
  const tickets = db.prepare(`
    SELECT id, ticket_number, subject, status, created_at, updated_at
    FROM support_tickets
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT 20
  `).all(id);

  // Active sessions
  const sessions = db.prepare(`
    SELECT id, ip_address, user_agent, created_at, expires_at, is_revoked
    FROM sessions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(id);

  return NextResponse.json({
    user,
    ledger,
    transactions,
    deposits,
    orders,
    tickets,
    sessions,
  });
}
