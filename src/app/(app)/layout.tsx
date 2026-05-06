'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';

function Spinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !loading && !fbUser) {
      router.replace('/login');
    }
  }, [mounted, loading, fbUser, router]);

  if (!mounted) return null;
  if (loading) return <Spinner />;
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
