'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  History,
  Search,
  Shield,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (search.trim()) params.append('q', search.trim());

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Jejak Audit & Log Keamanan Sistem
          </h1>
          <p className="text-xs text-slate-400">
            Catatan aktivitas administratif tidak dapat diubah (immutable security trail)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Segarkan Log</span>
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
            placeholder="Cari deskripsi log, nama admin, atau alamat IP..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'admin_login', label: 'Login' },
            { key: 'approve_deposit', label: 'Deposit' },
            { key: 'adjust_balance', label: 'Saldo' },
            { key: 'refund_transaction', label: 'Refund' },
            { key: 'create_product', label: 'Produk' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActionFilter(f.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                actionFilter === f.key
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Tindakan</th>
                <th className="py-3 px-4">Sumber Daya</th>
                <th className="py-3 px-4">Deskripsi Aktivitas</th>
                <th className="py-3 px-4">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Memuat log audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada catatan log yang cocok.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">{log.admin_name}</span>
                      <span className="text-[10px] text-sky-400 uppercase">
                        {log.admin_role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.resource_type}
                    </td>
                    <td className="py-3 px-4 text-slate-200 max-w-sm">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
