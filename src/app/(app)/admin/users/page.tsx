'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronRight, UserCheck, UserX } from 'lucide-react';
import {
  getAllUsers, getUsersByMaster, setUserRole, setUserType,
  setCancellationWindow, deactivateUser, activateUser, setAnnualQuota,
} from '@/lib/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { isMainMaster, ROLE_LABELS, TYPE_LABELS } from '@/lib/utils/roleUtils';
import { USER_ROLES, USER_TYPES } from '@/lib/utils/constants';
import type { UserProfile } from '@/lib/models/user';
import type { UserRole, UserType } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const profile    = useAuthStore((s) => s.profile);
  const [users, setUsers]     = useState<UserProfile[]>([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const isMain = profile ? isMainMaster(profile.role) : false;

  async function loadUsers() {
    if (!profile) return;
    setLoading(true);
    const data = isMain
      ? await getAllUsers()
      : await getUsersByMaster(profile.uid);
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, [profile?.uid]);

  const filtered = users.filter((u) =>
    !query ||
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()),
  );

  async function handleRoleChange(uid: string, role: UserRole) {
    await setUserRole(uid, role);
    toast.success('Rolle aktualisiert');
    await loadUsers();
  }

  async function handleTypeChange(uid: string, type: UserType) {
    await setUserType(uid, type);
    toast.success('Typ aktualisiert');
    await loadUsers();
  }

  async function handleToggleActive(user: UserProfile) {
    if (user.active) {
      await deactivateUser(user.uid);
      toast.success('Mitglied deaktiviert');
    } else {
      await activateUser(user.uid);
      toast.success('Mitglied aktiviert');
    }
    await loadUsers();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          className="input-base pl-10"
          placeholder="Name oder E-Mail suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="text-sm text-text-secondary">{filtered.length} Mitglieder</p>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse-soft bg-surface-3" />
          ))
        ) : filtered.map((user) => (
          <div
            key={user.uid}
            className="card p-4 cursor-pointer hover:shadow-card-md transition-shadow"
            onClick={() => setSelected(selected?.uid === user.uid ? null : user)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-500 text-sm font-bold">
                  {user.displayName[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold', !user.active && 'line-through text-text-tertiary')}>
                  {user.displayName}
                </p>
                <p className="text-xs text-text-tertiary truncate">{user.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="badge bg-surface-3 text-text-secondary text-[10px]">
                  {ROLE_LABELS[user.role]}
                </span>
                <span className="badge bg-surface-3 text-text-tertiary text-[10px]">
                  {TYPE_LABELS[user.userType]}
                </span>
              </div>
              <ChevronRight className={cn('w-4 h-4 text-text-tertiary transition-transform', selected?.uid === user.uid && 'rotate-90')} />
            </div>

            {/* Inline editor */}
            {selected?.uid === user.uid && (
              <div
                className="mt-4 pt-4 border-t border-border space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Role */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Rolle</label>
                    <select
                      className="input-base text-sm"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      disabled={!isMain}
                    >
                      {USER_ROLES.filter((r) => r !== 'main-master' || isMain).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Typ</label>
                    <select
                      className="input-base text-sm"
                      value={user.userType}
                      onChange={(e) => handleTypeChange(user.uid, e.target.value as UserType)}
                    >
                      {USER_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cancellation window */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    Stornofrist (Stunden)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-base text-sm"
                    defaultValue={user.cancellationWindowHours}
                    onBlur={(e) => setCancellationWindow(user.uid, Number(e.target.value))}
                  />
                </div>

                {/* Annual quota */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    Jahreskontingent (Stunden, leer = unbegrenzt)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-base text-sm"
                    defaultValue={user.annualQuotaHours ?? ''}
                    placeholder="Unbegrenzt"
                    onBlur={(e) =>
                      setAnnualQuota(user.uid, e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(user)}
                  className={user.active ? 'btn-danger w-full text-sm' : 'btn-secondary w-full text-sm'}
                >
                  {user.active ? (
                    <><UserX className="w-4 h-4" /> Deaktivieren</>
                  ) : (
                    <><UserCheck className="w-4 h-4" /> Aktivieren</>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
