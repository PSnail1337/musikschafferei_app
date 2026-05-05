import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, setDoc,
  serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Rating, RatingWeights, RatingAggregate } from '@/lib/models/rating';
import type { RatingCriterionId } from '@/lib/utils/constants';
import { RATING_CRITERIA } from '@/lib/utils/constants';

const COL       = 'ratings';
const WEIGHT_ID = 'rating_gewichtung';
const AGG_COL   = 'rating_aggregate';

// ─── Default weights (1-10 per criterion) ────────────────────

const DEFAULT_WEIGHTS: Record<RatingCriterionId, number> = {
  aufwand:         5,
  zahlungsmoral:   8,
  ruecksichtnahme: 7,
  sauberkeit:      6,
};

// ─── CRUD ─────────────────────────────────────────────────────

export async function createOrUpdateRating(
  subjectUid: string,
  ratedBy: string,
  scores: Record<RatingCriterionId, number>,
  notes: string,
): Promise<void> {
  // Check if this rater already rated this subject
  const q = query(
    collection(db, COL),
    where('subjectUid', '==', subjectUid),
    where('ratedBy', '==', ratedBy),
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    await addDoc(collection(db, COL), {
      subjectUid,
      ratedBy,
      scores,
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(snap.docs[0].ref, { scores, notes, updatedAt: serverTimestamp() });
  }

  // Recalculate aggregate
  await recalcAggregate(subjectUid);
}

async function recalcAggregate(subjectUid: string): Promise<void> {
  const q = query(collection(db, COL), where('subjectUid', '==', subjectUid));
  const snap = await getDocs(q);
  const ratings = snap.docs.map((d) => d.data() as Rating);

  const weights = await getWeights();
  const totalWeight = Object.values(weights.weights).reduce((s, w) => s + w, 0);

  const criteriaAvgs: Record<RatingCriterionId, number> = {} as never;
  let weightedSum = 0;

  for (const c of RATING_CRITERIA) {
    const avg = ratings.reduce((s, r) => s + (r.scores[c.id] ?? 0), 0) / ratings.length;
    criteriaAvgs[c.id] = avg;
    weightedSum += avg * (weights.weights[c.id] ?? 1);
  }

  const weightedAvg = weightedSum / totalWeight;

  await setDoc(doc(db, AGG_COL, subjectUid), {
    subjectUid,
    weightedAvg,
    criteriaAvgs,
    totalRatings: ratings.length,
    updatedAt:    serverTimestamp(),
  });
}

// ─── Weights ──────────────────────────────────────────────────

export async function getWeights(): Promise<RatingWeights> {
  const snap = await getDoc(doc(db, WEIGHT_ID, 'global'));
  if (snap.exists()) return snap.data() as RatingWeights;

  // First-time default
  return {
    weights:   DEFAULT_WEIGHTS,
    updatedBy: 'system',
    updatedAt: { toDate: () => new Date() } as never,
  };
}

export async function setWeights(
  weights: Record<RatingCriterionId, number>,
  updatedBy: string,
): Promise<void> {
  await setDoc(doc(db, WEIGHT_ID, 'global'), {
    weights,
    updatedBy,
    updatedAt: serverTimestamp(),
  });

  // Recalculate all aggregates with new weights (fire-and-forget)
  const allRatings = await getDocs(collection(db, COL));
  const subjects = new Set(allRatings.docs.map((d) => d.data().subjectUid as string));
  await Promise.all([...subjects].map((uid) => recalcAggregate(uid)));
}

// ─── Read aggregate ───────────────────────────────────────────

export async function getAggregate(subjectUid: string): Promise<RatingAggregate | null> {
  const snap = await getDoc(doc(db, AGG_COL, subjectUid));
  return snap.exists() ? (snap.data() as RatingAggregate) : null;
}

/** All aggregates (Main-Master overview) */
export async function getAllAggregates(): Promise<RatingAggregate[]> {
  const snap = await getDocs(collection(db, AGG_COL));
  return snap.docs.map((d) => d.data() as RatingAggregate);
}
