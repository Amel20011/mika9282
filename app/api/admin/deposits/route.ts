import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { approveDeposit, rejectDeposit } from '@/lib/financial';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'deposits')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses deposit.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const search = searchParams.get('q');

  const db = getDb();
  let query = `
    SELECT d.id, d.deposit_number, d.user_id, d.amount, d.payment_method,
           d.proof_url, d.proof_filename, d.status, d.rejection_reason,
           d.reviewed_by_admin_id, d.reviewed_at, d.created_at, d.updated_at,
           u.name as user_name, u.email as user_email, u.username as user_username,
           COALESCE(b.amount, 0) as user_current_balance
    FROM deposits d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN balances b ON b.user_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (statusFilter && statusFilter !== 'all') {
    query += ` AND d.status = ?`;
    params.push(statusFilter);
  }

  if (search && search.trim().length > 0) {
    query += ` AND (LOWER(d.deposit_number) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY CASE WHEN d.status = 'pending' THEN 1 WHEN d.status = 'under_review' THEN 2 ELSE 3 END, d.created_at DESC LIMIT 100`;

  const deposits = db.prepare(query).all(...params);

  return NextResponse.json({ deposits });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'deposits')) {
    return NextResponse.json({ error: 'Tidak memiliki izin memproses deposit.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, depositId, reason } = body;

  if (!depositId) {
    return NextResponse.json({ error: 'ID Deposit wajib disertakan.' }, { status: 400 });
  }

  try {
    if (action === 'approve') {
      const result = approveDeposit(depositId, admin.adminId, admin.name, admin.role);
      return NextResponse.json({
        success: true,
        message: 'Deposit berhasil disetujui dan saldo pengguna telah ditambahkan secara atomik.',
        newBalance: result.newBalance,
      });
    }

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'Alasan penolakan deposit wajib diisi.' }, { status: 400 });
      }

      await rejectDeposit(depositId, admin.adminId, admin.name, admin.role, reason.trim());
      return NextResponse.json({
        success: true,
        message: 'Deposit telah ditolak dengan alasan yang tercatat.',
      });
    }

    return NextResponse.json({ error: 'Aksi deposit tidak valid.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Process deposit error:', error);
    const msg = error instanceof Error ? error.message : 'Terjadi kegagalan sistem saat memproses deposit.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
