'use client';

import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { onAuthChange } from '@/lib/firebase/auth';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/models/user';

interface AuthState {
  firebaseUser:  User | null;
  profile:       UserProfile | null;
  loading:       boolean;
  profileLoading: boolean;

  setFirebaseUser: (user: User | null) => void;
  setProfile:      (profile: UserProfile | null) => void;
  setLoading:      (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser:   null,
  profile:        null,
  loading:        true,
  profileLoading: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setProfile:      (profile) => set({ profile }),
  setLoading:      (loading) => set({ loading }),
}));

// ─── Bootstrap: wires Firebase auth + Firestore profile listener ──

let profileUnsub: (() => void) | null = null;

export function bootstrapAuth() {
  return onAuthChange((user) => {
    useAuthStore.getState().setFirebaseUser(user);

    // Clean up previous profile listener
    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }

    if (user) {
      const ref = doc(db, 'users', user.uid);
      profileUnsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          useAuthStore.getState().setProfile(snap.data() as UserProfile);
        }
        useAuthStore.getState().setLoading(false);
      });
    } else {
      useAuthStore.getState().setProfile(null);
      useAuthStore.getState().setLoading(false);
    }
  });
}
