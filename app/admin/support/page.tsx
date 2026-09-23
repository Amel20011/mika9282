'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Headphones,
  Search,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  User,
  Shield,
  CreditCard,
  FileCheck,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface AdminTicketItem {
  id: string;
  ticket_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_balance: number;
  subject: string;
  status: 'open' | 'waiting_admin' | 'waiting_user' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
}

interface SupportMessage {
  id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

export default function AdminSupportDeskPage() {
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticketId');

  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected Active Ticket
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId);
  const [activeTicket, setActiveTicket] = useState<AdminTicketItem | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search.trim()) params.append('q', search.trim());

      const res = await fetch(`/api/admin/support?${params.toString()}`);
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
        if (!selectedTicketId && data.tickets.length > 0) {
          setSelectedTicketId(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, selectedTicketId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const loadTicketMessages = useCallback(async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`);
      const data = await res.json();
      if (data.ticket) setActiveTicket(data.ticket);
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketMessages(selectedTicketId);
    }
  }, [selectedTicketId, loadTicketMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || (!replyText.trim() && !file)) return;

    setSending(true);
    setReplyError(null);

    try {
      let attachmentUrl = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Gagal mengunggah lampiran.');
        attachmentUrl = upData.url;
      }

      const res = await fetch(`/api/admin/support/${selectedTicketId}`, {
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
      await loadTicketMessages(selectedTicketId);
      await fetchTickets();
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicketId) return;
    try {
      const res = await fetch(`/api/admin/support/${selectedTicketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadTicketMessages(selectedTicketId);
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Meja Layanan Pelanggan (Customer Support Desk)
          </h1>
          <p className="text-xs text-slate-400">
            Penanganan tiket bantuan manusia secara langsung, catatan audit respon, dan konteks profil customer
          </p>
        </div>

        <button
          onClick={() => {
            fetchTickets();
            if (selectedTicketId) loadTicketMessages(selectedTicketId);
          }}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Segarkan Pesan</span>
        </button>
      </div>

      {/* 3-Column Support Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[620px]">
        {/* Left Column: Tickets Queue (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tiket atau pengguna..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex space-x-1 overflow-x-auto pb-1 text-[11px]">
            {['all', 'waiting_admin', 'waiting_user', 'resolved', 'closed'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-2.5 py-1 font-semibold uppercase whitespace-nowrap transition-colors ${
                  statusFilter === f
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                Tidak ada tiket bantuan.
              </p>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-950/40 shadow-xs'
                        : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono text-sky-400 font-bold">
                        {t.ticket_number}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] uppercase font-semibold text-slate-300">
                        {t.status}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">
                      {t.subject}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.user_name}</p>
                    {t.last_message && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                        {t.last_message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Column: Chat Conversation Stream (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between h-[620px]">
          {activeTicket ? (
            <>
              {/* Ticket Top Header */}
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {activeTicket.ticket_number}
                  </span>
                  <h2 className="text-sm font-bold text-white line-clamp-1">
                    {activeTicket.subject}
                  </h2>
                </div>

                {/* Status Dropdown / Action */}
                <select
                  value={activeTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="waiting_admin">Waiting Admin</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_user">Waiting User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {loadingMessages ? (
                  <p className="text-center text-xs text-slate-500">Memuat pesan...</p>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_type === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="mb-0.5 flex items-center space-x-1.5 text-[10px] text-slate-400">
                          {isAdmin ? (
                            <span className="font-bold text-sky-400">
                              Staf: {m.sender_name}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-300">
                              Pelanggan: {m.sender_name}
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-sky-600 text-white rounded-tr-xs'
                              : 'bg-slate-800 text-slate-200 rounded-tl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                          {m.attachment_url && (
                            <div className="mt-2 overflow-hidden rounded-xl border border-white/20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.attachment_url}
                                alt="Lampiran"
                                className="max-h-40 w-auto rounded-lg object-contain bg-black/20"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Form */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                {replyError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                    {replyError}
                  </div>
                )}

                {file && (
                  <div className="flex items-center space-x-2 rounded-xl bg-slate-950 px-3 py-1.5 text-xs text-sky-400 border border-slate-800">
                    <FileCheck className="h-4 w-4" />
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-auto text-slate-400 hover:text-white"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply} noValidate className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
                    title="Lampirkan foto"
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
                    placeholder="Ketik tanggapan resmi staf CS..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!replyText.trim() && !file)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Pilih tiket di samping untuk membuka percakapan.
            </div>
          )}
        </div>

        {/* Right Column: Customer Context Sidebar (3 Cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Konteks Pelanggan
            </h3>
          </div>

          {activeTicket ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Nama Lengkap
                  </span>
                  <span className="font-bold text-white">{activeTicket.user_name}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Email</span>
                  <span className="text-slate-300 truncate block">
                    {activeTicket.user_email}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Saldo Rekening
                  </span>
                  <span className="font-black text-emerald-400 text-sm">
                    {formatRupiah(activeTicket.user_balance)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Metadata Tiket
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-400">ID Tiket:</span>
                  <span className="font-mono text-sky-400">
                    {activeTicket.ticket_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prioritas:</span>
                  <span className="font-bold text-slate-200 uppercase">
                    {activeTicket.priority}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dibuat:</span>
                  <span className="text-slate-300">
                    {new Date(activeTicket.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">Belum ada tiket terpilih.</p>
          )}
        </div>
      </div>
    </div>
  );
}
