'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const fbUser  = useAuthStore((s) => s.firebaseUser);

  // Redirect to booking if already signed in
  useEffect(() => {
    if (!loading && fbUser) {
      router.replace('/booking');
    }
  }, [loading, fbUser, router]);

  return <>{children}</>;
}
