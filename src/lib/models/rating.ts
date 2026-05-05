import type { Timestamp } from 'firebase/firestore';
import type { RatingCriterionId } from '../utils/constants';

export interface Rating {
  id:          string;
  subjectUid:  string;
  ratedBy:     string;   // Master UID who created the rating
  scores:      Record<RatingCriterionId, number>;  // 1-5 per criterion
  notes:       string;
  createdAt:   Timestamp;
  updatedAt:   Timestamp;
}

/** Weights per criterion — one document, owned by Main-Master */
export interface RatingWeights {
  weights: Record<RatingCriterionId, number>;  // 1-10
  updatedBy: string;
  updatedAt: Timestamp;
}

/** Computed weighted average (denormalized for performance) */
export interface RatingAggregate {
  subjectUid:     string;
  weightedAvg:    number;
  criteriaAvgs:   Record<RatingCriterionId, number>;
  totalRatings:   number;
  updatedAt:      Timestamp;
}
