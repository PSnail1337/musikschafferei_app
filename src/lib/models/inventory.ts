import type { Timestamp } from 'firebase/firestore';

export interface InventoryItem {
  id:          string;
  refNumber:   string;  // ART-00001
  name:        string;
  description: string;
  quantity:    number;
  photoURL:    string | null;
  location:    InventoryLocation;
  createdBy:   string;
  updatedBy:   string;
  createdAt:   Timestamp;
  updatedAt:   Timestamp;
  active:      boolean;
}

export interface InventoryLocation {
  room:    string;  // from dropdown
  storage: string;  // from dropdown
  shelf:   string;  // from dropdown
}

export interface InventoryChangeLog {
  id:        string;
  articleId: string;
  userId:    string;
  userName:  string;
  field:     string;
  before:    unknown;
  after:     unknown;
  changedAt: Timestamp;
}

export interface InventorySearchLog {
  id:        string;
  userId:    string;
  userName:  string;
  query:     string;
  resultCount: number;
  searchedAt: Timestamp;
}

/** Dropdown option collections for location fields */
export interface InventoryDropdownSet {
  id:      string;  // 'rooms' | 'storage' | 'shelves'
  options: string[];
}
