import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatRupiah } from '@/lib/financial';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'transactions')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses transaksi.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type');
  const statusFilter = searchParams.get('status');
  const search = searchParams.get('q');

  const db = getDb();
  let query = `
    SELECT t.id, t.transaction_number, t.user_id, t.type, t.title, t.amount,
           t.direction, t.status, t.reference_id, t.details_json, t.created_at, t.updated_at,
           u.name as user_name, u.email as user_email, u.username as user_username
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (typeFilter && typeFilter !== 'all') {
    query += ` AND t.type = ?`;
    params.push(typeFilter);
  }

  if (statusFilter && statusFilter !== 'all') {
    query += ` AND t.status = ?`;
    params.push(statusFilter);
  }

  if (search && search.trim().length > 0) {
    query += ` AND (LOWER(t.transaction_number) LIKE ? OR LOWER(t.title) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY t.created_at DESC LIMIT 100`;

  const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

  const transactions = rows.map((r) => {
    let details = {};
    try {
      if (r.details_json) details = JSON.parse(String(r.details_json));
    } catch {
      details = {};
    }
    return {
      ...r,
      details,
    };
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'transactions')) {
    return NextResponse.json({ error: 'Tidak memiliki izin memproses pengembalian dana (refund).' }, { status: 403 });
  }

  const body = await req.json();
  const { action, transactionId, reason } = body;

  if (action === 'refund') {
    if (!transactionId || !reason || !reason.trim()) {
      return NextResponse.json({ error: 'ID Transaksi dan alasan refund wajib diisi.' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    try {
      db.exec('BEGIN IMMEDIATE;');

      const tx = db.prepare('SELECT id, transaction_number, user_id, type, amount, status FROM transactions WHERE id = ?').get(transactionId) as {
        id: string;
        transaction_number: string;
        user_id: string;
        type: string;
        amount: number;
        status: string;
      } | undefined;

      if (!tx) {
        db.exec('ROLLBACK;');
        return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
      }

      if (tx.status === 'refunded') {
        db.exec('ROLLBACK;');
        return NextResponse.json({ error: 'Transaksi ini telah direfund sebelumnya.' }, { status: 400 });
      }

      if (tx.type !== 'purchase' || tx.status !== 'completed') {
        db.exec('ROLLBACK;');
        return NextResponse.json({ error: 'Hanya transaksi pembelian berstatus completed yang dapat direfund.' }, { status: 400 });
      }

      const refundAmount = Number(tx.amount);

      // Current balance
      const balanceRow = db.prepare('SELECT amount FROM balances WHERE user_id = ?').get(tx.user_id) as { amount: number } | undefined;
      const prevBal = balanceRow ? Number(balanceRow.amount) : 0;
      const newBal = prevBal + refundAmount;

      // Update user balance
      db.prepare('UPDATE balances SET amount = ?, updated_at = ? WHERE user_id = ?').run(newBal, now, tx.user_id);

      // Ledger entry
      const ledgerId = 'ledg_' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO balance_ledger (id, user_id, amount, direction, previous_balance, new_balance, event_type, reason, related_entity_id, admin_id, created_at)
        VALUES (?, ?, ?, 'in', ?, ?, 'refund', ?, ?, ?, ?)
      `).run(ledgerId, tx.user_id, refundAmount, prevBal, newBal, `Refund Transaksi ${tx.transaction_number}: ${reason.trim()}`, tx.id, admin.adminId, now);

      // Update transaction status
      db.prepare('UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?').run('refunded', now, tx.id);

      // Notification
      const notifId = 'notif_' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
        VALUES (?, ?, 'Pengembalian Dana (Refund)', ?, 'refund', 0, '/transactions', ?)
      `).run(
        notifId,
        tx.user_id,
        `Dana pembelian ${tx.transaction_number} senilai ${formatRupiah(refundAmount)} telah dikembalikan ke saldo Anda. Alasan: ${reason.trim()}`,
        now
      );

      // Audit log
      const auditId = 'aud_' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
        VALUES (?, ?, ?, ?, 'PROCESS_REFUND', 'transactions', ?, ?, '127.0.0.1', ?)
      `).run(
        auditId,
        admin.adminId,
        admin.name,
        admin.role,
        tx.id,
        `Refund transaksi ${tx.transaction_number} senilai ${formatRupiah(refundAmount)} untuk user ${tx.user_id}. Alasan: ${reason.trim()}`,
        now
      );

      db.exec('COMMIT;');

      return NextResponse.json({ success: true, message: `Refund berhasil diproses senilai ${formatRupiah(refundAmount)}.` });
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('Refund error:', err);
      return NextResponse.json({ error: 'Terjadi kesalahan sistem saat memproses refund.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Aksi transaksi tidak valid.' }, { status: 400 });
}
