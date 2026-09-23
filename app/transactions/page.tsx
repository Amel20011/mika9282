'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ReceiptText,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  X,
  Package,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface Transaction {
  id: string;
  transactionNumber: string;
  type: 'deposit' | 'purchase' | 'adjustment' | 'refund';
  title: string;
  amount: number;
  direction: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'rejected' | 'refunded';
  referenceId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterType === 'all' ? '/api/transactions' : `/api/transactions?type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const tabs = [
    { label: 'Semua', value: 'all' },
    { label: 'Pembelian', value: 'purchase' },
    { label: 'Deposit', value: 'deposit' },
    { label: 'Penyesuaian', value: 'adjustment' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-sky-100 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Riwayat Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Seluruh catatan mutasi debit, kredit, pembelian digital, dan status saldo Anda
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              filterType === tab.value
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-18 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Belum ada data transaksi
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Transaksi pembelian atau deposit Anda akan tercatat di sini secara otomatis.
            </p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.direction === 'credit';
            const isCompleted = tx.status === 'completed';
            const isPending = tx.status === 'pending';
            const isRejected = tx.status === 'rejected';
            const isRefunded = tx.status === 'refunded';

            return (
              <div
                key={tx.id}
                onClick={() => setActiveTx(tx)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-sky-100 bg-white p-4 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isCredit
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-sky-50 text-sky-600 border border-sky-100'
                    }`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {tx.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono">{tx.transactionNumber}</span>
                      <span>•</span>
                      <span>
                        {new Date(tx.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span
                    className={`text-sm font-extrabold ${
                      isCredit ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {isCredit ? '+' : '-'}
                    {formatRupiah(tx.amount)}
                  </span>

                  {isCompleted && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Selesai
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Menunggu
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                      Ditolak
                    </span>
                  )}
                  {isRefunded && (
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                      Dikembalikan
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Detail Modal */}
      {activeTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-sky-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  {activeTx.transactionNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {activeTx.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div className="flex justify-between items-center rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Nominal Transaksi:</span>
                <span className="text-lg font-black text-slate-900">
                  {formatRupiah(activeTx.amount)}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Tipe:</span>
                  <span className="font-semibold text-slate-700 uppercase">{activeTx.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Arah Mutasi:</span>
                  <span className="font-semibold text-slate-700 uppercase">{activeTx.direction}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Status Transaksi:</span>
                  <span className="font-bold text-slate-800 uppercase">{activeTx.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Waktu Transaksi:</span>
                  <span className="text-slate-700">
                    {new Date(activeTx.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Delivery Details Payload if Purchase */}
              {Boolean(activeTx.details && (activeTx.details as Record<string, unknown>).delivery) && (
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                  <span className="block font-bold text-sky-900 mb-1">
                    Detail Pengiriman / Akses Produk:
                  </span>
                  <pre className="whitespace-pre-wrap font-sans text-sky-800">
                    {String((activeTx.details as Record<string, unknown>).delivery)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTx(null)}
              className="mt-2 w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
