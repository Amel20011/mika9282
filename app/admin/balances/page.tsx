'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface UserBalanceItem {
  id: string;
  name: string;
  username: string;
  email: string;
  balance: number;
  status: string;
}

interface LedgerEventItem {
  id: string;
  user_name: string;
  user_email: string;
  amount: number;
  direction: 'in' | 'out';
  previous_balance: number;
  new_balance: number;
  event_type: string;
  reason: string;
  created_at: string;
  created_by_name: string | null;
}

export default function AdminBalancesPage() {
  const [users, setUsers] = useState<UserBalanceItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEventItem[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'ledger'>('users');

  // Adjustment Modal
  const [selectedUser, setSelectedUser] = useState<UserBalanceItem | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/balances');
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.ledger) setLedger(data.ledger);
      if (data.totalBalance !== undefined) setTotalBalance(data.totalBalance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const amt = parseInt(adjustAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      setAdjustError('Nominal harus berupa angka bulat positif lebih dari 0.');
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError('Alasan penyesuaian saldo wajib dicantumkan untuk jejak audit.');
      return;
    }

    setProcessing(true);
    setAdjustError(null);

    try {
      const res = await fetch('/api/admin/balances/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: amt,
          type: adjustType,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Penyesuaian saldo gagal.');

      setSelectedUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      await fetchData();
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Buku Kas & Penyesuaian Saldo Pengguna
          </h1>
          <p className="text-xs text-slate-400">
            Jejak mutasi keuangan tak dapat dimanipulasi (immutable ledger) & penyesuaian saldo manual berizin
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-right">
            <span className="block text-[10px] font-semibold text-emerald-400 uppercase">
              Total Saldo Pengguna Beredar
            </span>
            <span className="text-base font-black text-white">
              {formatRupiah(totalBalance)}
            </span>
          </div>

          <button
            onClick={fetchData}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'users'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          Daftar Saldo Pengguna
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'ledger'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          Riwayat Seluruh Mutasi Buku Kas (Ledger)
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pengguna berdasarkan nama atau email..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Saldo Saat Ini</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Memuat data saldo...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Tidak ada pengguna yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">{u.name}</span>
                          <span className="text-[11px] text-sky-400 font-mono">
                            @{u.username}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-300">
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                          {formatRupiah(u.balance)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setAdjustType('credit');
                              setAdjustAmount('');
                              setAdjustReason('');
                              setAdjustError(null);
                            }}
                            className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs"
                          >
                            Sesuaikan Saldo
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Tipe Mutasi</th>
                  <th className="py-3 px-4">Alasan & Catatan</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Saldo Sebelum → Sesudah</th>
                  <th className="py-3 px-4">Eksekutor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {ledger.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {l.user_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] rounded bg-slate-800 px-1.5 py-0.5 uppercase text-slate-300">
                        {l.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {l.reason}
                    </td>
                    <td className="py-3 px-4 font-extrabold whitespace-nowrap">
                      <span
                        className={
                          l.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {l.direction === 'in' ? '+' : '-'}
                        {formatRupiah(l.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatRupiah(l.previous_balance)} →{' '}
                      <span className="font-bold text-white">
                        {formatRupiah(l.new_balance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {l.created_by_name || 'System / Auto'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Balance Adjustment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs text-sky-400 uppercase">
                  Penyesuaian Saldo Pengguna
                </span>
                <h3 className="text-base font-bold text-white">
                  {selectedUser.name} (@{selectedUser.username})
                </h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {adjustError && (
              <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Saldo Pengguna Saat Ini:</span>
              <span className="text-base font-black text-emerald-400">
                {formatRupiah(selectedUser.balance)}
              </span>
            </div>

            <form onSubmit={handleAdjust} noValidate className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Jenis Penyesuaian Saldo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`rounded-xl py-2 px-3 font-bold flex items-center justify-center space-x-1.5 transition-colors ${
                      adjustType === 'credit'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Saldo (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`rounded-xl py-2 px-3 font-bold flex items-center justify-center space-x-1.5 transition-colors ${
                      adjustType === 'debit'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    <span>Kurang Saldo (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nominal Penyesuaian (Rp):
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm font-semibold text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alasan Penyesuaian (Wajib untuk Audit):
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Koreksi deposit manual bank offline, bonus cashback, atau kompensasi tiket..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-xl border border-slate-700 px-3.5 py-2 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {processing ? 'Memproses Ledger...' : 'Konfirmasi Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
