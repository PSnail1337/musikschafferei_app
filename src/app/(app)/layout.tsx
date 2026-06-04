'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/utils/roleUtils';
import type { AppConfig } from '@/lib/models/appConfig';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';

type MaintenanceState =
  | { status: 'loading' }
  | { status: 'off' }
  | { status: 'on'; until: Date | null };

function Spinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function formatCountdown(until: Date): string {
  const diff = until.getTime() - Date.now();
  if (diff <= 0) return 'gleich';
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} Std. ${minutes} Min.`;
  return `${minutes} Min.`;
}

function MaintenanceScreen({ until }: { until: Date | null }) {
  const [countdown, setCountdown] = useState(() => until ? formatCountdown(until) : null);

  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setCountdown(formatCountdown(until)), 60000);
    return () => clearInterval(id);
  }, [until]);

  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6 text-center gap-3">
      <p className="text-lg font-semibold text-text-primary">
        Wartungsmodus{countdown ? `: noch ${countdown}` : ''}
      </p>
      <p className="text-base text-text-secondary">Bald wieder für dich da!</p>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);
  const [mounted, setMounted] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceState>({ status: 'loading' });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !loading && !fbUser) {
      router.replace('/login');
    }
  }, [mounted, loading, fbUser, router]);

  useEffect(() => {
    if (!fbUser) return;
    getDoc(doc(db, 'app_config', 'global')).then((snap) => {
      if (!snap.exists()) { setMaintenance({ status: 'off' }); return; }
      const data = snap.data() as AppConfig;
      if (!data.maintenanceMessage) { setMaintenance({ status: 'off' }); return; }
      const until = data.maintenanceUntil
        ? (data.maintenanceUntil as Timestamp).toDate()
        : null;
      setMaintenance({ status: 'on', until });
    }).catch(() => setMaintenance({ status: 'off' }));
  }, [fbUser]);

  if (!mounted) return null;
  if (loading) return <Spinner />;
  if (!fbUser) return null;

  // Admins and above can always access the app during maintenance
  const bypassed = profile ? isAdmin(profile.role) : false;

  if (!bypassed && maintenance.status === 'on') {
    return <MaintenanceScreen until={maintenance.until} />;
  }

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
