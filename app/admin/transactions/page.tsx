'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ReceiptText,
  Search,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface TransactionItem {
  id: string;
  transaction_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: 'deposit' | 'purchase' | 'adjustment' | 'refund';
  title: string;
  amount: number;
  direction: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'rejected' | 'refunded';
  details: Record<string, unknown>;
  created_at: string;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Refund Modal State
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Detail Modal State
  const [detailTx, setDetailTx] = useState<TransactionItem | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (search.trim()) params.append('q', search.trim());

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx || !refundReason.trim()) return;

    setProcessingRefund(true);
    setRefundError(null);

    try {
      const res = await fetch('/api/admin/transactions/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTx.id,
          reason: refundReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Proses pengembalian dana gagal.');

      setSelectedTx(null);
      setRefundReason('');
      await fetchTransactions();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pusat Riwayat Transaksi & Pengembalian Dana (Refund)
          </h1>
          <p className="text-xs text-slate-400">
            Audit seluruh transaksi pembelian produk, deposit, dan pemrosesan refund saldo
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor transaksi (#TRX-...), pengguna, atau judul..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'purchase', label: 'Pembelian' },
            { key: 'deposit', label: 'Deposit' },
            { key: 'adjustment', label: 'Penyesuaian' },
            { key: 'refund', label: 'Refund' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                typeFilter === tab.key
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">No. Transaksi</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Judul Transaksi</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Memuat transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCredit = tx.direction === 'credit';
                  const canRefund =
                    tx.type === 'purchase' && tx.status === 'completed';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">
                        {tx.transaction_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">
                          {tx.user_name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {tx.user_email}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 max-w-xs truncate">
                        {tx.title}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase font-mono text-slate-300">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={isCredit ? 'text-emerald-400' : 'text-slate-100'}
                        >
                          {isCredit ? '+' : '-'}
                          {formatRupiah(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-300">
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setDetailTx(tx)}
                            className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                            title="Lihat Detail Transaksi"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {canRefund && (
                            <button
                              onClick={() => {
                                setSelectedTx(tx);
                                setRefundReason('');
                                setRefundError(null);
                              }}
                              className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-sky-400 text-xs font-bold">
                  {detailTx.transaction_number}
                </span>
                <h3 className="text-base font-bold text-white">{detailTx.title}</h3>
              </div>
              <button
                onClick={() => setDetailTx(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Pengguna:</span>
                <span className="text-white font-bold">{detailTx.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {formatRupiah(detailTx.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu:</span>
                <span className="text-slate-300">
                  {new Date(detailTx.created_at).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {Boolean(detailTx.details && (detailTx.details as Record<string, unknown>).delivery) && (
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <span className="text-sky-400 font-semibold block mb-1">
                  Detail Pengiriman Produk:
                </span>
                <pre className="text-slate-300 whitespace-pre-wrap font-sans">
                  {String((detailTx.details as Record<string, unknown>).delivery)}
                </pre>
              </div>
            )}

            <button
              onClick={() => setDetailTx(null)}
              className="w-full rounded-xl bg-slate-800 py-2.5 font-bold text-white hover:bg-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-sky-400 text-xs font-bold">
                  {selectedTx.transaction_number}
                </span>
                <h3 className="text-base font-bold text-white">
                  Pengembalian Dana (Refund) Pembelian
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {refundError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                {refundError}
              </div>
            )}

            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Pengguna:</span>
                <span className="text-white font-bold">{selectedTx.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal yang Dikembalikan:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {formatRupiah(selectedTx.amount)}
                </span>
              </div>
            </div>

            <p className="text-slate-300">
              Pengembalian dana akan <strong>mengembalikan saldo penuh</strong> kepada akun pengguna, mengubah status transaksi menjadi <code>refunded</code>, dan mencatat transaksi mutasi kredit pada Buku Kas.
            </p>

            <form onSubmit={handleProcessRefund} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alasan Refund (Wajib):
                </label>
                <textarea
                  rows={3}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Contoh: Stok lisensi sedang gangguan teknis, permintaan pembatalan sesuai tiket..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="rounded-xl border border-slate-700 px-3.5 py-2 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processingRefund || !refundReason.trim()}
                  className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {processingRefund ? 'Memproses...' : 'Konfirmasi Refund Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
