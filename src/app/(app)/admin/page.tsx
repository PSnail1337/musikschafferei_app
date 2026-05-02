'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Star, BarChart2, FileOutput, Settings, Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { isMaster, isMainMaster } from '@/lib/utils/roleUtils';

export default function AdminPage() {
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (profile && !isMaster(profile.role)) {
      router.replace('/booking');
    }
  }, [profile, router]);

  if (!profile || !isMaster(profile.role)) return null;

  const isMain = isMainMaster(profile.role);

  const sections = [
    {
      href:    '/admin/users',
      icon:    Users,
      label:   'Mitglieder',
      desc:    'Rollen, Typen, Stornofrist, Mitgliederkreis',
      color:   '#5c67f2',
      visible: true,
    },
    {
      href:    '/admin/quota',
      icon:    BarChart2,
      label:   'Kontingente & Abrechnung',
      desc:    'Jahresstunden, Lehrer-Abrechnung, Sondermitglieder',
      color:   '#00B894',
      visible: true,
    },
    {
      href:    '/admin/ratings',
      icon:    Star,
      label:   'Bewertungen',
      desc:    'Kriterienbewertung, gewichtete Übersicht',
      color:   '#F1C40F',
      visible: true,
    },
    {
      href:    '/admin/export',
      icon:    FileOutput,
      label:   'Export',
      desc:    'Buchungsdaten als CSV herunterladen',
      color:   '#74B9FF',
      visible: true,
    },
    {
      href:    '/admin/settings',
      icon:    Shield,
      label:   'App-Einstellungen',
      desc:    'Registrierung, Wartungsmodus, Stornofrist',
      color:   '#A29BFE',
      visible: isMain,
    },
  ].filter((s) => s.visible);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary">Verwaltung</h2>
        <p className="text-sm text-text-secondary mt-1">
          {isMain ? 'Main-Master' : 'Master'} · {profile.displayName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <div className="card p-4 hover:shadow-card-md transition-shadow flex items-start gap-4 cursor-pointer">
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: s.color + '20' }}
                >
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{s.label}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{s.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
