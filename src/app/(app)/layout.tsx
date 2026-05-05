'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const loading   = useAuthStore((s) => s.loading);
  const profile   = useAuthStore((s) => s.profile);
  const fbUser    = useAuthStore((s) => s.firebaseUser);

  useEffect(() => {
    if (!loading && !fbUser) {
      router.replace('/login');
    }
  }, [loading, fbUser, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!fbUser) return null;

  return (
    <div className="min-h-dvh bg-surface-2 flex flex-col">
      <TopBar profile={profile} />
      <main className="flex-1 content-area overflow-y-auto">
        {children}
      </main>
      <BottomNav role={profile?.role ?? 'mitglied'} />
    </div>
  );
}
