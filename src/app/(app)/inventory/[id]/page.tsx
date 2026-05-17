'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Package, Clock, User, ChevronDown, ChevronUp, ArrowDownToLine, Undo2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getChangeLogs, lendItem, returnItem } from '@/lib/services/inventoryService';
import { useAuthStore } from '@/store/authStore';
import { isAdmin, isMainMaster } from '@/lib/utils/roleUtils';
import type { InventoryItem, InventoryChangeLog } from '@/lib/models/inventory';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';

export default function InventoryItemPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const profile  = useAuthStore((s) => s.profile);

  const [item, setItem]           = useState<InventoryItem | null>(null);
  const [logs, setLogs]           = useState<InventoryChangeLog[]>([]);
  const [showLogs, setShowLogs]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [lendLoading, setLendLoading] = useState(false);

  const canEdit    = profile ? isAdmin(profile.role) : false;
  const canSeeLogs = profile ? isMainMaster(profile.role) : false;

  const isLent        = !!item?.lentTo;
  const lentByMe      = item?.lentTo?.userId === profile?.uid;
  const canReturn     = lentByMe || (profile ? isAdmin(profile.role) : false);
  const displayName   = profile?.displayName ?? profile?.email ?? 'Unbekannt';

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'lager_artikel', id));
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() } as InventoryItem);
      setLoading(false);
    }
    load();
  }, [id]);

  async function loadLogs() {
    const data = await getChangeLogs(id);
    setLogs(data);
    setShowLogs(true);
  }

  async function handleLend() {
    if (!profile?.uid) return;
    setLendLoading(true);
    try {
      await lendItem(id, profile.uid, displayName);
      const snap = await getDoc(doc(db, 'lager_artikel', id));
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() } as InventoryItem);
    } finally {
      setLendLoading(false);
    }
  }

  async function handleReturn() {
    if (!profile?.uid) return;
    setLendLoading(true);
    try {
      await returnItem(id, profile.uid, displayName);
      const snap = await getDoc(doc(db, 'lager_artikel', id));
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() } as InventoryItem);
    } finally {
      setLendLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Package className="w-10 h-10 text-text-tertiary" />
        <p className="text-sm text-text-secondary">Artikel nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Photo */}
      {item.photoURL && (
        <div className="w-full h-48 rounded-[16px] overflow-hidden bg-surface-3">
          <Image
            src={item.photoURL}
            alt={item.name}
            width={600}
            height={300}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Details card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono text-text-tertiary">{item.refNumber}</p>
            <h2 className="text-xl font-bold text-text-primary mt-0.5">{item.name}</h2>
          </div>
          <span className={cn(
            'badge text-sm px-3 py-1',
            item.quantity > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
          )}>
            × {item.quantity}
          </span>
        </div>

        {/* Lending status + action */}
        <div className="flex items-center justify-between gap-3 py-1">
          {isLent ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="badge bg-warning/15 text-warning text-xs px-2.5 py-1 flex-shrink-0">
                ausgeliehen
              </span>
              <span className="text-sm text-text-secondary truncate">
                bei <span className="font-medium text-text-primary">{item.lentTo!.displayName}</span>
                {item.lentTo!.lentAt && (
                  <> · {format(item.lentTo!.lentAt.toDate(), 'd. MMM', { locale: de })}</>
                )}
              </span>
            </div>
          ) : (
            <span className="badge bg-success/10 text-success text-xs px-2.5 py-1">
              verfügbar
            </span>
          )}

          {isLent && canReturn ? (
            <button
              onClick={handleReturn}
              disabled={lendLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-3 text-sm font-medium text-text-primary hover:bg-surface-3/80 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Zurückgeben
            </button>
          ) : !isLent ? (
            <button
              onClick={handleLend}
              disabled={lendLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Ausleihen
            </button>
          ) : null}
        </div>

        {item.description && (
          <p className="text-sm text-text-secondary">{item.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { label: 'Raum', value: item.location.room },
            { label: 'Lagerort', value: item.location.storage },
            { label: 'Regal', value: item.location.shelf },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-2 rounded-[10px] p-2.5">
              <p className="text-[10px] text-text-tertiary">{label}</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{value || '–'}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-text-tertiary pt-1">
          <User className="w-3.5 h-3.5" />
          <span>Angelegt von {item.createdBy}</span>
          <span>·</span>
          <Clock className="w-3.5 h-3.5" />
          <span>{format(item.createdAt.toDate(), 'd. MMM yyyy', { locale: de })}</span>
        </div>
      </div>

      {/* Change log (Main-Master only) */}
      {canSeeLogs && (
        <div className="card overflow-hidden">
          <button
            onClick={() => (showLogs ? setShowLogs(false) : loadLogs())}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Änderungsprotokoll
            </span>
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLogs && (
            <div className="border-t border-border divide-y divide-border">
              {logs.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-tertiary">Keine Änderungen.</p>
              ) : logs.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                    <span className="font-medium text-text-secondary">{log.userName}</span>
                    <span>·</span>
                    <span>{format(log.changedAt.toDate(), 'd. MMM HH:mm', { locale: de })}</span>
                    <span>·</span>
                    <span className="font-mono">{log.field}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-text-tertiary">{String(log.before ?? '–')}</span>
                    <span className="text-text-tertiary">→</span>
                    <span className="font-medium text-text-primary">{String(log.after ?? '–')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
