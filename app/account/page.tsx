'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  CreditCard,
  Headphones,
  Bell,
  LogOut,
  ChevronRight,
  ExternalLink,
  Lock,
  Smartphone,
  Plus,
} from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';
import { formatRupiah } from '@/lib/format';

export default function CustomerAccountPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await refreshUser();
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
          <User className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Masuk ke Akun Anda</h1>
        <p className="text-xs text-slate-500">
          Silakan masuk atau buat akun baru untuk mengelola saldo dan transaksi digital Anda.
        </p>
        <div className="flex justify-center space-x-3 pt-2">
          <Link
            href="/login"
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-500 shadow-sm"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Daftar Akun
          </Link>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Profil Saya',
      desc: 'Perbarui nama, kontak telepon, dan foto avatar',
      icon: User,
      href: '/account/profile',
    },
    {
      title: 'Keamanan & Sesi Masuk',
      desc: 'Ganti kata sandi dan kelola perangkat aktif',
      icon: Lock,
      href: '/account/security',
    },
    {
      title: 'Riwayat Transaksi',
      desc: 'Catatan seluruh transaksi saldo dan produk',
      icon: CreditCard,
      href: '/transactions',
    },
    {
      title: 'Pusat Bantuan CS',
      desc: 'Hubungi layanan pelanggan langsung resmi',
      icon: Headphones,
      href: '/support',
    },
    {
      title: 'Pemberitahuan Sistem',
      desc: 'Lihat seluruh riwayat kabar notifikasi',
      icon: Bell,
      href: '/notifications',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-5">
      {/* User Identity Card */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-sky-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-xl shadow-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-slate-900">{user.name}</h1>
            <p className="text-xs text-slate-500">@{user.username}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>

        {/* Balance Card Section */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-sky-50 to-blue-50/80 p-3.5 border border-sky-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
              Saldo Rekening Aktif
            </span>
            <div className="text-lg font-black text-slate-900">
              {formatRupiah(user.balance)}
            </div>
          </div>
          <Link
            href="/deposit"
            className="flex items-center space-x-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Isi Saldo</span>
          </Link>
        </div>
      </div>

      {/* Account Menu Navigation */}
      <div className="rounded-2xl border border-sky-100 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center space-x-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <IconComp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
          );
        })}
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center space-x-2 rounded-2xl border border-rose-200 bg-white py-3 text-xs font-bold text-rose-600 shadow-2xs hover:bg-rose-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        <span>Keluar dari Akun</span>
      </button>
    </div>
  );
}
