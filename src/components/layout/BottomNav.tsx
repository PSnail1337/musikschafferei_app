'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Package, FileText, MessageSquare, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { hasRole } from '@/lib/utils/roleUtils';
import type { UserRole } from '@/lib/utils/constants';

interface NavItem {
  href:    string;
  label:   string;
  icon:    React.ComponentType<{ className?: string }>;
  minRole?: UserRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/booking',   label: 'Buchung',       icon: Calendar },
  { href: '/inventory', label: 'Lager',          icon: Package },
  { href: '/terms',     label: 'Nutzung',        icon: FileText },
  { href: '/support',   label: 'Support',        icon: MessageSquare },
  { href: '/admin',     label: 'Verwaltung',     icon: Settings2, minRole: 'master' },
];

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.minRole || hasRole(role, item.minRole),
  );

  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => {
        const Icon    = item.icon;
        const active  = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 pt-1 pb-2 rounded-xl transition-colors',
              active
                ? 'text-brand-500'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 transition-transform',
                active && 'scale-110',
              )}
            />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
