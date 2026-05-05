'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Upload, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllTermsDocs, uploadTermsDoc, TERMS_DOCS } from '@/lib/services/termsService';
import { useAuthStore } from '@/store/authStore';
import { isMainMaster } from '@/lib/utils/roleUtils';
import type { TermsDocument, TermsDocumentKey } from '@/lib/models/terms';
import { cn } from '@/lib/utils/cn';

export default function TermsPage() {
  const profile    = useAuthStore((s) => s.profile);
  const [docs, setDocs]       = useState<Map<string, TermsDocument>>(new Map());
  const [activeId, setActiveId] = useState<TermsDocumentKey>('agb-de');
  const [loading, setLoading]  = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  const canUpload = profile ? isMainMaster(profile.role) : false;

  useEffect(() => {
    getAllTermsDocs().then((all) => {
      const map = new Map(all.map((d) => [d.id, d]));
      setDocs(map);
      setLoading(false);
    });
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      await uploadTermsDoc(activeId, file, profile.uid, sendEmail);
      toast.success('Dokument erfolgreich hochgeladen!');
      const all = await getAllTermsDocs();
      setDocs(new Map(all.map((d) => [d.id, d])));
    } catch {
      toast.error('Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
    }
  }

  const activeDoc = docs.get(activeId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Document tabs */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 pb-1">
        {TERMS_DOCS.map((t) => {
          const doc = docs.get(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                'flex-shrink-0 px-4 py-2.5 rounded-[10px] text-sm font-medium border-2 transition-all',
                t.id === activeId
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                  : 'border-border text-text-secondary hover:border-border/80',
              )}
            >
              {t.label}
              {doc?.version && (
                <span className="ml-1.5 text-[10px] text-text-tertiary">v{doc.version}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* PDF viewer */}
      <div className="card flex-1 min-h-[55vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeDoc?.pdfURL ? (
          <>
            {/* Actions row */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <FileText className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-medium text-text-primary flex-1 truncate">
                {activeDoc.label}
              </span>
              <a
                href={activeDoc.pdfURL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost py-1.5 px-3 text-sm"
              >
                <Download className="w-4 h-4" />
                Laden
              </a>
            </div>

            {/* Inline PDF iframe */}
            <iframe
              src={`${activeDoc.pdfURL}#view=FitH`}
              className="flex-1 w-full border-0"
              title={activeDoc.label}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <AlertCircle className="w-10 h-10 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              Kein Dokument hochgeladen.{' '}
              {canUpload ? 'Lade unten eine PDF-Datei hoch.' : 'Kontakt mit dem Main-Master aufnehmen.'}
            </p>
          </div>
        )}
      </div>

      {/* Upload panel (Main-Master only) */}
      {canUpload && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Dokument hochladen
          </h3>

          <label className="flex items-center justify-center w-full h-12 rounded-[10px] border-2 border-dashed border-border bg-surface-2 cursor-pointer hover:border-brand-500 transition-colors">
            <span className="text-sm text-text-secondary">
              {uploading ? 'Hochladen…' : 'PDF auswählen'}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-sm text-text-secondary">
              Alle Mitglieder per E-Mail informieren
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
