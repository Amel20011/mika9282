import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Tidak memiliki hak akses administrator.' }, { status: 401 });
  }

  const db = getDb();
  const todayDate = new Date().toISOString().split('T')[0];

  // User stats
  const totalUsersRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const activeUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get() as { count: number };
  const restrictedUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status IN ('suspended', 'banned')").get() as { count: number };

  // Deposit stats
  const pendingDepositsRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM deposits WHERE status IN ('pending', 'under_review')").get() as { count: number; total: number };
  const todayDepositsRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'approved' AND created_at LIKE ?").get(`${todayDate}%`) as { count: number; total: number };

  // Transaction stats
  const totalCompletedTxRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'completed' AND type = 'purchase'").get() as { count: number; total: number };

  // Total balance held
  const totalBalanceRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM balances').get() as { total: number };

  // Open support tickets
  const openTicketsRow = db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'waiting_admin', 'in_progress')").get() as { count: number };

  // Pending Actions
  const pendingDepositsList = db.prepare(`
    SELECT d.id, d.deposit_number, d.amount, d.created_at, d.proof_url, u.name as user_name, u.email as user_email
    FROM deposits d
    JOIN users u ON d.user_id = u.id
    WHERE d.status IN ('pending', 'under_review')
    ORDER BY d.created_at ASC
    LIMIT 5
  `).all();

  const pendingTicketsList = db.prepare(`
    SELECT t.id, t.ticket_number, t.subject, t.status, t.created_at, u.name as user_name
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    WHERE t.status IN ('waiting_admin', 'open')
    ORDER BY t.created_at ASC
    LIMIT 5
  `).all();

  // Recent audit logs
  const recentActivity = db.prepare(`
    SELECT id, admin_name, admin_role, action, resource_type, description, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return NextResponse.json({
    metrics: {
      totalUsers: Number(totalUsersRow?.count || 0),
      activeUsers: Number(activeUsersRow?.count || 0),
      restrictedUsers: Number(restrictedUsersRow?.count || 0),
      pendingDepositsCount: Number(pendingDepositsRow?.count || 0),
      pendingDepositsTotal: Number(pendingDepositsRow?.total || 0),
      todayDepositsCount: Number(todayDepositsRow?.count || 0),
      todayDepositsTotal: Number(todayDepositsRow?.total || 0),
      completedPurchasesCount: Number(totalCompletedTxRow?.count || 0),
      completedPurchasesTotal: Number(totalCompletedTxRow?.total || 0),
      totalBalanceHeld: Number(totalBalanceRow?.total || 0),
      openTicketsCount: Number(openTicketsRow?.count || 0),
    },
    pendingActions: {
      deposits: pendingDepositsList,
      tickets: pendingTicketsList,
    },
    recentActivity,
  });
}
