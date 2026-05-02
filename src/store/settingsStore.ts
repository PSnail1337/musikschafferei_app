'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/lib/utils/constants';

interface SettingsState {
  theme:            'light' | 'dark' | 'system';
  locale:           Locale;
  notificationsOn:  boolean;

  setTheme:        (t: 'light' | 'dark' | 'system') => void;
  setLocale:       (l: Locale) => void;
  setNotifications: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme:           'system',
      locale:          'de',
      notificationsOn: true,

      setTheme:        (theme) => set({ theme }),
      setLocale:       (locale) => set({ locale }),
      setNotifications: (notificationsOn) => set({ notificationsOn }),
    }),
    { name: 'musicmaker-settings' },
  ),
);
