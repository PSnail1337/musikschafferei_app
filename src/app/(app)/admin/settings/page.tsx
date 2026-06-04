'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { isMainMaster } from '@/lib/utils/roleUtils';
import type { AppConfig } from '@/lib/models/appConfig';
import { Shield, ToggleLeft, ToggleRight, Clock, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

const CONFIG_DOC = doc(db, 'app_config', 'global');

const DEFAULTS: Omit<AppConfig, 'updatedBy' | 'updatedAt'> = {
  registrationOpen:         true,
  defaultCancellationHours: 24,
  maintenanceMessage:       null,
  maintenanceUntil:         null,
};

export default function AppSettingsPage() {
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [registrationOpen, setRegistrationOpen]         = useState(DEFAULTS.registrationOpen);
  const [cancellationHours, setCancellationHours]       = useState(DEFAULTS.defaultCancellationHours);
  const [maintenanceEnabled, setMaintenanceEnabled]     = useState(false);
  const [maintenanceUntil, setMaintenanceUntil]         = useState('');

  useEffect(() => {
    if (profile && !isMainMaster(profile.role)) {
      router.replace('/admin');
    }
  }, [profile, router]);

  useEffect(() => {
    if (!profile || !isMainMaster(profile.role)) return;

    getDoc(CONFIG_DOC).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppConfig;
        setRegistrationOpen(data.registrationOpen ?? true);
        setCancellationHours(data.defaultCancellationHours ?? 24);
        setMaintenanceEnabled(!!data.maintenanceMessage);
        if (data.maintenanceUntil) {
          const d = (data.maintenanceUntil as Timestamp).toDate();
          const pad = (n: number) => String(n).padStart(2, '0');
          setMaintenanceUntil(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
          );
        }
      }
      setLoading(false);
    }).catch((err) => {
      console.error('[AppSettings] load failed:', err);
      setLoading(false);
    });
  }, [profile?.uid]);

  async function handleSave() {
    if (!fbUser) return;
    setSaving(true);
    try {
      await setDoc(CONFIG_DOC, {
        registrationOpen,
        defaultCancellationHours: cancellationHours,
        maintenanceMessage: maintenanceEnabled ? 'active' : null,
        maintenanceUntil: maintenanceEnabled && maintenanceUntil
          ? Timestamp.fromDate(new Date(maintenanceUntil))
          : null,
        updatedBy:  fbUser.uid,
        updatedAt:  serverTimestamp(),
      }, { merge: true });
      toast.success('Einstellungen gespeichert.');
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'unknown';
      console.error('[AppSettings] save failed:', code, err);
      toast.error(`Fehler: ${code}`, { duration: 8000 });
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !isMainMaster(profile.role)) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-text-primary">App-Einstellungen</h2>
        <p className="text-sm text-text-secondary mt-1">Nur für Main-Master sichtbar</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse-soft bg-surface-3" />
          ))}
        </div>
      ) : (
        <>
          {/* Registration toggle */}
          <div className="card p-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Registrierung</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Neue Konten können {registrationOpen ? 'erstellt werden' : 'nicht erstellt werden'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setRegistrationOpen((v) => !v)}
              className="flex-shrink-0"
              aria-label="Registrierung umschalten"
            >
              {registrationOpen ? (
                <ToggleRight className="w-9 h-9 text-brand-500" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-text-tertiary" />
              )}
            </button>
          </div>

          {/* Default cancellation window */}
          <div className="card p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Standard-Stornofrist</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Gilt für alle Mitglieder ohne individuelle Frist
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-1">
              <input
                type="number"
                min={0}
                max={168}
                step={1}
                value={cancellationHours}
                onChange={(e) => setCancellationHours(Number(e.target.value))}
                className="input-base w-24 text-center"
              />
              <span className="text-sm text-text-secondary">Stunden vor Buchungsbeginn</span>
            </div>
          </div>

          {/* Maintenance mode */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0',
                  maintenanceEnabled ? 'bg-danger/10' : 'bg-surface-3',
                )}>
                  <AlertTriangle className={cn(
                    'w-5 h-5',
                    maintenanceEnabled ? 'text-danger' : 'text-text-tertiary',
                  )} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Wartungsmodus</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Zeigt allen Usern eine Meldung
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMaintenanceEnabled((v) => !v)}
                className="flex-shrink-0"
                aria-label="Wartungsmodus umschalten"
              >
                {maintenanceEnabled ? (
                  <ToggleRight className="w-9 h-9 text-danger" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-text-tertiary" />
                )}
              </button>
            </div>

            {maintenanceEnabled && (
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Wieder online ab</p>
                <input
                  type="datetime-local"
                  className="input-base w-full"
                  value={maintenanceUntil}
                  onChange={(e) => setMaintenanceUntil(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn('btn-primary w-full flex items-center justify-center gap-2', saving && 'opacity-60 cursor-not-allowed')}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Speichern…' : 'Einstellungen speichern'}
          </button>
        </>
      )}
    </div>
  );
}
