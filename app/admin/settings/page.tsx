'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Settings,
  ShieldAlert,
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  FileCheck,
} from 'lucide-react';

interface SystemSettings {
  maintenance_mode: string;
  maintenance_message: string;
  qris_owner_name: string;
  qris_merchant_id: string;
  qris_image_url: string;
  qris_instructions: string;
  purchases_enabled: string;
  deposits_enabled: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [qrisOwnerName, setQrisOwnerName] = useState('');
  const [qrisMerchantId, setQrisMerchantId] = useState('');
  const [qrisImageUrl, setQrisImageUrl] = useState('');
  const [qrisInstructions, setQrisInstructions] = useState('');
  const [purchasesEnabled, setPurchasesEnabled] = useState(true);
  const [depositsEnabled, setDepositsEnabled] = useState(true);

  const [uploadingQr, setUploadingQr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setMaintenanceMode(data.settings.maintenance_mode === '1');
        setMaintenanceMessage(data.settings.maintenance_message || '');
        setQrisOwnerName(data.settings.qris_owner_name || '');
        setQrisMerchantId(data.settings.qris_merchant_id || '');
        setQrisImageUrl(data.settings.qris_image_url || '');
        setQrisInstructions(data.settings.qris_instructions || '');
        setPurchasesEnabled(data.settings.purchases_enabled !== '0');
        setDepositsEnabled(data.settings.deposits_enabled !== '0');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah QRIS.');

      setQrisImageUrl(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah berkas QRIS.');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenance_mode: maintenanceMode ? '1' : '0',
          maintenance_message: maintenanceMessage.trim(),
          qris_owner_name: qrisOwnerName.trim(),
          qris_merchant_id: qrisMerchantId.trim(),
          qris_image_url: qrisImageUrl,
          qris_instructions: qrisInstructions.trim(),
          purchases_enabled: purchasesEnabled ? '1' : '0',
          deposits_enabled: depositsEnabled ? '1' : '0',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan.');

      setSuccess('Pengaturan sistem dan data QRIS berhasil disimpan.');
      await fetchSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        Memuat konfigurasi sistem...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pengaturan Sistem & Konfigurasi QRIS
          </h1>
          <p className="text-xs text-slate-400">
            Kendali fitur global, mode pemeliharaan (maintenance), dan barcode pembayaran QRIS resmi
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Global Kill Switches */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="font-bold text-white text-sm">
              Kendali Operasional Marketplace
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-bold text-white block">Mode Pemeliharaan (Maintenance Mode)</span>
                <span className="text-slate-400 text-[11px]">
                  Tampilkan peringatan pemeliharaan sistem pada website pelanggan
                </span>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-sky-500"
              />
            </div>

            {maintenanceMode && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pesan Pengumuman Pemeliharaan:
                </label>
                <textarea
                  rows={2}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Website sedang dalam pemeliharaan berkala..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Fitur Pembelian Produk</span>
                  <span className="text-slate-400 text-[11px]">Izinkan transaksi pembelian katalog</span>
                </div>
                <input
                  type="checkbox"
                  checked={purchasesEnabled}
                  onChange={(e) => setPurchasesEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Fitur Permohonan Deposit</span>
                  <span className="text-slate-400 text-[11px]">Izinkan pengajuan deposit QRIS</span>
                </div>
                <input
                  type="checkbox"
                  checked={depositsEnabled}
                  onChange={(e) => setDepositsEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* QRIS Configuration */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <QrCode className="h-4 w-4 text-sky-400" />
            <h2 className="font-bold text-white text-sm">Konfigurasi Kode QRIS Resmi</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nama Pemilik / Merchant QRIS:
              </label>
              <input
                type="text"
                required
                value={qrisOwnerName}
                onChange={(e) => setQrisOwnerName(e.target.value)}
                placeholder="PT AURELIA CATHERINE DIGITAL"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Merchant ID (NMID):
              </label>
              <input
                type="text"
                value={qrisMerchantId}
                onChange={(e) => setQrisMerchantId(e.target.value)}
                placeholder="NMID: ID1020038891024"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* QR Image Container & Upload */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-semibold">
              Gambar / Barcode QRIS Resmi:
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrisImageUrl || '/assets/qris-aurelia-catherine.svg'}
                alt="QRIS Preview"
                className="h-32 w-32 rounded-lg bg-white p-1 object-contain shadow-xs"
              />
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={uploadingQr}
                  onClick={() => qrFileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingQr ? 'Mengunggah...' : 'Unggah Barcode QRIS Baru'}</span>
                </button>
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="hidden"
                />
                <p className="text-[11px] text-slate-500">
                  Mendukung format SVG, PNG, JPG transparan beresolusi tinggi.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Petunjuk Pembayaran Pelanggan:
            </label>
            <textarea
              rows={4}
              value={qrisInstructions}
              onChange={(e) => setQrisInstructions(e.target.value)}
              placeholder="Instruksi transfer..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white hover:bg-sky-500 shadow-md shadow-sky-600/20 disabled:opacity-50 text-xs transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Semua Perubahan Pengaturan'}</span>
        </button>
      </form>
    </div>
  );
}
