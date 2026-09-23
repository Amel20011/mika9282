'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface DepositItem {
  id: string;
  deposit_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  payment_method: string;
  proof_url: string;
  proof_filename: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Proof image inspection modal
  const [inspectImage, setInspectImage] = useState<string | null>(null);

  // Approval or Rejection Modal
  const [selectedDeposit, setSelectedDeposit] = useState<DepositItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDeposits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search.trim()) params.append('q', search.trim());

      const res = await fetch(`/api/admin/deposits?${params.toString()}`);
      const data = await res.json();
      if (data.deposits) setDeposits(data.deposits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const handleExecute = async () => {
    if (!selectedDeposit || !actionType) return;
    setProcessing(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          depositId: selectedDeposit.id,
          reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aksi deposit gagal.');

      setSelectedDeposit(null);
      setActionType(null);
      setRejectionReason('');
      await fetchDeposits();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Verifikasi & Manajemen Deposit QRIS
          </h1>
          <p className="text-xs text-slate-400">
            Pemeriksaan manual bukti mutasi transfer QRIS dan penambahan saldo otomatis
          </p>
        </div>

        <button
          onClick={fetchDeposits}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Segarkan</span>
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
            placeholder="Cari berdasarkan nomor deposit (#DEP-QRIS-...) atau nama pengguna..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'approved', label: 'Disetujui' },
            { key: 'rejected', label: 'Ditolak' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === tab.key
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
                <th className="py-3 px-4">No. Deposit</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Bukti Transfer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Memuat data deposit...
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada catatan deposit yang cocok.
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {d.deposit_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{d.user_name}</div>
                      <div className="text-[11px] text-slate-500">{d.user_email}</div>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-400 text-sm">
                      {formatRupiah(d.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setInspectImage(d.proof_url)}
                        className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Pratinjau</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {d.status === 'pending' && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                          Menunggu Verifikasi
                        </span>
                      )}
                      {d.status === 'under_review' && (
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                          Sedang Diperiksa
                        </span>
                      )}
                      {d.status === 'approved' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          Disetujui
                        </span>
                      )}
                      {d.status === 'rejected' && (
                        <div>
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                            Ditolak
                          </span>
                          {d.rejection_reason && (
                            <span className="block text-[10px] text-rose-400 mt-0.5">
                              {d.rejection_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(d.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status === 'pending' || d.status === 'under_review' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedDeposit(d);
                              setActionType('approve');
                              setActionError(null);
                            }}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDeposit(d);
                              setActionType('reject');
                              setRejectionReason('');
                              setActionError(null);
                            }}
                            className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Oleh {d.reviewed_by_name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Inspection Modal */}
      {inspectImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white">
                Pratinjau Bukti Transfer QRIS
              </span>
              <button
                onClick={() => setInspectImage(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Tutup
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inspectImage}
              alt="Bukti"
              className="max-h-[75vh] w-auto rounded-lg object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Approve / Reject Modal */}
      {selectedDeposit && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-sky-400 text-xs font-bold">
                  {selectedDeposit.deposit_number}
                </span>
                <h3 className="text-base font-bold text-white">
                  {actionType === 'approve' ? 'Konfirmasi Persetujuan Deposit' : 'Konfirmasi Penolakan Deposit'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedDeposit(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                {actionError}
              </div>
            )}

            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Pengguna:</span>
                <span className="text-white font-bold">{selectedDeposit.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {formatRupiah(selectedDeposit.amount)}
                </span>
              </div>
            </div>

            {actionType === 'approve' ? (
              <p className="text-slate-300">
                Menyetujui deposit ini akan <strong>menambah saldo aktif</strong> pengguna secara langsung dan mencatat mutasi kredit pada Buku Kas (Balance Ledger).
              </p>
            ) : (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alasan Penolakan:
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Bukti transfer tidak valid, mutasi belum masuk ke rekening..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDeposit(null);
                  setActionType(null);
                }}
                className="rounded-xl border border-slate-700 px-3.5 py-2 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                onClick={handleExecute}
                className={`rounded-xl px-4 py-2 font-bold text-white disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {processing ? 'Memproses...' : actionType === 'approve' ? 'Setujui Deposit' : 'Tolak Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
