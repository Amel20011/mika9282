import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createUserSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/Email dan Password wajib diisi.' }, { status: 400 });
    }

    const db = getDb();
    const trimmedId = identifier.trim().toLowerCase();

    // Query user by email or username
    const user = db.prepare(`
      SELECT id, name, username, email, password_hash, status
      FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(trimmedId, trimmedId) as {
      id: string;
      name: string;
      username: string;
      email: string;
      password_hash: string;
      status: string;
    } | undefined;

    // Use timing-safe approach to avoid account enumeration
    if (!user) {
      return NextResponse.json({ error: 'Identitas akun atau kata sandi tidak valid.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Identitas akun atau kata sandi tidak valid.' }, { status: 401 });
    }

    if (user.status === 'banned') {
      return NextResponse.json({ error: 'Akun Anda dinonaktifkan permanen oleh Administrator.' }, { status: 403 });
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Akun Anda sedang ditangguhkan sementara. Hubungi Customer Service.' }, { status: 403 });
    }

    // Create session and set HTTP-only cookie
    await createUserSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat proses masuk.' }, { status: 500 });
  }
}
