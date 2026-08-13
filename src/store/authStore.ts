import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  isInitialized: boolean;
  session: Session | null;
  userId: string | null;
  setAuthState: (session: Session | null, isInitialized?: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isInitialized: false,
  session: null,
  userId: null,
  setAuthState: (session, isInitialized = true) =>
    set({
      isInitialized,
      session,
      userId: session?.user.id ?? null,
    }),
}));
