'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { searchInventory, listInventory } from '@/lib/services/inventoryService';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/utils/roleUtils';
import { MSG_SCHUELER_RESTRICTED } from '@/lib/utils/constants';
import type { InventoryItem } from '@/lib/models/inventory';
import { InventoryCard } from '@/components/inventory/InventoryCard';
import { InventoryAddSheet } from '@/components/inventory/InventoryAddSheet';
import { cn } from '@/lib/utils/cn';

export default function InventoryPage() {
  const profile  = useAuthStore((s) => s.profile);
  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const canAdd = profile ? isAdmin(profile.role) : false;

  // Schüler restriction
  if (profile?.userType === 'schüler') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center">
          <Package className="w-8 h-8 text-text-tertiary" />
        </div>
        <p className="text-sm text-text-secondary max-w-xs">{MSG_SCHUELER_RESTRICTED}</p>
      </div>
    );
  }

  useEffect(() => {
    if (query.trim()) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!profile) return;
        setLoading(true);
        const results = await searchInventory(query, profile.uid, profile.displayName);
        setItems(results);
        setLoading(false);
      }, 400);
    } else {
      loadAll();
    }

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function loadAll() {
    setLoading(true);
    const { items: all } = await listInventory(50);
    setItems(all);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="search"
          className="input-base pl-10"
          placeholder="Suche nach Artikel, Beschreibung, Raum…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {loading ? 'Lade…' : `${items.length} Artikel`}
        </p>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary py-2 px-3 text-sm"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        )}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse-soft bg-surface-3" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="w-10 h-10 text-text-tertiary" />
          <p className="text-sm text-text-secondary">
            {query ? 'Keine Ergebnisse gefunden.' : 'Noch keine Artikel vorhanden.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <InventoryCard key={item.id} item={item} canEdit={canAdd} onRefresh={loadAll} />
          ))}
        </div>
      )}

      {showAdd && (
        <InventoryAddSheet
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); loadAll(); }}
        />
      )}
    </div>
  );
}
