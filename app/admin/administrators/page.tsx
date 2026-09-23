'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Power,
} from 'lucide-react';

interface AdminItem {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'finance_admin' | 'product_admin' | 'support_agent';
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

export default function AdminStaffPage() {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminItem['role']>('support_agent');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/administrators');
      const data = await res.json();
      if (data.administrators) setAdmins(data.administrators);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat administrator.');

      setIsModalOpen(false);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      await fetchAdmins();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (admin: AdminItem) => {
    try {
      const newStatus = admin.is_active === 1 ? 0 : 1;
      const res = await fetch('/api/admin/administrators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, isActive: newStatus }),
      });
      if (res.ok) await fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Kelola Staf & Akun Administrator
          </h1>
          <p className="text-xs text-slate-400">
            Pengaturan peran otoritas (Role-Based Access Control) dan kredensial personel
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-md shadow-sky-600/20 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Akun Staf</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Staf</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Peran Otoritas (RBAC)</th>
                <th className="py-3 px-4">Status Akses</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Memuat daftar administrator...
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{a.name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sky-400 block">@{a.username}</span>
                      <span className="text-[11px] text-slate-500">{a.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-sky-300 uppercase">
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {a.is_active === 1 ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                          Dinonaktifkan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {a.last_login_at
                        ? new Date(a.last_login_at).toLocaleString('id-ID')
                        : 'Belum pernah'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.role !== 'super_admin' && (
                        <button
                          onClick={() => handleToggle(a)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            a.is_active === 1
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={a.is_active === 1 ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Tambah Akun Administrator Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Lengkap Staf:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rian Anggara"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Username:
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="rian_staff"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email Staf:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rian@aureliacatherine.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Kata Sandi Awal:
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Peran Otoritas (Role RBAC):
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminItem['role'])}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="support_agent">Support Agent (Hanya Tiket CS & Monitoring)</option>
                  <option value="product_admin">Product Admin (Katalog & Kategori)</option>
                  <option value="finance_admin">Finance Admin (Verifikasi Deposit, Ledger & Refund)</option>
                  <option value="admin">Administrator (Akses Penuh Non-Staff)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-3.5 py-2 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {submitting ? 'Membuat...' : 'Buat Akun Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
