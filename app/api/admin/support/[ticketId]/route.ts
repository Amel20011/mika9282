import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'support')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses customer service.' }, { status: 403 });
  }

  const { ticketId } = await params;
  const db = getDb();

  const ticket = db.prepare(`
    SELECT t.id, t.ticket_number, t.user_id, t.subject, t.status, t.priority, t.created_at, t.updated_at,
           u.name as user_name, u.email as user_email, u.username as user_username, u.phone as user_phone,
           u.status as user_status, COALESCE(b.amount, 0) as user_balance
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN balances b ON b.user_id = u.id
    WHERE t.id = ?
  `).get(ticketId) as Record<string, unknown> | undefined;

  if (!ticket) {
    return NextResponse.json({ error: 'Tiket bantuan tidak ditemukan.' }, { status: 404 });
  }

  // All messages including internal notes for staff
  const messages = db.prepare(`
    SELECT id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, is_internal_note, created_at
    FROM support_messages
    WHERE ticket_id = ?
    ORDER BY created_at ASC
  `).all(ticketId);

  // Customer recent 5 transactions for support context
  const recentTransactions = db.prepare(`
    SELECT id, transaction_number, type, title, amount, status, created_at
    FROM transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(ticket.user_id);

  return NextResponse.json({
    ticket,
    messages,
    customerSummary: {
      userId: ticket.user_id,
      name: ticket.user_name,
      email: ticket.user_email,
      username: ticket.user_username,
      phone: ticket.user_phone,
      status: ticket.user_status,
      balance: ticket.user_balance,
      recentTransactions,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'support')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses customer service.' }, { status: 403 });
  }

  const { ticketId } = await params;
  const body = await req.json();
  const { action, message, attachmentUrl, newStatus } = body;

  const db = getDb();
  const now = new Date().toISOString();

  const ticket = db.prepare('SELECT id, ticket_number, user_id, status FROM support_tickets WHERE id = ?').get(ticketId) as {
    id: string;
    ticket_number: string;
    user_id: string;
    status: string;
  } | undefined;

  if (!ticket) {
    return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });
  }

  if (action === 'reply') {
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Pesan balasan wajib diisi.' }, { status: 400 });
    }

    const msgId = 'msg_' + crypto.randomUUID();

    db.exec('BEGIN IMMEDIATE;');

    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, is_internal_note, created_at)
      VALUES (?, ?, 'admin', ?, ?, ?, ?, 0, ?)
    `).run(msgId, ticketId, admin.adminId, `${admin.name} (Support)`, message.trim(), attachmentUrl || null, now);

    db.prepare(`
      UPDATE support_tickets
      SET status = 'waiting_user', updated_at = ?
      WHERE id = ?
    `).run(now, ticketId);

    // Notify user
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, 'Balasan Customer Service', ?, 'support', 0, ?, ?)
    `).run(
      notifId,
      ticket.user_id,
      `Customer Service telah membalas tiket ${ticket.ticket_number}: "${message.trim().substring(0, 75)}..."`,
      `/support/${ticket.id}`,
      now
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'SUPPORT_REPLY', 'support_tickets', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, ticketId, `Membalas tiket support ${ticket.ticket_number}`, now);

    db.exec('COMMIT;');

    return NextResponse.json({ success: true, message: 'Balasan terkirim.' });
  }

  if (action === 'internal_note') {
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Catatan internal wajib diisi.' }, { status: 400 });
    }

    const msgId = 'msg_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, is_internal_note, created_at)
      VALUES (?, ?, 'admin', ?, ?, ?, NULL, 1, ?)
    `).run(msgId, ticketId, admin.adminId, `${admin.name} (Internal Note)`, message.trim(), now);

    return NextResponse.json({ success: true, message: 'Catatan internal berhasil disimpan (hanya terlihat oleh staff).' });
  }

  if (action === 'update_status' && newStatus) {
    db.prepare(`
      UPDATE support_tickets
      SET status = ?, updated_at = ?, closed_at = ?
      WHERE id = ?
    `).run(newStatus, now, newStatus === 'closed' ? now : null, ticketId);

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'SUPPORT_STATUS_CHANGE', 'support_tickets', ?, ?, '127.0.0.1', ?)
    `).run('aud_' + crypto.randomUUID(), admin.adminId, admin.name, admin.role, ticketId, `Mengubah status tiket ${ticket.ticket_number} menjadi ${newStatus}`, now);

    return NextResponse.json({ success: true, newStatus });
  }

  return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
}
