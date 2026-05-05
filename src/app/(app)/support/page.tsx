'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, Mic } from 'lucide-react';
import { getUserTickets, getAllTickets } from '@/lib/services/supportService';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/utils/roleUtils';
import type { SupportTicket } from '@/lib/models/support';
import { TicketCard } from '@/components/support/TicketCard';
import { TicketCreateSheet } from '@/components/support/TicketCreateSheet';

export default function SupportPage() {
  const profile  = useAuthStore((s) => s.profile);
  const fbUser   = useAuthStore((s) => s.firebaseUser);
  const [tickets, setTickets]   = useState<SupportTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const canSeeAll = profile ? isAdmin(profile.role) : false;

  async function loadTickets() {
    if (!fbUser) return;
    setLoading(true);
    const data = canSeeAll
      ? await getAllTickets()
      : await getUserTickets(fbUser.uid);
    setTickets(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, [fbUser?.uid]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Header + create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {loading ? '' : `${tickets.length} ${canSeeAll ? 'Tickets' : 'meine Tickets'}`}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary py-2 px-3 text-sm"
        >
          <Plus className="w-4 h-4" />
          Neues Ticket
        </button>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse-soft bg-surface-3" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <MessageSquare className="w-10 h-10 text-text-tertiary" />
          <p className="text-sm text-text-secondary">Noch keine Support-Tickets.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              canManage={canSeeAll}
              onRefresh={loadTickets}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <TicketCreateSheet
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadTickets(); }}
        />
      )}
    </div>
  );
}
