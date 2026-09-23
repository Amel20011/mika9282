'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, AlertCircle, LogIn, Sparkles, ExternalLink } from 'lucide-react';
import { safeFetchJson, sanitizeErrorMessage } from '@/lib/client-api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Autentikasi administrator gagal.');
      }

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(sanitizeErrorMessage(err, 'Terjadi kegagalan saat proses masuk admin.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFillRole = (role: 'super' | 'finance' | 'support') => {
    if (role === 'super') {
      setIdentifier('superadmin');
      setPassword('Admin@Cathērine2026!');
    } else if (role === 'finance') {
      setIdentifier('finance_staff');
      setPassword('Admin@Cathērine2026!');
    } else {
      setIdentifier('support_staff');
      setPassword('Admin@Cathērine2026!');
    }
    setError(null);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-sky-500/20 ring-4 ring-slate-800">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Aurelia Cathērine
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-sky-400">
            Control Center & Admin Portal
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Akses terbatas untuk personel terotorisasi
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 flex items-start space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username / Email Administrator
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="superadmin atau email admin"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi Otoritas
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span>Memverifikasi Akses...</span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke Control Center</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for Reviewers */}
          <div className="mt-6 border-t border-slate-700/60 pt-4 space-y-2">
            <span className="block text-[11px] font-semibold text-slate-400">
              Uji Coba Cepat (Pilih Peran):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleFillRole('super')}
                className="rounded-lg border border-slate-700 bg-slate-900/80 py-1.5 px-1 text-[11px] font-semibold text-sky-300 hover:bg-slate-700 transition-colors"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillRole('finance')}
                className="rounded-lg border border-slate-700 bg-slate-900/80 py-1.5 px-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-700 transition-colors"
              >
                Finance
              </button>
              <button
                type="button"
                onClick={() => handleFillRole('support')}
                className="rounded-lg border border-slate-700 bg-slate-900/80 py-1.5 px-1 text-[11px] font-semibold text-blue-300 hover:bg-slate-700 transition-colors"
              >
                Support CS
              </button>
            </div>
          </div>
        </div>

        {/* Link back to customer portal */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span>Kembali ke Website Pelanggan Aurelia Cathērine</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
