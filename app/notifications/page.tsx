'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Headphones,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  link_url: string | null;
  created_at: string;
}

export default function CustomerNotificationsPage() {
  const { refreshUser } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
      if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      await fetchNotifications();
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      await fetchNotifications();
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case 'purchase':
        return <CheckCircle2 className="h-4 w-4 text-sky-600" />;
      case 'support':
        return <Headphones className="h-4 w-4 text-blue-600" />;
      case 'security':
        return <Shield className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pemberitahuan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kabar verifikasi deposit, mutasi saldo, balasan dukungan & sistem
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center space-x-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100/70 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Tidak ada notifikasi baru
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Setiap pembaruan akun atau saldo Anda akan langsung muncul di sini.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = n.is_read === 0;

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (isUnread) handleMarkOne(n.id);
                }}
                className={`flex items-start justify-between rounded-2xl border p-4 transition-all ${
                  isUnread
                    ? 'border-sky-200 bg-sky-50/50 shadow-2xs'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-3.5 pr-2">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h3
                        className={`text-xs sm:text-sm font-bold ${
                          isUnread ? 'text-sky-950 font-extrabold' : 'text-slate-800'
                        }`}
                      >
                        {n.title}
                      </h3>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-sky-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="block text-[10px] text-slate-400 pt-1">
                      {new Date(n.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {n.link_url && (
                  <Link
                    href={n.link_url}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
