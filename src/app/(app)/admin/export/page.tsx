'use client';

import { useState } from 'react';
import { FileOutput, Download } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

export default function ExportPage() {
  const profile  = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (!profile) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `/api/export?masterId=${profile.uid}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `buchungen-${new Date().getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export heruntergeladen!');
    } catch {
      toast.error('Export fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="card p-6 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <FileOutput className="w-8 h-8 text-heros" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary">Buchungsexport</h3>
          <p className="text-sm text-text-secondary mt-1.5">
            Alle Buchungen deines Mitgliederkreises im aktuellen Jahr als CSV herunterladen.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="btn-primary gap-2"
        >
          <Download className="w-4 h-4" />
          {loading ? 'Exportieren…' : `CSV herunterladen (${new Date().getFullYear()})`}
        </button>
      </div>
    </div>
  );
}
