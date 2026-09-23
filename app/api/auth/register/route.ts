import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';
import { hashPassword, createUserSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, email, password, confirmPassword, phone } = body;

    // Validate fields
    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: 'Seluruh kolom wajib diisi dengan benar.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Konfirmasi kata sandi tidak cocok.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Kata sandi minimal 8 karakter.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Regex check username
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Username hanya boleh huruf kecil, angka, garis bawah (3-24 karakter).' }, { status: 400 });
    }

    const db = getDb();

    // Check duplicate username
    const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (existingUsername) {
      return NextResponse.json({ error: 'Username ini sudah digunakan, silakan pilih username lain.' }, { status: 409 });
    }

    // Check duplicate email
    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingEmail) {
      return NextResponse.json({ error: 'Email ini telah terdaftar, silakan gunakan email lain atau masuk.' }, { status: 409 });
    }

    const userId = 'usr_' + crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE;');

    db.prepare(`
      INSERT INTO users (id, name, username, email, password_hash, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(userId, name.trim(), cleanUsername, cleanEmail, passwordHash, phone ? phone.trim() : null, now, now);

    // Initial 0 balance
    db.prepare(`
      INSERT INTO balances (user_id, amount, updated_at)
      VALUES (?, 0, ?)
    `).run(userId, now);

    // Initial welcome notification
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, 'system', 0, ?, ?)
    `).run(
      notifId,
      userId,
      'Selamat Bergabung di Aurelia Cathērine',
      'Akun Anda telah berhasil dibuat. Silakan lakukan isi saldo melalui QRIS untuk mulai berbelanja produk digital.',
      '/deposit',
      now
    );

    db.exec('COMMIT;');

    // Automatically create session
    await createUserSession(userId);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Terjadi kegagalan saat mendaftarkan akun Anda.' }, { status: 500 });
  }
}
