'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { UserProfile } from '@/lib/models/user';

const PAGE_TITLES: Record<string, string> = {
  '/booking':   'Buchung',
  '/inventory': 'Lagerverwaltung',
  '/terms':     'Nutzungsbedingungen',
  '/support':   'Support',
  '/admin':     'Verwaltung',
  '/settings':  'Einstellungen',
};

export function TopBar({ profile }: { profile: UserProfile | null }) {
  const pathname = usePathname();

  // Find best matching title (longest matching prefix)
  const title = Object.entries(PAGE_TITLES)
    .filter(([path]) => pathname.startsWith(path))
    .sort(([a], [b]) => b.length - a.length)[0]?.[1] ?? 'musicmaker';

  const isRoot = Object.keys(PAGE_TITLES).some((p) => pathname === p);

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {!isRoot && (
            <button
              onClick={() => history.back()}
              className="btn-ghost p-2 -ml-2"
              aria-label="Zurück"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className={cn('font-semibold text-text-primary', isRoot ? 'text-lg' : 'text-base')}>
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/settings" aria-label="Einstellungen">
            {profile?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
