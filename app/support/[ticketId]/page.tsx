'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  Headphones,
  User,
  Shield,
  FileCheck,
} from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';

interface SupportMessage {
  id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: 'open' | 'waiting_admin' | 'waiting_user' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  created_at: string;
  updated_at: string;
}

export default function CustomerTicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const { user } = useUser();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [replyText, setReplyText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      if (!res.ok) throw new Error('Tiket tidak ditemukan.');
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat pesan tiket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !file) return;

    setSending(true);
    setError(null);

    try {
      let attachmentUrl = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Gagal mengunggah berkas.');
        attachmentUrl = upData.url;
      }

      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          attachmentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim balasan.');

      setReplyText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kegagalan mengirim pesan.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-xs text-slate-400">
        Memuat percakapan tiket bantuan...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-sm text-slate-600">Tiket tidak ditemukan.</p>
        <Link href="/support" className="mt-2 inline-block text-xs font-semibold text-sky-600">
          Kembali ke Daftar Bantuan
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-3 pb-8 space-y-4">
      {/* Top Bar with back link and ticket metadata */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
        <div className="flex items-center space-x-3">
          <Link
            href="/support"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-sky-700">
                {ticket.ticket_number}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                {ticket.status}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
              {ticket.subject}
            </h1>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="min-h-[420px] max-h-[550px] overflow-y-auto rounded-2xl border border-sky-100 bg-slate-50/70 p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender_type === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-1 flex items-center space-x-1.5 text-[11px] text-slate-400">
                {!isUser ? (
                  <div className="flex items-center space-x-1 font-semibold text-sky-700">
                    <Shield className="h-3 w-3" />
                    <span>{msg.sender_name}</span>
                  </div>
                ) : (
                  <span className="font-semibold text-slate-600">Anda</span>
                )}
                <span>•</span>
                <span>
                  {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs shadow-2xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.message}</p>

                {msg.attachment_url && (
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.attachment_url}
                      alt="Lampiran"
                      className="max-h-48 w-auto rounded-lg object-contain bg-black/10"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Reply input */}
      {ticket.status === 'closed' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-center text-xs text-slate-500 font-medium">
          Tiket ini telah ditutup oleh Administrator. Jika masih membutuhkan bantuan, silakan buka tiket baru.
        </div>
      ) : (
        <form onSubmit={handleSendReply} className="space-y-2">
          {file && (
            <div className="flex items-center space-x-2 rounded-xl bg-sky-50 px-3 py-1.5 text-xs text-sky-700 border border-sky-200">
              <FileCheck className="h-4 w-4" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-sky-900 hover:font-bold ml-auto"
              >
                Hapus
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-sky-600"
              title="Lampirkan tangkapan layar"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Tulis balasan pesan untuk staf kami..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />

            <button
              type="submit"
              disabled={sending || (!replyText.trim() && !file)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
