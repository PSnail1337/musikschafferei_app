'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Package, Edit2, ChevronRight } from 'lucide-react';
import type { InventoryItem } from '@/lib/models/inventory';
import { cn } from '@/lib/utils/cn';

interface Props {
  item:      InventoryItem;
  canEdit:   boolean;
  onRefresh: () => void;
}

export function InventoryCard({ item, canEdit, onRefresh }: Props) {
  const router = useRouter();

  return (
    <div
      className="card flex items-center gap-3 p-3 cursor-pointer hover:shadow-card-md transition-shadow"
      onClick={() => router.push(`/inventory/${item.id}`)}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-[10px] bg-surface-3 flex-shrink-0 overflow-hidden">
        {item.photoURL ? (
          <Image
            src={item.photoURL}
            alt={item.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-text-tertiary" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-text-tertiary">{item.refNumber}</span>
          <span
            className={cn(
              'badge text-[9px]',
              item.quantity > 0
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger',
            )}
          >
            Menge: {item.quantity}
          </span>
        </div>
        <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
        <p className="text-xs text-text-tertiary truncate mt-0.5">
          {[item.location.room, item.location.storage, item.location.shelf]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
    </div>
  );
}
