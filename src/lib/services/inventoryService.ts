import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, getDoc, orderBy, limit,
  startAfter, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import type {
  InventoryItem, InventoryChangeLog, InventorySearchLog, InventoryDropdownSet,
} from '@/lib/models/inventory';
import { INVENTORY_REF_PREFIX, INVENTORY_REF_DIGITS } from '@/lib/utils/constants';

const COL       = 'lager_artikel';
const LOG_COL   = 'lager_log';
const SEARCH_COL = 'lager_suche_log';
const DROP_COL  = 'lager_dropdowns';

// ─── Reference number ─────────────────────────────────────────

async function nextRefNumber(): Promise<string> {
  // Get highest existing ref number
  const q = query(collection(db, COL), orderBy('refNumber', 'desc'), limit(1));
  const snap = await getDocs(q);
  let num = 1;
  if (!snap.empty) {
    const last = snap.docs[0].data().refNumber as string;
    num = parseInt(last.replace(INVENTORY_REF_PREFIX, ''), 10) + 1;
  }
  return `${INVENTORY_REF_PREFIX}${String(num).padStart(INVENTORY_REF_DIGITS, '0')}`;
}

// ─── CRUD ─────────────────────────────────────────────────────

export interface CreateItemInput {
  name:        string;
  description: string;
  quantity:    number;
  photoFile:   File | null;
  location:    InventoryItem['location'];
  createdBy:   string;
}

export async function createInventoryItem(input: CreateItemInput): Promise<string> {
  const refNumber = await nextRefNumber();

  let photoURL: string | null = null;
  if (input.photoFile) {
    const storageRef = ref(storage, `inventory/${refNumber}/${input.photoFile.name}`);
    await uploadBytes(storageRef, input.photoFile);
    photoURL = await getDownloadURL(storageRef);
  }

  const docRef = await addDoc(collection(db, COL), {
    refNumber,
    name:        input.name,
    description: input.description,
    quantity:    input.quantity,
    photoURL,
    location:    input.location,
    createdBy:   input.createdBy,
    updatedBy:   input.createdBy,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
    active:      true,
  });

  return docRef.id;
}

export async function updateInventoryItem(
  id: string,
  changes: Partial<InventoryItem>,
  changedBy: string,
  changedByName: string,
  before: Partial<InventoryItem>,
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...changes,
    updatedBy: changedBy,
    updatedAt: serverTimestamp(),
  });

  // Write change log entries for each changed field
  for (const field of Object.keys(changes) as (keyof InventoryItem)[]) {
    if (before[field] !== changes[field]) {
      await addDoc(collection(db, LOG_COL), {
        articleId: id,
        userId:    changedBy,
        userName:  changedByName,
        field,
        before:    before[field] ?? null,
        after:     changes[field] ?? null,
        changedAt: serverTimestamp(),
      });
    }
  }
}

export async function softDeleteItem(id: string, deletedBy: string, deletedByName: string) {
  const snap = await getDoc(doc(db, COL, id));
  await updateInventoryItem(
    id,
    { active: false } as Partial<InventoryItem>,
    deletedBy,
    deletedByName,
    { active: true } as Partial<InventoryItem>,
  );
}

// ─── Search ───────────────────────────────────────────────────

export async function searchInventory(
  queryStr: string,
  userId: string,
  userName: string,
): Promise<InventoryItem[]> {
  // Firestore doesn't support full-text search natively — we fetch all active
  // items and filter client-side. For large catalogs, replace with Algolia/Typesense.
  const q = query(collection(db, COL), where('active', '==', true));
  const snap = await getDocs(q);
  const lower = queryStr.toLowerCase();

  const results = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as InventoryItem))
    .filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower) ||
        item.refNumber.toLowerCase().includes(lower) ||
        item.location.room.toLowerCase().includes(lower) ||
        item.location.storage.toLowerCase().includes(lower),
    );

  // Log the search
  await addDoc(collection(db, SEARCH_COL), {
    userId,
    userName,
    query:       queryStr,
    resultCount: results.length,
    searchedAt:  serverTimestamp(),
  });

  return results;
}

// ─── Paginated list ───────────────────────────────────────────

export async function listInventory(
  pageSize = 20,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{ items: InventoryItem[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    collection(db, COL),
    where('active', '==', true),
    orderBy('refNumber', 'asc'),
    limit(pageSize),
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
  return { items, lastDoc: snap.docs[snap.docs.length - 1] ?? null };
}

// ─── Change log ───────────────────────────────────────────────

export async function getChangeLogs(articleId: string): Promise<InventoryChangeLog[]> {
  const q = query(
    collection(db, LOG_COL),
    where('articleId', '==', articleId),
    orderBy('changedAt', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryChangeLog));
}

export async function getAllSearchLogs(): Promise<InventorySearchLog[]> {
  const q = query(
    collection(db, SEARCH_COL),
    orderBy('searchedAt', 'desc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventorySearchLog));
}

// ─── Dropdowns ────────────────────────────────────────────────

export async function getDropdowns(): Promise<Record<string, string[]>> {
  const snap = await getDocs(collection(db, DROP_COL));
  const result: Record<string, string[]> = { rooms: [], storage: [], shelves: [] };
  snap.forEach((d) => {
    result[d.id] = (d.data() as InventoryDropdownSet).options;
  });
  return result;
}

export async function updateDropdowns(id: string, options: string[]) {
  await updateDoc(doc(db, DROP_COL, id), { options, updatedAt: serverTimestamp() });
}
