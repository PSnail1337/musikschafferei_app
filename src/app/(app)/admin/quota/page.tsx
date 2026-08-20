'use client';

import { useState, useEffect } from 'react';
import { BarChart2, AlertTriangle, Music } from 'lucide-react';
import {
  getUsersByMaster, getAllUsers, getUsedHoursThisYear,
  getAllBandQuotas, setBandQuota, getUsedHoursThisYearForBand,
} from '@/lib/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { isMainMaster } from '@/lib/utils/roleUtils';
import type { UserProfile } from '@/lib/models/user';
import { cn } from '@/lib/utils/cn';

interface UserQuota {
  user:       UserProfile;
  usedHours:  number;
  pct:        number;
  exceeded:   boolean;
}

interface BandQuotaRow {
  bandName:         string;
  annualQuotaHours: number | null;
  usedHours:        number;
  pct:              number;
  exceeded:         boolean;
}

export default function QuotaPage() {
  const profile = useAuthStore((s) => s.profile);
  const [quotas, setQuotas]   = useState<UserQuota[]>([]);
  const [bandQuotas, setBandQuotas] = useState<BandQuotaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isMain = profile ? isMainMaster(profile.role) : false;

  async function loadBandQuotas(users: UserProfile[]) {
    const bandNames = [...new Set(users.map((u) => u.bandName?.trim()).filter((b): b is string => !!b))];
    const existing = await getAllBandQuotas();
    const byName = new Map(existing.map((q) => [q.bandName, q]));

    const results: BandQuotaRow[] = await Promise.all(
      bandNames.map(async (bandName) => {
        const quota = byName.get(bandName)?.annualQuotaHours ?? null;
        const used  = await getUsedHoursThisYearForBand(bandName);
        const pct     = quota ? Math.min((used / quota) * 100, 100) : 0;
        const exceeded = quota != null && used >= quota;
        return { bandName, annualQuotaHours: quota, usedHours: used, pct, exceeded };
      }),
    );

    setBandQuotas(results.sort((a, b) => a.bandName.localeCompare(b.bandName)));
  }

  async function handleBandQuotaChange(bandName: string, hours: number | null) {
    await setBandQuota(bandName, hours);
    setBandQuotas((prev) => prev.map((r) => (r.bandName === bandName ? { ...r, annualQuotaHours: hours } : r)));
  }

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      const users = isMain
        ? await getAllUsers()
        : await getUsersByMaster(profile.uid);

      const results: UserQuota[] = await Promise.all(
        users
          .filter((u) => u.annualQuotaHours !== null)
          .map(async (u) => {
            const used    = await getUsedHoursThisYear(u.uid);
            const quota   = u.annualQuotaHours!;
            const pct     = Math.min((used / quota) * 100, 100);
            const exceeded = used >= quota;
            return { user: u, usedHours: used, pct, exceeded };
          }),
      );

      setQuotas(results.sort((a, b) => b.pct - a.pct));
      await loadBandQuotas(users);
      setLoading(false);
    }
    load();
  }, [profile?.uid]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <p className="text-sm text-text-secondary">
        Jahreskontingente — {new Date().getFullYear()}
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse-soft bg-surface-3" />
          ))}
        </div>
      ) : quotas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-secondary">
          Kein Mitglied hat ein Jahreskontingent zugewiesen.
        </div>
      ) : (
        <div className="space-y-3">
          {quotas.map(({ user, usedHours, pct, exceeded }) => (
            <div key={user.uid} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-500 text-sm font-bold">
                    {user.displayName[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{user.displayName}</p>
                  <p className="text-xs text-text-tertiary">{user.email}</p>
                </div>
                {exceeded && (
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    {usedHours.toFixed(1)} / {user.annualQuotaHours} Stunden
                  </span>
                  <span
                    className={cn(
                      'font-semibold',
                      exceeded ? 'text-danger' : pct > 80 ? 'text-warning' : 'text-success',
                    )}
                  >
                    {pct.toFixed(0)} %
                  </span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      exceeded ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-success',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Band quotas */}
      <div className="pt-2">
        <p className="text-sm text-text-secondary mb-3">Band-Kontingente</p>
        {!loading && bandQuotas.length === 0 ? (
          <div className="card p-8 text-center text-sm text-text-secondary">
            Kein Mitglied hat einen Bandnamen hinterlegt.
          </div>
        ) : (
          <div className="space-y-3">
            {bandQuotas.map(({ bandName, annualQuotaHours, usedHours, pct, exceeded }) => (
              <div key={bandName} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Music className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{bandName}</p>
                  </div>
                  {exceeded && (
                    <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs font-semibold text-text-secondary flex-shrink-0">
                    Jahreskontingent (Stunden)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-base text-sm py-1"
                    defaultValue={annualQuotaHours ?? ''}
                    placeholder="Unbegrenzt"
                    onBlur={(e) => handleBandQuotaChange(bandName, e.target.value ? Number(e.target.value) : null)}
                  />
                </div>

                {annualQuotaHours != null && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">
                        {usedHours.toFixed(1)} / {annualQuotaHours} Stunden
                      </span>
                      <span
                        className={cn(
                          'font-semibold',
                          exceeded ? 'text-danger' : pct > 80 ? 'text-warning' : 'text-success',
                        )}
                      >
                        {pct.toFixed(0)} %
                      </span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          exceeded ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-success',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
