'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Square, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { createTicket } from '@/lib/services/supportService';
import { useAuthStore } from '@/store/authStore';
import type { TicketType } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';

interface Props {
  onClose:   () => void;
  onCreated: () => void;
}

export function TicketCreateSheet({ onClose, onCreated }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);

  const [type, setType]       = useState<TicketType>('feedback');
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setVoiceBlob(blob);
      setVoiceUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !fbUser) return;
    if (!message.trim() && !voiceBlob) {
      toast.error('Bitte schreibe eine Nachricht oder nimm eine Sprachnachricht auf.');
      return;
    }

    setLoading(true);
    try {
      await createTicket({
        userId:    fbUser.uid,
        userEmail: profile.email,
        userName:  profile.displayName,
        type,
        message:   message.trim(),
        voiceBlob,
      });
      toast.success('Ticket erstellt!');
      onCreated();
    } catch {
      toast.error('Ticket konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center"
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
            <h2 className="text-lg font-bold text-text-primary">Neues Ticket</h2>
            <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[55vh]">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              {(['feedback', 'reklamation'] as TicketType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-[10px] py-2.5 text-sm font-semibold border-2 transition-all capitalize',
                    type === t
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border text-text-secondary hover:border-border/80',
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Text message */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-1.5">
                <MessageSquare className="w-4 h-4" />Nachricht
              </label>
              <textarea
                className="input-base resize-none"
                rows={4}
                placeholder="Beschreibe dein Anliegen…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Voice recording */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Oder Sprachnachricht
              </label>
              <div className="flex items-center gap-3">
                {!recording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="btn-secondary flex-shrink-0"
                  >
                    <Mic className="w-4 h-4 text-danger" />
                    Aufnehmen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="btn-danger flex-shrink-0 animate-pulse"
                  >
                    <Square className="w-4 h-4" />
                    Stopp
                  </button>
                )}
                {voiceUrl && (
                  <audio controls src={voiceUrl} className="flex-1 h-8" />
                )}
              </div>
            </div>

          </div>
          <div className="px-5 py-4 border-t border-border">
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Senden…' : 'Ticket senden'}
            </button>
          </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
