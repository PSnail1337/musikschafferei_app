'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { createInventoryItem, getDropdowns } from '@/lib/services/inventoryService';
import { useAuthStore } from '@/store/authStore';

interface Props {
  onClose:   () => void;
  onCreated: () => void;
}

export function InventoryAddSheet({ onClose, onCreated }: Props) {
  const profile = useAuthStore((s) => s.profile);

  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [photo, setPhoto]         = useState<File | null>(null);
  const [photoPreview, setPreview] = useState<string | null>(null);
  const [room, setRoom]           = useState('');
  const [storageArea, setStorage] = useState('');
  const [shelf, setShelf]         = useState('');
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    getDropdowns().then(setDropdowns);
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      await createInventoryItem({
        name,
        description,
        quantity,
        photoFile:  photo,
        location:   { room, storage: storageArea, shelf },
        createdBy:  profile.uid,
      });
      toast.success('Artikel hinzugefügt!');
      onCreated();
    } catch {
      toast.error('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative w-full max-w-lg bg-surface rounded-t-[24px] shadow-card-lg pb-safe"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Artikel hinzufügen</h2>
            <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Photo upload */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Foto (optional)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-[12px] border-2 border-dashed border-border bg-surface-2 cursor-pointer hover:border-brand-500 transition-colors overflow-hidden">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Vorschau" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-tertiary">
                    <Upload className="w-6 h-6" />
                    <span className="text-xs">Bild auswählen</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">Name *</label>
              <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">Beschreibung</label>
              <textarea className="input-base resize-none" rows={2} value={description} onChange={(e) => setDesc(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">Menge *</label>
              <input type="number" min={0} className="input-base" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>

            {/* Location dropdowns */}
            <div className="grid grid-cols-3 gap-2">
              {(['rooms', 'storage', 'shelves'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1 capitalize">
                    {key === 'rooms' ? 'Raum' : key === 'storage' ? 'Lagerort' : 'Regal'}
                  </label>
                  <select
                    className="input-base text-sm"
                    value={key === 'rooms' ? room : key === 'storage' ? storageArea : shelf}
                    onChange={(e) => {
                      if (key === 'rooms') setRoom(e.target.value);
                      else if (key === 'storage') setStorage(e.target.value);
                      else setShelf(e.target.value);
                    }}
                  >
                    <option value="">–</option>
                    {(dropdowns[key] ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Speichern…' : 'Artikel speichern'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
