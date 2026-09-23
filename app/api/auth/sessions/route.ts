import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser, CUSTOMER_SESSION_COOKIE } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  const db = getDb();
  const now = new Date().toISOString();

  const sessions = db.prepare(`
    SELECT id, token, ip_address, user_agent, created_at, expires_at
    FROM sessions
    WHERE user_id = ? AND is_revoked = 0 AND expires_at > ?
    ORDER BY created_at DESC
  `).all(user.userId, now) as Array<{
    id: string;
    token: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    expires_at: string;
  }>;

  const sanitizedSessions = sessions.map((s) => ({
    id: s.id,
    ipAddress: s.ip_address || '127.0.0.1',
    userAgent: s.user_agent || 'Unknown Device',
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    isCurrent: s.token === currentToken,
  }));

  return NextResponse.json({ sessions: sanitizedSessions });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  const body = await req.json();
  const { action, sessionId } = body;
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  const db = getDb();

  if (action === 'revoke_other') {
    // Revoke all other sessions except current
    db.prepare(`
      UPDATE sessions
      SET is_revoked = 1
      WHERE user_id = ? AND token != ?
    `).run(user.userId, currentToken || '');

    return NextResponse.json({ success: true, message: 'Semua sesi lain berhasil dihentikan.' });
  }

  if (action === 'revoke_specific' && sessionId) {
    db.prepare(`
      UPDATE sessions
      SET is_revoked = 1
      WHERE id = ? AND user_id = ?
    `).run(sessionId, user.userId);

    return NextResponse.json({ success: true, message: 'Sesi berhasil dihentikan.' });
  }

  return NextResponse.json({ error: 'Aksi sesi tidak valid.' }, { status: 400 });
}
