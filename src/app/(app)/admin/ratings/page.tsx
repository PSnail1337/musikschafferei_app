'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import {
  getAllAggregates, getWeights, setWeights,
  createOrUpdateRating,
} from '@/lib/services/ratingService';
import { getAllUsers } from '@/lib/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { isMainMaster } from '@/lib/utils/roleUtils';
import { RATING_CRITERIA } from '@/lib/utils/constants';
import type { RatingAggregate, RatingWeights } from '@/lib/models/rating';
import type { UserProfile } from '@/lib/models/user';
import type { RatingCriterionId } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

export default function RatingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [aggregates, setAggregates] = useState<RatingAggregate[]>([]);
  const [users, setUsers]           = useState<UserProfile[]>([]);
  const [weights, setWeightsState]  = useState<RatingWeights | null>(null);
  const [loading, setLoading]       = useState(true);

  const isMain = profile ? isMainMaster(profile.role) : false;

  useEffect(() => {
    Promise.all([
      getAllAggregates(),
      getAllUsers(),
      getWeights(),
    ]).then(([aggs, usrs, wts]) => {
      setAggregates(aggs);
      setUsers(usrs);
      setWeightsState(wts);
      setLoading(false);
    });
  }, []);

  async function handleWeightChange(criterion: RatingCriterionId, val: number) {
    if (!weights || !profile) return;
    const updated = { ...weights.weights, [criterion]: val };
    await setWeights(updated, profile.uid);
    setWeightsState((prev) => prev ? { ...prev, weights: updated } : null);
    toast.success('Gewichtung gespeichert');
  }

  function getUserName(uid: string) {
    return users.find((u) => u.uid === uid)?.displayName ?? uid;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      {/* Weight settings (Main-Master only) */}
      {isMain && weights && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Kriteriengewichtung (1–10)</h3>
          {RATING_CRITERIA.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <label className="text-sm text-text-secondary flex-1">{c.label}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={weights.weights[c.id] ?? 5}
                onChange={(e) => handleWeightChange(c.id, Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="w-6 text-center text-sm font-semibold text-text-primary">
                {weights.weights[c.id] ?? 5}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Aggregates list */}
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
                      {getUserName(agg.subjectUid)}
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

                {/* Per-criterion breakdown */}
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
