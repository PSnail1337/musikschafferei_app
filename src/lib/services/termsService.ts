import {
  collection, getDocs, doc, setDoc, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import type { TermsDocument, TermsDocumentKey } from '@/lib/models/terms';

const COL = 'nutzungsbedingungen';

export const TERMS_DOCS: { id: TermsDocumentKey; label: string }[] = [
  { id: 'agb-de',          label: 'AGB (Deutsch)' },
  { id: 'agb-en',          label: 'AGB (English)' },
  { id: 'hausordnung-de',  label: 'Hausordnung (Deutsch)' },
  { id: 'hausordnung-en',  label: 'Hausordnung (English)' },
];

export async function getAllTermsDocs(): Promise<TermsDocument[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => d.data() as TermsDocument);
}

export async function getTermsDoc(id: TermsDocumentKey): Promise<TermsDocument | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? (snap.data() as TermsDocument) : null;
}

export async function uploadTermsDoc(
  id: TermsDocumentKey,
  file: File,
  uploadedBy: string,
  sendEmail: boolean,
): Promise<void> {
  const storageRef = ref(storage, `terms/${id}.pdf`);
  await uploadBytes(storageRef, file);
  const pdfURL = await getDownloadURL(storageRef);

  const existing = await getTermsDoc(id);
  const version  = (existing?.version ?? 0) + 1;

  const label = TERMS_DOCS.find((t) => t.id === id)?.label ?? id;
  const locale = id.endsWith('-en') ? 'en' : 'de';

  await setDoc(doc(db, COL, id), {
    id,
    label,
    locale,
    pdfURL,
    version,
    uploadedBy,
    uploadedAt:       serverTimestamp(),
    emailSentOnUpload: sendEmail,
  });

  // Trigger mass email if requested (via API route)
  if (sendEmail) {
    await fetch('/api/email/terms-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ docId: id, version, label }),
    });
  }
}
