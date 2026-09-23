'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ban,
  UserCheck,
  LogOut,
  Eye,
  X,
  CreditCard,
  ShoppingBag,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface UserListItem {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
  last_login_at: string | null;
  balance: number;
  total_orders: number;
  total_approved_deposits: number;
}

interface UserDetailData {
  user: UserListItem;
  ledger: Array<{
    id: string;
    amount: number;
    direction: string;
    previous_balance: number;
    new_balance: number;
    event_type: string;
    reason: string;
    created_at: string;
  }>;
  transactions: Array<{
    id: string;
    transaction_number: string;
    type: string;
    title: string;
    amount: number;
    direction: string;
    status: string;
    created_at: string;
  }>;
  deposits: Array<{
    id: string;
    deposit_number: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
  orders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    items_summary: string;
    created_at: string;
  }>;
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    created_at: string;
  }>;
  sessions: Array<{
    id: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    is_revoked: number;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected User Detail
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<UserDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'ledger' | 'transactions' | 'deposits' | 'sessions'>('overview');

  // Moderation Action Modal
  const [actionUser, setActionUser] = useState<UserListItem | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'suspend' | 'restore' | 'force_logout' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search.trim()) params.append('q', search.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const loadUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    setDetailTab('overview');
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setDetailData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionUser || !actionType) return;
    setProcessing(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userId: actionUser.id,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aksi gagal dieksekusi.');

      setActionUser(null);
      setActionType(null);
      setActionReason('');
      await fetchUsers();
      if (selectedUserId === actionUser.id) {
        await loadUserDetail(actionUser.id);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Manajemen Pengguna Terdaftar
          </h1>
          <p className="text-xs text-slate-400">
            Pencarian akun, riwayat audit keuangan, perubahan status pembekuan akun & sesi
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, username (@...), atau email pengguna..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex space-x-2">
          {['all', 'active', 'suspended', 'banned'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === st
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Saldo Aktif</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ditemukan data pengguna yang cocok.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-white block">{u.name}</span>
                        <span className="text-[11px] text-sky-400 font-mono">@{u.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{u.email}</div>
                      <div className="text-[11px] text-slate-500">{u.phone || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {formatRupiah(u.balance)}
                    </td>
                    <td className="py-3 px-4">
                      {u.status === 'active' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      )}
                      {u.status === 'suspended' && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                          Ditangguhkan
                        </span>
                      )}
                      {u.status === 'banned' && (
                        <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                          Diblokir
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => loadUserDetail(u.id)}
                          className="flex items-center space-x-1 rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                          title="Buka rincian lengkap"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Rincian</span>
                        </button>

                        {u.status === 'active' ? (
                          <>
                            <button
                              onClick={() => {
                                setActionUser(u);
                                setActionType('suspend');
                              }}
                              className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-amber-400 hover:bg-amber-500/20 text-[11px]"
                              title="Tangguhkan Akun"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => {
                                setActionUser(u);
                                setActionType('ban');
                              }}
                              className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-2 py-1 text-rose-400 hover:bg-rose-500/20 text-[11px]"
                              title="Blokir Akun Permanen"
                            >
                              Ban
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setActionUser(u);
                              setActionType('restore');
                            }}
                            className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-emerald-400 hover:bg-emerald-500/20 text-[11px]"
                          >
                            Aktifkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Drawer / Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-sky-400 uppercase">
                  Detail ID: {selectedUserId}
                </span>
                <h3 className="text-base font-bold text-white">
                  {detailData?.user.name} (@{detailData?.user.username})
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail || !detailData ? (
              <p className="py-8 text-center text-xs text-slate-500">Memuat rincian...</p>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs">
                  {[
                    { key: 'overview', label: 'Ringkasan' },
                    { key: 'ledger', label: 'Buku Kas (Ledger)' },
                    { key: 'transactions', label: 'Transaksi' },
                    { key: 'deposits', label: 'Deposit' },
                    { key: 'sessions', label: 'Sesi Aktif' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key as typeof detailTab)}
                      className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                        detailTab === tab.key
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {detailTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <span className="text-slate-500 block">Saldo Akun</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {formatRupiah(detailData.user.balance)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <span className="text-slate-500 block">Status Akun</span>
                        <span className="text-sm font-bold text-white uppercase">
                          {detailData.user.status}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <span className="text-slate-500 block">Total Pesanan</span>
                        <span className="text-sm font-bold text-white">
                          {detailData.orders.length}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <span className="text-slate-500 block">Deposit Disetujui</span>
                        <span className="text-sm font-bold text-white">
                          {detailData.deposits.filter((d) => d.status === 'approved').length}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email:</span>
                        <span className="text-slate-300">{detailData.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">No. HP:</span>
                        <span className="text-slate-300">{detailData.user.phone || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal Daftar:</span>
                        <span className="text-slate-300">
                          {new Date(detailData.user.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Quick moderation buttons in drawer */}
                    <div className="pt-2 flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setActionUser(detailData.user);
                          setActionType('force_logout');
                        }}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Force Logout Semua Sesi
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Ledger */}
                {detailTab === 'ledger' && (
                  <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                    {detailData.ledger.length === 0 ? (
                      <p className="py-6 text-center text-slate-500">Belum ada mutasi ledger.</p>
                    ) : (
                      detailData.ledger.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-2.5"
                        >
                          <div>
                            <span className="font-bold text-slate-200 block">{l.reason}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(l.created_at).toLocaleString('id-ID')} • Saldo: {formatRupiah(l.previous_balance)} → {formatRupiah(l.new_balance)}
                            </span>
                          </div>
                          <span
                            className={`font-bold ${
                              l.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {l.direction === 'in' ? '+' : '-'}
                            {formatRupiah(l.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Transactions */}
                {detailTab === 'transactions' && (
                  <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                    {detailData.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-2.5"
                      >
                        <div>
                          <span className="font-mono text-sky-400 text-[11px] block">
                            {tx.transaction_number}
                          </span>
                          <span className="font-bold text-white">{tx.title}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold block text-white">
                            {formatRupiah(tx.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Deposits */}
                {detailTab === 'deposits' && (
                  <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                    {detailData.deposits.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-2.5"
                      >
                        <div>
                          <span className="font-mono text-sky-400 text-[11px] block">
                            {dep.deposit_number}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(dep.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold block text-emerald-400">
                            {formatRupiah(dep.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">{dep.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Sessions */}
                {detailTab === 'sessions' && (
                  <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                    {detailData.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 space-y-1"
                      >
                        <div className="flex justify-between">
                          <span className="font-mono text-sky-400">IP: {s.ip_address}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              s.is_revoked === 0 ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {s.is_revoked === 0 ? 'Aktif' : 'Revoked'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{s.user_agent}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Moderation Confirmation Modal */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">
              Konfirmasi Tindakan:{' '}
              <span className="uppercase text-sky-400">{actionType}</span>
            </h3>

            <p className="text-slate-300">
              Apakah Anda yakin ingin melakukan tindakan ini pada akun{' '}
              <strong>{actionUser.name}</strong> (@{actionUser.username})?
            </p>

            {actionError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                {actionError}
              </div>
            )}

            {actionType !== 'restore' && actionType !== 'force_logout' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alasan Tindakan (Wajib Diisi):
                </label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Jelaskan alasan penangguhan atau pemblokiran akun ini..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionUser(null);
                  setActionType(null);
                }}
                className="rounded-xl border border-slate-700 px-3.5 py-2 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processing || (actionType !== 'restore' && actionType !== 'force_logout' && !actionReason.trim())}
                onClick={handleExecuteAction}
                className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {processing ? 'Memproses...' : 'Eksekusi Tindakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
