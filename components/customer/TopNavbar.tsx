'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Bell, User as UserIcon, Shield } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface TopNavbarProps {
  user: {
    userId: string;
    name: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    balance: number;
    unreadNotifications?: number;
  } | null;
}

export function TopNavbar({ user }: TopNavbarProps) {
  const pathname = usePathname();

  // If on admin routes, do not render customer navbar
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sky-100/80 bg-white/80 backdrop-blur-xl shadow-xs transition-all">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/20 ring-1 ring-sky-400/30">
            <span className="text-sm font-black tracking-wider">AC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
              Aurelia Cathērine
            </span>
            <span className="text-[10px] font-medium tracking-wide uppercase text-sky-600/90">
              Digital Marketplace
            </span>
          </div>
        </Link>

        {/* Right Section: Balance & Profile / Login */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5">
          {user ? (
            <>
              {/* Balance Badge with Deposit CTA */}
              <Link
                href="/deposit"
                className="group flex items-center space-x-2 rounded-full border border-sky-200/80 bg-gradient-to-r from-sky-50 to-blue-50/70 px-3 py-1.5 shadow-2xs hover:border-sky-300 hover:from-sky-100/80 hover:to-blue-100/80 transition-all"
                title="Isi Saldo QRIS"
              >
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">
                    Saldo
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatRupiah(user.balance)}
                  </span>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              </Link>

              {/* Notification icon */}
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-700 hover:bg-sky-50/60 hover:text-sky-600 transition-colors"
                title="Notifikasi"
              >
                <Bell className="h-4 w-4" />
                {(user.unreadNotifications ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {user.unreadNotifications}
                  </span>
                )}
              </Link>

              {/* Account avatar */}
              <Link
                href="/account"
                className="flex items-center space-x-2 rounded-xl border border-sky-100 bg-white p-1 hover:bg-sky-50/60 transition-colors"
                title="Akun Saya"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-7 w-7 rounded-lg object-cover ring-1 ring-sky-200"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-semibold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-all"
              >
                Daftar
              </Link>
            </div>
          )}

          {/* Quick link to Admin Portal for ease of navigation */}
          <Link
            href="/admin/login"
            className="hidden sm:flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-100/80 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200/80 transition-colors"
            title="Masuk ke Portal Admin"
          >
            <Shield className="h-3 w-3 text-slate-500" />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
