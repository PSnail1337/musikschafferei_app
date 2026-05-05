'use client';

import { useState } from 'react';
import { Moon, Sun, Globe, Bell, BellOff, LogOut, User, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ROLE_LABELS, TYPE_LABELS } from '@/lib/utils/roleUtils';
import { SUPPORTED_LOCALES } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router     = useRouter();
  const profile    = useAuthStore((s) => s.profile);
  const { theme, locale, notificationsOn, setTheme, setLocale, setNotifications }
    = useSettingsStore();

  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logOut();
    router.replace('/login');
  }

  const sections = [
    {
      title: 'Erscheinungsbild',
      items: [
        {
          label: 'Design',
          control: (
            <div className="flex gap-1">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all',
                    theme === t
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border text-text-secondary',
                  )}
                >
                  {t === 'light' ? 'Hell' : t === 'dark' ? 'Dunkel' : 'System'}
                </button>
              ))}
            </div>
          ),
        },
      ],
    },
    {
      title: 'Sprache & Übersetzung',
      items: [
        {
          label: 'Sprache',
          control: (
            <div className="flex gap-1">
              {SUPPORTED_LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={cn(
                    'px-3 py-1.5 rounded-[8px] text-xs font-semibold border uppercase transition-all',
                    locale === l
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border text-text-secondary',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          ),
        },
      ],
    },
    {
      title: 'Benachrichtigungen',
      items: [
        {
          label: 'Push-Benachrichtigungen',
          sublabel: 'Buchungserinnerungen, Ticket-Updates',
          control: (
            <button
              onClick={() => setNotifications(!notificationsOn)}
              className={cn(
                'w-12 h-6 rounded-full relative transition-colors',
                notificationsOn ? 'bg-brand-500' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  notificationsOn ? 'left-6' : 'left-0.5',
                )}
              />
            </button>
          ),
        },
      ],
    },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Profile card */}
      {profile && (
        <div className="card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {profile.displayName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-text-primary truncate">{profile.displayName}</p>
            <p className="text-sm text-text-secondary truncate">{profile.email}</p>
            <div className="flex gap-1.5 mt-1.5">
              <span className="badge bg-brand-500/10 text-brand-500 text-[10px]">
                {ROLE_LABELS[profile.role]}
              </span>
              <span className="badge bg-surface-3 text-text-tertiary text-[10px]">
                {TYPE_LABELS[profile.userType]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings sections */}
      {sections.map((section) => (
        <div key={section.title} className="card overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
              {section.title}
            </p>
          </div>
          <div className="divide-y divide-border">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3.5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  {'sublabel' in item && (
                    <p className="text-xs text-text-tertiary mt-0.5">{item.sublabel}</p>
                  )}
                </div>
                {item.control}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="btn-danger w-full"
      >
        <LogOut className="w-4 h-4" />
        {signingOut ? 'Abmelden…' : 'Abmelden'}
      </button>

      <p className="text-center text-xs text-text-tertiary pb-4">
        musicmaker · Musikschafferei Linz · musicmaker.studio
      </p>
    </div>
  );
}
