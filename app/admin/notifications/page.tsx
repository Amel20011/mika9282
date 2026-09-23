'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  RefreshCw,
} from 'lucide-react';

interface SentNotification {
  id: string;
  user_id: string | null;
  user_name: string | null;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<SentNotification[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [targetType, setTargetType] = useState<'broadcast' | 'specific'>('broadcast');
  const [targetUserId, setTargetUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [linkUrl, setLinkUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [notifRes, usersRes] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/admin/users'),
      ]);
      const notifData = await notifRes.json();
      const usersData = await usersRes.json();

      if (notifData.notifications) setNotifications(notifData.notifications);
      if (usersData.users) {
        setUsers(
          usersData.users.map((u: { id: string; name: string; email: string }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }))
        );
        if (usersData.users.length > 0 && !targetUserId) {
          setTargetUserId(usersData.users[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFormSuccess(null);
    setFormError(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetUserId: targetType === 'specific' ? targetUserId : null,
          title: title.trim(),
          message: message.trim(),
          type,
          linkUrl: linkUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim notifikasi.');

      setFormSuccess(
        targetType === 'broadcast'
          ? `Notifikasi siaran massal berhasil dikirimkan ke seluruh pengguna!`
          : `Notifikasi berhasil dikirimkan ke pengguna target.`
      );
      setTitle('');
      setMessage('');
      setLinkUrl('');
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pusat Pengiriman Siaran & Notifikasi
          </h1>
          <p className="text-xs text-slate-400">
            Kirimkan pengumuman massal ke seluruh pengguna atau pesan khusus ke akun tertentu
          </p>
        </div>

        <button
          onClick={fetchData}
          className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Send Notification Form (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Send className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white">Buat Notifikasi Baru</h2>
          </div>

          {formSuccess && (
            <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{formSuccess}</span>
            </div>
          )}

          {formError && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Target Penerima:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('broadcast')}
                  className={`rounded-xl py-2 px-3 font-bold transition-colors ${
                    targetType === 'broadcast'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Pengguna (Broadcast)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('specific')}
                  className={`rounded-xl py-2 px-3 font-bold transition-colors ${
                    targetType === 'specific'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Pengguna Spesifik
                </button>
              </div>
            </div>

            {targetType === 'specific' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pilih Pengguna:
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-sky-500 focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Kategori Notifikasi:
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="system">Sistem / Pengumuman Umum</option>
                <option value="deposit">Deposit & Saldo</option>
                <option value="purchase">Produk & Pembelian</option>
                <option value="security">Keamanan & Akun</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Judul Notifikasi:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pemeliharaan Server Terjadwal"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Isi Pesan:
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan pesan lengkap pemberitahuan..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tautan Aksi / Link URL (Opsional):
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/deposit atau /transactions"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-md shadow-sky-600/20"
            >
              {sending ? 'Mengirimkan...' : 'Kirim Notifikasi Sekarang'}
            </button>
          </form>
        </div>

        {/* History Table (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white">Riwayat Notifikasi Terkirim</h2>
          </div>

          <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 text-xs">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-slate-500">
                Belum ada notifikasi yang dikirimkan.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{n.title}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase font-mono text-slate-400">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{n.message}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 mt-2">
                    <span>
                      Target: {n.user_name ? `${n.user_name}` : 'Semua Pengguna (Broadcast)'}
                    </span>
                    <span>{new Date(n.created_at).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
