'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';
import { safeFetchJson, sanitizeErrorMessage } from '@/lib/client-api';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { refreshUser } = useUser();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await safeFetchJson<{ error?: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Gagal masuk akun.');
      }

      await refreshUser();
      router.push('/');
    } catch (err: unknown) {
      setError(sanitizeErrorMessage(err, 'Terjadi kegagalan saat proses masuk.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setIdentifier('demo_customer');
    setPassword('Customer@2026!');
    setError(null);
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Heading */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-white">
            <span className="text-xl font-black tracking-wider">AC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Aurelia Cathērine
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Masuk ke akun untuk membeli produk digital & layanan otomatis
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-sky-100 bg-white/90 p-6 shadow-xl shadow-sky-900/5 backdrop-blur-xl sm:p-8">
          {error && (
            <div className="mb-5 flex items-start space-x-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Username atau Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nama@email.com atau username"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Kata Sandi
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-sky-600/25 hover:from-sky-500 hover:to-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk Akun</span>
                </>
              )}
            </button>
          </form>

          {/* Demo account quick fill button */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleFillDemo}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-sky-200 bg-sky-50/60 py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-100/70 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              <span>Gunakan Akun Pengguna Demo (Saldo Rp 50.000)</span>
            </button>
          </div>

          {/* Register Link */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Belum memiliki akun?{' '}
            <Link href="/register" className="font-semibold text-sky-600 hover:text-sky-700 underline">
              Daftar sekarang
            </Link>
          </p>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Sesi terenkripsi & dilindungi cookie HTTP-Only</span>
        </div>
      </div>
    </div>
  );
}
