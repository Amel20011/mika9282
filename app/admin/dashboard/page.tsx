'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Wallet,
  ShoppingBag,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface DashboardData {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    restrictedUsers: number;
    pendingDepositsCount: number;
    pendingDepositsTotal: number;
    todayDepositsCount: number;
    todayDepositsTotal: number;
    completedPurchasesCount: number;
    completedPurchasesTotal: number;
    totalBalanceHeld: number;
    openTicketsCount: number;
  };
  pendingActions: {
    deposits: Array<{
      id: string;
      deposit_number: string;
      amount: number;
      created_at: string;
      proof_url: string;
      user_name: string;
      user_email: string;
    }>;
    tickets: Array<{
      id: string;
      ticket_number: string;
      subject: string;
      status: string;
      created_at: string;
      user_name: string;
    }>;
  };
  recentActivity: Array<{
    id: string;
    admin_name: string;
    admin_role: string;
    action: string;
    resource_type: string;
    description: string;
    created_at: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Action Modal state
  const [activeDeposit, setActiveDeposit] = useState<{
    id: string;
    deposit_number: string;
    amount: number;
    user_name: string;
    proof_url: string;
  } | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleApprove = async () => {
    if (!activeDeposit) return;
    setActionProcessing(true);
    setModalError(null);
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', depositId: activeDeposit.id }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Gagal menyetujui deposit.');

      setActiveDeposit(null);
      await fetchDashboard();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activeDeposit || !rejectReason.trim()) return;
    setActionProcessing(true);
    setModalError(null);
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          depositId: activeDeposit.id,
          reason: rejectReason.trim(),
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Gagal menolak deposit.');

      setActiveDeposit(null);
      setShowRejectInput(false);
      setRejectReason('');
      await fetchDashboard();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setActionProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const { metrics, pendingActions, recentActivity } = data;

  const statCards = [
    {
      title: 'Total Pengguna',
      value: metrics.totalUsers,
      sub: `${metrics.activeUsers} aktif, ${metrics.restrictedUsers} ditangguhkan`,
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Deposit Menunggu Verifikasi',
      value: metrics.pendingDepositsCount,
      sub: `Nominal: ${formatRupiah(metrics.pendingDepositsTotal)}`,
      icon: CreditCard,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      urgent: metrics.pendingDepositsCount > 0,
    },
    {
      title: 'Total Saldo Pengguna Beredar',
      value: formatRupiah(metrics.totalBalanceHeld),
      sub: 'Total liabilitas saldo customer',
      icon: Wallet,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Tiket Support Belum Ditutup',
      value: metrics.openTicketsCount,
      sub: 'Memerlukan tanggapan staf',
      icon: Headphones,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      urgent: metrics.openTicketsCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pusat Kendali Operasional
          </h1>
          <p className="text-xs text-slate-400">
            Metrik keuangan real-time, antrean verifikasi deposit QRIS, dan tiket bantuan
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`rounded-2xl border bg-slate-900/90 p-5 shadow-sm transition-all ${stat.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{stat.title}</span>
                <div className="rounded-xl p-2 bg-slate-800">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white">{stat.value}</div>
              <p className="mt-1 text-[11px] text-slate-400">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Pending Action Center: Deposits & Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Pending Deposits (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">
                Antrean Deposit QRIS Menunggu Verifikasi
              </h2>
            </div>
            <Link
              href="/admin/deposits"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
            >
              <span>Semua Deposit</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {pendingActions.deposits.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              Tidak ada deposit pending saat ini. Semua telah diverifikasi.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pendingActions.deposits.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {dep.deposit_number}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {formatRupiah(dep.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {dep.user_name} ({dep.user_email})
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      Diajukan: {new Date(dep.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveDeposit(dep);
                      setShowRejectInput(false);
                      setRejectReason('');
                      setModalError(null);
                    }}
                    className="flex items-center space-x-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Periksa Bukti</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Tickets (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Headphones className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">
                Tiket Support Menunggu Tanggapan
              </h2>
            </div>
            <Link
              href="/admin/support"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
            >
              <span>Desk Support</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {pendingActions.tickets.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              Tidak ada tiket yang menunggu respon admin.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pendingActions.tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/support?ticketId=${t.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="font-mono text-[11px] font-semibold text-sky-400">
                      {t.ticket_number}
                    </span>
                    <h3 className="text-xs font-bold text-white line-clamp-1">
                      {t.subject}
                    </h3>
                    <p className="text-[11px] text-slate-400">Dari: {t.user_name}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Logs Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white">Jejak Audit Aktivitas Terkini</h2>
          <Link
            href="/admin/activity"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
          >
            <span>Seluruh Catatan Log</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          {recentActivity.map((log) => (
            <div key={log.id} className="py-2.5 flex items-start justify-between">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sky-400">{log.admin_name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 uppercase">
                    {log.action}
                  </span>
                </div>
                <p className="text-slate-300">{log.description}</p>
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit Verification Modal */}
      {activeDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs text-sky-400 font-bold">
                  {activeDeposit.deposit_number}
                </span>
                <h3 className="text-base font-bold text-white">
                  Verifikasi Deposit QRIS
                </h3>
              </div>
              <button
                onClick={() => setActiveDeposit(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                Tutup
              </button>
            </div>

            {modalError && (
              <div className="my-3 flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="my-4 space-y-3 text-xs">
              <div className="flex justify-between items-center rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Pengguna:</span>
                  <span className="text-sm font-bold text-white">
                    {activeDeposit.user_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Nominal Deposit:</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatRupiah(activeDeposit.amount)}
                  </span>
                </div>
              </div>

              {/* Proof Image */}
              <div>
                <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Tangkapan Layar Bukti Transfer QRIS:
                </span>
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-black/40 p-2 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeDeposit.proof_url}
                    alt="Bukti Transfer"
                    className="max-h-64 w-auto rounded-lg object-contain"
                  />
                </div>
              </div>

              {/* Rejection reason box */}
              {showRejectInput && (
                <div className="space-y-1.5 pt-2">
                  <label className="block text-slate-300 font-semibold">
                    Alasan Penolakan Deposit:
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Bukti buram, nominal transfer tidak cocok, atau mutasi bank belum masuk..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setActiveDeposit(null)}
                className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>

              {!showRejectInput ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
                  >
                    Tolak Deposit
                  </button>
                  <button
                    type="button"
                    disabled={actionProcessing}
                    onClick={handleApprove}
                    className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{actionProcessing ? 'Memproses...' : 'Setujui & Tambah Saldo'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={actionProcessing || !rejectReason.trim()}
                  onClick={handleReject}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {actionProcessing ? 'Menolak...' : 'Konfirmasi Penolakan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
