import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'support')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses customer service.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const search = searchParams.get('q');

  const db = getDb();
  let query = `
    SELECT t.id, t.ticket_number, t.user_id, t.subject, t.status, t.priority,
           t.created_at, t.updated_at,
           u.name as user_name, u.email as user_email, u.username as user_username,
           (SELECT message FROM support_messages WHERE ticket_id = t.id AND is_internal_note = 0 ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM support_messages WHERE ticket_id = t.id AND is_internal_note = 0 ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (statusFilter && statusFilter !== 'all') {
    query += ` AND t.status = ?`;
    params.push(statusFilter);
  }

  if (search && search.trim().length > 0) {
    query += ` AND (LOWER(t.ticket_number) LIKE ? OR LOWER(t.subject) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY CASE WHEN t.status IN ('waiting_admin', 'open') THEN 1 WHEN t.status = 'in_progress' THEN 2 ELSE 3 END, t.updated_at DESC LIMIT 100`;

  const tickets = db.prepare(query).all(...params);

  return NextResponse.json({ tickets });
}
