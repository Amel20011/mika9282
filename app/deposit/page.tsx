'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  Eye,
} from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';
import { formatRupiah } from '@/lib/format';

interface DepositHistoryItem {
  id: string;
  deposit_number: string;
  amount: number;
  payment_method: string;
  proof_url: string;
  proof_filename: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface QrisInfo {
  ownerName: string;
  merchantId: string;
  imageUrl: string;
  instructions: string;
  depositsEnabled: boolean;
}

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

export default function CustomerDepositPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();

  const [qrisInfo, setQrisInfo] = useState<QrisInfo | null>(null);
  const [deposits, setDeposits] = useState<DepositHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Image preview modal
  const [inspectImage, setInspectImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [qrisRes, depRes] = await Promise.all([
        fetch('/api/qris-info'),
        fetch('/api/deposit'),
      ]);

      const qrisData = await qrisRes.json();
      if (qrisRes.ok) setQrisInfo(qrisData);

      if (depRes.ok) {
        const depData = await depRes.json();
        if (depData.deposits) setDeposits(depData.deposits);
      }
    } catch (err) {
      console.error('Failed to load deposit data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const effectiveAmount = isCustom ? parseInt(customAmount, 10) || 0 : selectedAmount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate size (max 5MB)
    if (selected.size > 5 * 1024 * 1024) {
      setFormError('Ukuran berkas maksimal 5 MB.');
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setFormError(null);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (effectiveAmount < 10000) {
      setFormError('Nominal deposit minimal Rp 10.000.');
      return;
    }

    if (!file) {
      setFormError('Harap lampirkan foto/tangkapan layar bukti transfer QRIS Anda.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSubmitSuccess(null);

    try {
      // 1. Upload proof file
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Gagal mengunggah bukti pembayaran.');
      }
      setUploading(false);

      // 2. Submit Deposit Record
      const depositRes = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveAmount,
          proofUrl: uploadData.url,
          proofFilename: file.name,
        }),
      });

      const depositData = await depositRes.json();
      if (!depositRes.ok) {
        throw new Error(depositData.error || 'Gagal mengirim permohonan deposit.');
      }

      setSubmitSuccess(
        `Permohonan deposit sebesar ${formatRupiah(effectiveAmount)} (${depositData.depositNumber}) telah berhasil dikirim! Status saat ini: Menunggu Verifikasi Admin.`
      );

      // Reset form
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadData();
      await refreshUser();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-sky-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Isi Saldo (Deposit QRIS Manual)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Transfer via scan QRIS ke rekening resmi kami, lalu unggah bukti transfer untuk diverifikasi Admin.
          </p>
        </div>
        {user && (
          <div className="flex items-center space-x-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 self-start sm:self-auto">
            <span className="text-xs text-sky-700">Saldo Akun:</span>
            <span className="text-sm font-bold text-slate-900">{formatRupiah(user.balance)}</span>
          </div>
        )}
      </div>

      {/* Main Grid: QRIS Card on Left, Deposit Form on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* QRIS Merchant Info Card (5 Cols) */}
        <div className="md:col-span-5 rounded-2xl border border-sky-100 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <QrCode className="h-5 w-5 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Kode QRIS Resmi</h2>
          </div>

          {/* QRIS SVG Code Container */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrisInfo?.imageUrl || '/assets/qris-aurelia-catherine.svg'}
              alt="QRIS Aurelia Cathērine"
              className="w-full h-auto object-contain rounded-lg"
            />
          </div>

          <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-400">Atas Nama:</span>
              <span className="font-semibold text-slate-800 text-right">
                {qrisInfo?.ownerName || 'PT AURELIA CATHERINE DIGITAL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Merchant ID:</span>
              <span className="font-mono text-slate-700">
                {qrisInfo?.merchantId || 'NMID: ID1020038891024'}
              </span>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="space-y-2 text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-slate-700 block">
              Petunjuk Pembayaran:
            </span>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>Buka aplikasi m-Banking atau E-Wallet apa pun (BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana).</li>
              <li>Pilih menu <strong>Scan / Bayar QRIS</strong> dan arahkan kamera ke barcode di atas.</li>
              <li>Masukkan nominal persis sesuai yang Anda pilih di formulir.</li>
              <li>Simpan / screenshot bukti transfer pembayaran yang berhasil.</li>
              <li>Unggah bukti tersebut pada formulir di samping dan klik <strong>Konfirmasi Deposit</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Deposit Form (7 Cols) */}
        <div className="md:col-span-7 rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Formulir Konfirmasi Deposit</h2>
            <span className="text-xs text-slate-400 font-medium">Min. Rp 10.000</span>
          </div>

          {submitSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Pengajuan Berhasil Dikirim!</span>
              </div>
              <p>{submitSuccess}</p>
            </div>
          )}

          {formError && (
            <div className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitDeposit} className="space-y-4">
            {/* Amount Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Pilih Nominal Deposit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setIsCustom(false);
                    }}
                    className={`rounded-xl py-2 px-2 text-xs font-bold transition-all ${
                      !isCustom && selectedAmount === amt
                        ? 'border-2 border-sky-600 bg-sky-50 text-sky-700 shadow-xs'
                        : 'border border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Custom Amount option */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className={`text-xs font-medium ${isCustom ? 'text-sky-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Atau masukkan nominal khusus lainnya
                </button>
                {isCustom && (
                  <div className="mt-1.5 relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={10000}
                      step={1000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Contoh: 75000"
                      className="w-full rounded-xl border border-sky-200 bg-white pl-10 pr-4 py-2 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Total to Transfer summary */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Nominal yang ditransfer:</span>
              <span className="text-lg font-black text-slate-900">
                {formatRupiah(effectiveAmount)}
              </span>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Unggah Bukti Transfer
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                  previewUrl
                    ? 'border-sky-300 bg-sky-50/30'
                    : 'border-slate-200 bg-slate-50/50 hover:border-sky-300 hover:bg-sky-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="flex flex-col items-center space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Pratinjau Bukti"
                      className="h-32 w-auto max-w-full rounded-lg object-contain shadow-xs border border-slate-200"
                    />
                    <div className="flex items-center space-x-1.5 text-xs text-sky-700 font-semibold">
                      <FileCheck className="h-4 w-4" />
                      <span>{file?.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Klik untuk mengganti foto
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-3">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      Klik untuk memilih tangkapan layar bukti transfer
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Format PNG, JPG, atau WebP (Maksimal 5 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:from-sky-500 hover:to-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {submitting || uploading ? (
                <span>Memproses unggahan & verifikasi...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Kirim Permohonan Deposit</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* User Deposit History Section */}
      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Deposit Anda</h2>
          </div>
          <button
            onClick={loadData}
            className="flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Segarkan</span>
          </button>
        </div>

        {deposits.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            Belum ada riwayat pengajuan deposit. Saldo Anda saat ini: {user ? formatRupiah(user.balance) : 'Rp 0'}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">No. Deposit</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Nominal</th>
                  <th className="py-2.5 px-3">Bukti</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {deposits.map((item) => {
                  let badge = (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                      Menunggu Verifikasi Admin
                    </span>
                  );

                  if (item.status === 'under_review') {
                    badge = (
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
                        Sedang Diperiksa
                      </span>
                    );
                  } else if (item.status === 'approved') {
                    badge = (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        Disetujui
                      </span>
                    );
                  } else if (item.status === 'rejected') {
                    badge = (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200" title={item.rejection_reason || ''}>
                        Ditolak
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">
                        {item.deposit_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(item.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatRupiah(item.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setInspectImage(item.proof_url)}
                          className="flex items-center space-x-1 text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Lihat</span>
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          {badge}
                          {item.rejection_reason && (
                            <span className="text-[10px] text-rose-600 mt-0.5">
                              Alasan: {item.rejection_reason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Proof Image Preview Modal */}
      {inspectImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-w-lg rounded-2xl bg-white p-4 shadow-xl border border-sky-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-700">Bukti Pembayaran QRIS</span>
              <button
                onClick={() => setInspectImage(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 rounded"
              >
                Tutup
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inspectImage}
              alt="Bukti Transfer"
              className="max-h-[75vh] w-auto rounded-lg object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
