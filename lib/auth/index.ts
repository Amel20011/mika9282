import { cookies, headers } from 'next/headers';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export const CUSTOMER_SESSION_COOKIE = 'ac_customer_session';
export const ADMIN_SESSION_COOKIE = 'ac_admin_session';

export interface UserSessionPayload {
  userId: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: 'active' | 'suspended' | 'banned';
  balance: number;
}

export interface AdminSessionPayload {
  adminId: string;
  name: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'finance_admin' | 'product_admin' | 'customer_service';
  status: 'active' | 'suspended' | 'disabled';
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ---------------- USER AUTHENTICATION ---------------- //

export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const now = new Date().toISOString();

  const session = db.prepare(`
    SELECT s.id as session_id, s.user_id, s.expires_at, s.is_revoked,
           u.id, u.name, u.username, u.email, u.phone, u.avatar_url, u.status,
           COALESCE(b.amount, 0) as balance
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN balances b ON b.user_id = u.id
    WHERE s.token = ? AND s.is_revoked = 0 AND s.expires_at > ?
  `).get(token, now) as Record<string, unknown> | undefined;

  if (!session) return null;

  // If user is banned or suspended, reject authentication
  if (session.status === 'banned' || session.status === 'suspended') {
    return null;
  }

  return {
    userId: String(session.user_id),
    name: String(session.name),
    username: String(session.username),
    email: String(session.email),
    phone: session.phone ? String(session.phone) : null,
    avatarUrl: session.avatar_url ? String(session.avatar_url) : null,
    status: session.status as 'active' | 'suspended' | 'banned',
    balance: Number(session.balance),
  };
}

export async function createUserSession(userId: string): Promise<string> {
  const db = getDb();
  const token = generateToken();
  const sessionId = 'ses_' + crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const nowStr = now.toISOString();

  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
  const userAgent = reqHeaders.get('user-agent') || 'Unknown Device';

  db.prepare(`
    INSERT INTO sessions (id, token, user_id, ip_address, user_agent, created_at, expires_at, is_revoked)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(sessionId, token, userId, ip, userAgent, nowStr, expiresAt);

  // Update last login
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(nowStr, nowStr, userId);

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return token;
}

export async function revokeUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE token = ?').run(token);
  }
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

// ---------------- ADMIN AUTHENTICATION ---------------- //

export async function getCurrentAdmin(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const now = new Date().toISOString();

  const session = db.prepare(`
    SELECT s.id as session_id, s.admin_id, s.expires_at, s.is_revoked,
           a.id, a.name, a.username, a.email, a.role, a.status
    FROM admin_sessions s
    JOIN admins a ON s.admin_id = a.id
    WHERE s.token = ? AND s.is_revoked = 0 AND s.expires_at > ?
  `).get(token, now) as Record<string, unknown> | undefined;

  if (!session) return null;

  if (session.status !== 'active') {
    return null;
  }

  return {
    adminId: String(session.admin_id),
    name: String(session.name),
    username: String(session.username),
    email: String(session.email),
    role: session.role as AdminSessionPayload['role'],
    status: session.status as AdminSessionPayload['status'],
  };
}

export async function createAdminSession(adminId: string): Promise<string> {
  const db = getDb();
  const token = generateToken();
  const sessionId = 'admses_' + crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const nowStr = now.toISOString();

  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
  const userAgent = reqHeaders.get('user-agent') || 'Admin Terminal';

  db.prepare(`
    INSERT INTO admin_sessions (id, token, admin_id, ip_address, user_agent, created_at, expires_at, is_revoked)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(sessionId, token, adminId, ip, userAgent, nowStr, expiresAt);

  db.prepare('UPDATE admins SET last_login_at = ?, updated_at = ? WHERE id = ?').run(nowStr, nowStr, adminId);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return token;
}

export async function revokeAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    db.prepare('UPDATE admin_sessions SET is_revoked = 1 WHERE token = ?').run(token);
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

// ---------------- RBAC ROLE PERMISSIONS ---------------- //

export function hasPermission(
  adminRole: AdminSessionPayload['role'],
  module: 'users' | 'deposits' | 'balances' | 'products' | 'transactions' | 'support' | 'administrators' | 'settings' | 'audit'
): boolean {
  if (adminRole === 'super_admin') return true;

  switch (module) {
    case 'users':
      return adminRole === 'admin';
    case 'deposits':
    case 'balances':
      return adminRole === 'admin' || adminRole === 'finance_admin';
    case 'products':
      return adminRole === 'admin' || adminRole === 'product_admin';
    case 'transactions':
      return adminRole === 'admin' || adminRole === 'finance_admin';
    case 'support':
      return adminRole === 'admin' || adminRole === 'customer_service';
    case 'settings':
    case 'audit':
      return adminRole === 'admin';
    case 'administrators':
      return false; // Only super_admin
    default:
      return false;
  }
}
