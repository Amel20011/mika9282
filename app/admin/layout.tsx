'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  Package,
  Layers,
  ReceiptText,
  Headphones,
  Bell,
  Settings,
  History,
  UserCheck,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

interface CurrentAdmin {
  adminId: string;
  name: string;
  username: string;
  email: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on admin login page, render children directly without admin shell
  const isLoginPage = pathname === '/admin/login';

  const checkAdminAuth = useCallback(async () => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/auth/me');
      const data = await res.json();
      if (data.authenticated && data.admin) {
        setAdmin(data.admin);
      } else {
        router.push('/admin/login');
      }
    } catch (err) {
      console.error(err);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 text-xs">
        Memverifikasi sesi administrator...
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const navLinks = [
    { label: 'Ringkasan Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Kelola Pengguna', href: '/admin/users', icon: Users },
    { label: 'Verifikasi Deposit', href: '/admin/deposits', icon: CreditCard },
    { label: 'Saldo & Mutasi Ledger', href: '/admin/balances', icon: Wallet },
    { label: 'Katalog Produk Digital', href: '/admin/products', icon: Package },
    { label: 'Kategori Produk', href: '/admin/categories', icon: Layers },
    { label: 'Riwayat Transaksi', href: '/admin/transactions', icon: ReceiptText },
    { label: 'Customer Service Desk', href: '/admin/support', icon: Headphones },
    { label: 'Siaran Notifikasi', href: '/admin/notifications', icon: Bell },
    ...(admin.role === 'super_admin'
      ? [{ label: 'Staf Administrator', href: '/admin/administrators', icon: UserCheck }]
      : []),
    { label: 'Audit & Keamanan', href: '/admin/activity', icon: History },
    { label: 'Pengaturan & QRIS', href: '/admin/settings', icon: Settings },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrator';
      case 'finance_admin':
        return 'Finance Admin';
      case 'product_admin':
        return 'Product Admin';
      case 'support_agent':
        return 'Customer Support';
      default:
        return role;
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-slate-950 text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800 bg-slate-900/95 p-4">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 px-2 pb-5 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-sm shadow-md shadow-sky-500/20">
            AC
          </div>
          <div>
            <span className="block text-sm font-bold tracking-tight text-white">
              Aurelia Cathērine
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-sky-400">
              Control Center
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User preview and customer website link */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
              <span>Pratinjau Pelanggan</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-500" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-slate-400">
              Sistem Manajemen Terpadu
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-white">{admin.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                {getRoleLabel(admin.role)}
              </span>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-sky-400 font-bold text-xs">
              {admin.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold ${
                    isActive ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <Link
                href="/"
                target="_blank"
                className="flex-1 text-center rounded-xl border border-slate-700 py-2 text-xs font-semibold text-slate-300"
              >
                Website Pelanggan
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400"
              >
                Keluar
              </button>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
