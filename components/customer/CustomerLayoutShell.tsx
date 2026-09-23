'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TopNavbar } from './TopNavbar';
import { BottomNavbar } from './BottomNavbar';
import { safeFetchJson } from '@/lib/client-api';

export interface UserContextType {
  user: {
    userId: string;
    name: string;
    username: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    balance: number;
    unreadNotifications?: number;
  } | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateLocalBalance: (newBalance: number) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  updateLocalBalance: () => {},
});

export const useUser = () => useContext(UserContext);

export function CustomerLayoutShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ authenticated: boolean; user: UserContextType['user'] }>('/api/auth/me', { cache: 'no-store' });
      if (res.ok && res.data && res.data.authenticated && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser, pathname]);

  const updateLocalBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateLocalBalance }}>
      <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-sky-50/40 via-white to-slate-50 text-slate-900">
        <TopNavbar user={user} />
        <main className="flex-1 pb-24 sm:pb-20">{children}</main>
        <BottomNavbar unreadNotifications={user?.unreadNotifications || 0} />
      </div>
    </UserContext.Provider>
  );
}
