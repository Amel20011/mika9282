'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ReceiptText, Headphones, Bell, User } from 'lucide-react';

interface BottomNavbarProps {
  unreadNotifications?: number;
}

export function BottomNavbar({ unreadNotifications = 0 }: BottomNavbarProps) {
  const pathname = usePathname();

  // Hide on admin routes or auth pages
  if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/register') {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home, exact: true },
    { label: 'Transaksi', href: '/transactions', icon: ReceiptText, exact: false },
    { label: 'Bantuan', href: '/support', icon: Headphones, exact: false },
    { label: 'Notifikasi', href: '/notifications', icon: Bell, exact: false, badge: unreadNotifications },
    { label: 'Akun', href: '/account', icon: User, exact: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-sky-100/80 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-lg transition-all">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-sky-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <IconComponent className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-sky-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
