import type { Timestamp } from 'firebase/firestore';

export type TermsDocumentKey = 'agb-de' | 'agb-en' | 'hausordnung-de' | 'hausordnung-en';

export interface TermsDocument {
  id:        TermsDocumentKey;
  label:     string;       // Display label, e.g. "AGB (Deutsch)"
  locale:    'de' | 'en';
  pdfURL:    string;       // Firebase Storage URL
  version:   number;
  uploadedBy: string;
  uploadedAt: Timestamp;
  /** If true, an email was sent to all users on last upload */
  emailSentOnUpload: boolean;
}
