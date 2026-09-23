'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Headphones,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';
import { safeFetchJson } from '@/lib/client-api';

interface TicketItem {
  id: string;
  ticket_number: string;
  subject: string;
  status: 'open' | 'waiting_admin' | 'waiting_user' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_time: string | null;
  admin_reply_count: number;
}

export default function CustomerSupportPage() {
  const router = useRouter();
  const { user } = useUser();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New ticket modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ tickets: TicketItem[] }>('/api/support');
      if (res.ok && res.data?.tickets) setTickets(res.data.tickets);
    } catch (err) {
      console.error('Fetch support tickets error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      let attachmentUrl = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await safeFetchJson<{ url: string; error?: string }>('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok || !uploadRes.data?.url) {
          throw new Error(uploadRes.error || 'Gagal mengunggah lampiran.');
        }
        attachmentUrl = uploadRes.data.url;
      }

      const res = await safeFetchJson<{ ticketId: string; error?: string }>('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          attachmentUrl,
        }),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Gagal membuat tiket bantuan.');
      }

      setIsModalOpen(false);
      setSubject('');
      setMessage('');
      setFile(null);
      await fetchTickets();
      router.push(`/support/${res.data.ticketId}`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: TicketItem['status']) => {
    switch (status) {
      case 'waiting_admin':
      case 'open':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
            Menunggu Respon CS
          </span>
        );
      case 'waiting_user':
        return (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
            Dibalas CS (Menunggu Anda)
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
            Sedang Ditangani
          </span>
        );
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
            Selesai
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-sky-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pusat Bantuan & Layanan Pelanggan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Layanan bantuan resmi langsung ditangani oleh staf dan administrator manusia (Bukan Bot Otomatis)
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              router.push('/login');
              return;
            }
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:from-sky-500 hover:to-blue-500 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Buat Tiket Bantuan</span>
        </button>
      </div>

      {/* Human Assurance Banner */}
      <div className="flex items-center space-x-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-xs text-sky-900">
        <ShieldCheck className="h-5 w-5 shrink-0 text-sky-600" />
        <div>
          <span className="font-bold">Layanan Dukungan Nyata:</span> Kami tidak menggunakan bot otomatis palsu. Setiap tiket bantuan Anda dibaca dan ditanggapi langsung oleh staf Aurelia Cathērine dengan catatan audit resmi.
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Headphones className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Belum ada tiket bantuan aktif
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Punya kendala terkait produk, deposit, atau akun? Buat tiket bantuan untuk berkomunikasi dengan staf kami.
            </p>
          </div>
        ) : (
          tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="group flex items-center justify-between rounded-2xl border border-sky-100 bg-white p-4 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all"
            >
              <div className="space-y-1 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    {t.ticket_number}
                  </span>
                  {getStatusBadge(t.status)}
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {t.subject}
                </h3>
                {t.last_message && (
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {t.last_message}
                  </p>
                )}
                <span className="block text-[11px] text-slate-400">
                  Pembaruan: {new Date(t.updated_at).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-sky-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Buat Tiket Bantuan Pelanggan
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="my-3 flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} noValidate className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Subjek Bantuan
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Kendala verifikasi deposit #DEP-QRIS-..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Pesan Lengkap
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Jelaskan kendala Anda secara rinci..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">
                  Lampiran Foto / Screenshot (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-sky-600 px-4 py-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Pesan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
