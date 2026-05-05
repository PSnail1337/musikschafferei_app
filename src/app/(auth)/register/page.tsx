'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils/cn';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      router.replace('/booking');
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code;
      if (msg === 'auth/email-already-in-use') {
        setError('Diese E-Mail ist bereits vergeben.');
      } else {
        setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-surface-2">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-4 shadow-card-md">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Konto erstellen</h1>
          <p className="text-sm text-text-secondary mt-1">musicmaker · Musikschafferei Linz</p>
        </div>

        <div className="card p-6 shadow-card-md">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Name
              </label>
              <input
                type="text"
                className="input-base"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                E-Mail
              </label>
              <input
                type="email"
                className="input-base"
                placeholder="deine@email.at"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Passwort
              </label>
              <input
                type="password"
                className="input-base"
                placeholder="Mindestens 8 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Passwort bestätigen
              </label>
              <input
                type="password"
                className="input-base"
                placeholder="Wiederholen"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-sm text-danger font-medium">{error}</p>
            )}

            <button
              type="submit"
              className={cn('btn-primary w-full', loading && 'opacity-60 cursor-not-allowed')}
              disabled={loading}
            >
              {loading ? 'Bitte warten…' : 'Konto erstellen'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-text-secondary">
          Bereits registriert?{' '}
          <Link href="/login" className="text-brand-500 font-semibold hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
