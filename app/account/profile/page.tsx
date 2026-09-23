'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';
import { safeFetchJson } from '@/lib/client-api';

export default function CustomerProfilePage() {
  const { user, refreshUser } = useUser();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await safeFetchJson<{ url: string; error?: string }>('/api/upload', { method: 'POST', body: formData });
      if (!res.ok || !res.data?.url) throw new Error(res.error || 'Gagal mengunggah foto.');

      setAvatarUrl(res.data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah avatar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await safeFetchJson('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          avatarUrl,
        }),
      });

      if (!res.ok) throw new Error(res.error || 'Gagal menyimpan profil.');

      setMessage('Profil Anda berhasil diperbarui.');
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 sm:px-6 sm:pt-6 space-y-5">
      <div className="flex items-center space-x-3 border-b border-sky-100 pb-3">
        <Link
          href="/account"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900">
            Edit Profil Pengguna
          </h1>
          <p className="text-xs text-slate-500">
            Informasi identitas pribadi dan kontak akun Anda
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs space-y-5">
        {message && (
          <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-3 pb-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-24 w-24 rounded-2xl object-cover ring-2 ring-sky-300 shadow-sm"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 text-3xl font-black">
              {name.charAt(0) || 'U'}
            </div>
          )}

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? 'Mengunggah...' : 'Ganti Foto Avatar'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase text-slate-700 mb-1">
              Username (Tetap)
            </label>
            <input
              type="text"
              disabled
              value={user?.username || ''}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-700 mb-1">
              Alamat Email (Tetap)
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-500"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-700 mb-1">
              Nomor WhatsApp / HP
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-sky-600 py-3 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-xs"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
          </button>
        </form>
      </div>
    </div>
  );
}
