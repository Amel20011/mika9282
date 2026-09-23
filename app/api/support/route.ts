import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    const tickets = db.prepare(`
      SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.updated_at,
             (SELECT message FROM support_messages WHERE ticket_id = t.id AND is_internal_note = 0 ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM support_messages WHERE ticket_id = t.id AND is_internal_note = 0 ORDER BY created_at DESC LIMIT 1) as last_message_time,
             (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id AND sender_type = 'admin' AND is_internal_note = 0) as admin_reply_count
      FROM support_tickets t
      WHERE t.user_id = ?
      ORDER BY t.updated_at DESC
    `).all(user.userId);

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Support tickets fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat tiket bantuan.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu untuk menghubungi Customer Service.' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, message, attachmentUrl } = body;

    if (!subject || !subject.trim() || !message || !message.trim()) {
      return NextResponse.json({ error: 'Subjek dan pesan bantuan wajib diisi.' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const ticketId = 'tkt_' + crypto.randomUUID();
    const ticketNumber = 'CS-' + Math.floor(100000 + Math.random() * 900000);
    const msgId = 'msg_' + crypto.randomUUID();

    db.exec('BEGIN IMMEDIATE;');

    db.prepare(`
      INSERT INTO support_tickets (id, ticket_number, user_id, subject, status, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'waiting_admin', 'normal', ?, ?)
    `).run(ticketId, ticketNumber, user.userId, subject.trim(), now, now);

    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, is_internal_note, created_at)
      VALUES (?, ?, 'user', ?, ?, ?, ?, 0, ?)
    `).run(msgId, ticketId, user.userId, user.name, message.trim(), attachmentUrl || null, now);

    db.exec('COMMIT;');

    return NextResponse.json({
      success: true,
      ticketId,
      ticketNumber,
      message: 'Pesan Anda telah terkirim ke Customer Service Aurelia Cathērine.',
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    return NextResponse.json({ error: 'Gagal membuat tiket bantuan.' }, { status: 500 });
  }
}
