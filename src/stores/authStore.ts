/**
 * Auth Store - Zustand store for authentication state
 *
 * Provides centralized auth state management with:
 * - User session tracking
 * - Remember me functionality
 * - Automatic session refresh
 * - Audit logging integration
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearRememberMe } from '../utils/rememberMe';
import { auditLogger, AuditEventType } from '../utils/auditLog';
import { STORAGE_KEYS } from '../constants/app';

// =============================================================================
// Types
// =============================================================================

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  user: null,
  session: null,
  loading: true,
  initialized: false,
};

// =============================================================================
// Store
// =============================================================================

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Initialize auth state from existing session
       * Should be called once on app mount
       */
      initialize: async () => {
        const { initialized } = get();
        if (initialized) return;

        try {
          const { data: { session } } = await supabase.auth.getSession();

          // Check Remember Me expiration
          const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
          const expiresAt = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES);

          if (session?.user && rememberMe === 'true' && expiresAt) {
            const expirationTime = parseInt(expiresAt, 10);
            if (Date.now() > expirationTime) {
              auditLogger.log(AuditEventType.SESSION_EXPIRED, session.user.email);
              clearRememberMe();
              await supabase.auth.signOut();
              set({ user: null, session: null, loading: false, initialized: true });
              return;
            }
          }

          set({
            user: session?.user ?? null,
            session: session ?? null,
            loading: false,
            initialized: true,
          });

          // Listen for auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              user: session?.user ?? null,
              session: session ?? null,
              loading: false,
            });
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ user: null, session: null, loading: false, initialized: true });
        }
      },

      /**
       * Set user directly (for external updates)
       */
      setUser: (user) => set({ user }),

      /**
       * Set session directly (for external updates)
       */
      setSession: (session) => set({
        session,
        user: session?.user ?? null,
      }),

      /**
       * Sign out user and clear state
       */
      signOut: async () => {
        const { user } = get();
        if (user) {
          auditLogger.log(AuditEventType.LOGOUT, user.email);
        }
        clearRememberMe();
        await supabase.auth.signOut();
        set({ user: null, session: null });
      },

      /**
       * Reset store to initial state
       */
      reset: () => set(initialState),
    }),
    { name: 'AuthStore' }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectUser = (state: AuthState) => state.user;
export const selectSession = (state: AuthState) => state.session;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.loading;

// =============================================================================
// Hook for backward compatibility with useAuth
// =============================================================================

/**
 * Hook that mirrors the original useAuth API
 * Use this for gradual migration, or use useAuthStore directly
 */
export function useAuth() {
  const user = useAuthStore(selectUser);
  const loading = useAuthStore(selectIsLoading);
  return { user, loading };
}
