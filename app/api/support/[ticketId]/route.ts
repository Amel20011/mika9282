import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { ticketId } = await params;
    const db = getDb();

    const ticket = db.prepare(`
      SELECT id, ticket_number, subject, status, priority, created_at, updated_at
      FROM support_tickets
      WHERE id = ? AND user_id = ?
    `).get(ticketId, user.userId) as Record<string, unknown> | undefined;

    if (!ticket) {
      return NextResponse.json({ error: 'Tiket bantuan tidak ditemukan.' }, { status: 404 });
    }

    // Customer only sees non-internal notes!
    const messages = db.prepare(`
      SELECT id, sender_type, sender_name, message, attachment_url, created_at
      FROM support_messages
      WHERE ticket_id = ? AND is_internal_note = 0
      ORDER BY created_at ASC
    `).all(ticketId);

    return NextResponse.json({ ticket, messages });
  } catch (error) {
    console.error('Ticket messages fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat pesan tiket bantuan.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { ticketId } = await params;
    const body = await req.json();
    const { message, attachmentUrl } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const db = getDb();

    // Verify ownership
    const ticket = db.prepare('SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?').get(ticketId, user.userId) as {
      id: string;
      status: string;
    } | undefined;

    if (!ticket) {
      return NextResponse.json({ error: 'Tiket bantuan tidak ditemukan.' }, { status: 404 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Tiket ini telah ditutup oleh Administrator.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const msgId = 'msg_' + crypto.randomUUID();

    db.exec('BEGIN IMMEDIATE;');

    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, is_internal_note, created_at)
      VALUES (?, ?, 'user', ?, ?, ?, ?, 0, ?)
    `).run(msgId, ticketId, user.userId, user.name, message.trim(), attachmentUrl || null, now);

    db.prepare(`
      UPDATE support_tickets
      SET status = 'waiting_admin', updated_at = ?
      WHERE id = ?
    `).run(now, ticketId);

    db.exec('COMMIT;');

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        sender_type: 'user',
        sender_name: user.name,
        message: message.trim(),
        attachment_url: attachmentUrl || null,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('Send ticket message error:', error);
    return NextResponse.json({ error: 'Gagal mengirimkan pesan.' }, { status: 500 });
  }
}
