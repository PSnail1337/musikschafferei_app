'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ChevronDown } from 'lucide-react';
import { getAllAggregates, createOrUpdateRating } from '@/lib/services/ratingService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getAllUsers } from '@/lib/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { isMainMaster } from '@/lib/utils/roleUtils';
import { RATING_CRITERIA } from '@/lib/utils/constants';
import type { RatingAggregate } from '@/lib/models/rating';
import type { UserProfile } from '@/lib/models/user';
import type { RatingCriterionId } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

const DEFAULT_SCORES = Object.fromEntries(
  RATING_CRITERIA.map((c) => [c.id, 3]),
) as Record<RatingCriterionId, number>;

export default function RatingsPage() {
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const [users, setUsers]           = useState<UserProfile[]>([]);
  const [aggregates, setAggregates] = useState<RatingAggregate[]>([]);
  const [loading, setLoading]       = useState(true);

  // Rate-a-member form
  const [selectedUid, setSelectedUid]   = useState('');
  const [scores, setScores]             = useState<Record<RatingCriterionId, number>>({ ...DEFAULT_SCORES });
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [loadingRating, setLoadingRating] = useState(false);


  useEffect(() => {
    if (profile && !isMainMaster(profile.role)) router.replace('/admin');
  }, [profile, router]);

  useEffect(() => {
    if (!profile || !isMainMaster(profile.role)) return;
    Promise.all([getAllAggregates(), getAllUsers()]).then(
      ([aggs, usrs]) => {
        setAggregates(aggs);
        setUsers(usrs.filter((u) => !isMainMaster(u.role)));
        setLoading(false);
      },
    );
  }, [profile?.uid]);

  // Load existing rating when a member is selected
  useEffect(() => {
    if (!selectedUid || !profile) return;
    setLoadingRating(true);
    const q = query(
      collection(db, 'ratings'),
      where('subjectUid', '==', selectedUid),
      where('ratedBy', '==', profile.uid),
    );
    getDocs(q).then((snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setScores(data.scores as Record<RatingCriterionId, number>);
        setNotes(data.notes ?? '');
      } else {
        setScores({ ...DEFAULT_SCORES });
        setNotes('');
      }
    }).finally(() => setLoadingRating(false));
  }, [selectedUid, profile?.uid]);

  async function handleSubmitRating() {
    if (!selectedUid || !profile) return;
    setSubmitting(true);
    try {
      await createOrUpdateRating(selectedUid, profile.uid, scores, notes);
      toast.success('Bewertung gespeichert.');
      const aggs = await getAllAggregates();
      setAggregates(aggs);
    } catch {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }

function getMemberLabel(u: UserProfile) {
    return u.bandName ? `${u.bandName} · ${u.displayName}` : u.displayName;
  }

  function getAggLabel(uid: string) {
    const u = users.find((u) => u.uid === uid);
    if (!u) return uid;
    return u.bandName ? `${u.bandName} · ${u.displayName}` : u.displayName;
  }

  if (!profile || !isMainMaster(profile.role)) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">

      {/* ── Rate a member ── */}
      <div className="card p-4 space-y-4">
        <h3 className="text-sm font-bold text-text-primary">Mitglied bewerten</h3>

        {/* Member picker */}
        <div className="relative">
          <select
            className="input-base appearance-none pr-8"
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
          >
            <option value="">Mitglied auswählen…</option>
            {users.map((u) => (
              <option key={u.uid} value={u.uid}>{getMemberLabel(u)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
        </div>

        {selectedUid && (
          <>
            {loadingRating ? (
              <div className="space-y-3">
                {RATING_CRITERIA.map((c) => (
                  <div key={c.id} className="h-8 rounded-[8px] bg-surface-3 animate-pulse-soft" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {RATING_CRITERIA.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-text-secondary">{c.label}</label>
                      <span className="text-sm font-semibold text-text-primary w-5 text-right">
                        {scores[c.id]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={scores[c.id]}
                      onChange={(e) =>
                        setScores((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                      }
                      className="w-full accent-brand-500"
                    />
                    <div className="flex justify-between text-[10px] text-text-tertiary px-0.5">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    Notiz <span className="text-text-tertiary">(optional)</span>
                  </label>
                  <textarea
                    className="input-base resize-none"
                    rows={2}
                    placeholder="Interne Anmerkung…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleSubmitRating}
                  disabled={submitting}
                  className={cn('btn-primary w-full', submitting && 'opacity-60 cursor-not-allowed')}
                >
                  {submitting ? 'Speichern…' : 'Bewertung speichern'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

{/* ── Overview ── */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-text-primary">Bewertungsübersicht</h3>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse-soft bg-surface-3" />
          ))
        ) : aggregates.length === 0 ? (
          <div className="card p-8 text-center text-sm text-text-secondary">
            Noch keine Bewertungen vorhanden.
          </div>
        ) : (
          aggregates
            .sort((a, b) => b.weightedAvg - a.weightedAvg)
            .map((agg) => (
              <div key={agg.subjectUid} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {getAggLabel(agg.subjectUid)}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {agg.totalRatings} Bewertung{agg.totalRatings !== 1 ? 'en' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-text-primary">
                      {agg.weightedAvg.toFixed(1)}
                    </p>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3 h-3',
                            i < Math.round(agg.weightedAvg)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-border fill-border',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {RATING_CRITERIA.map((c) => {
                    const val = agg.criteriaAvgs[c.id] ?? 0;
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary w-36 truncate">{c.label}</span>
                        <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${(val / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-text-secondary w-6 text-right">
                          {val.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
