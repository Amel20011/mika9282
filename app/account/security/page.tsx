'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  LogOut,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/client-api';

interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function CustomerSecurityPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ sessions: SessionItem[] }>('/api/auth/sessions');
      if (res.ok && res.data?.sessions) setSessions(res.data.sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (newPassword.length < 8) {
      setPassError('Kata sandi baru minimal 8 karakter.');
      return;
    }

    setUpdatingPass(true);

    try {
      const res = await safeFetchJson('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (!res.ok) throw new Error(res.error || 'Gagal mengubah kata sandi.');

      setPassSuccess('Kata sandi berhasil diperbarui.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : 'Gagal memperbarui kata sandi.');
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await fetch('/api/auth/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_specific', sessionId }),
      });
      await fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      await fetch('/api/auth/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_other' }),
      });
      await fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-6">
      <div className="flex items-center space-x-3 border-b border-sky-100 pb-3">
        <Link
          href="/account"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900">
            Keamanan Akun & Sesi Perangkat
          </h1>
          <p className="text-xs text-slate-500">
            Perlindungan sandi akun dan manajemen perangkat masuk aktif
          </p>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Lock className="h-4 w-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900">Ubah Kata Sandi</h2>
        </div>

        {passSuccess && (
          <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} noValidate className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold uppercase text-slate-700 mb-1">
              Kata Sandi Saat Ini
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-700 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-700 mb-1">
                Ulangi Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPass}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-xs"
          >
            {updatingPass ? 'Memperbarui...' : 'Simpan Kata Sandi Baru'}
          </button>
        </form>
      </div>

      {/* Active Sessions Card */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Perangkat & Sesi Masuk Aktif</h2>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOtherSessions}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Keluarkan Perangkat Lain
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 bg-slate-50/50"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">
                    {s.isCurrent ? 'Perangkat Saat Ini' : 'Perangkat Terdaftar'}
                  </span>
                  {s.isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-800">
                      Aktif Sekarang
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-mono">IP: {s.ipAddress}</p>
                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{s.userAgent}</p>
                <span className="text-[10px] text-slate-400 block">
                  Masuk: {new Date(s.createdAt).toLocaleString('id-ID')}
                </span>
              </div>

              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(s.id)}
                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                  title="Hentikan sesi perangkat ini"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
