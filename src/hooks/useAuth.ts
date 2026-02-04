import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearRememberMe } from '../utils/rememberMe';
import { auditLogger, AuditEventType } from '../utils/auditLog';
import { STORAGE_KEYS } from '../constants/app';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Only check expiration if "Remember Me" was explicitly set
      const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      const expiresAt = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES);

      // If Remember Me was set AND has expired, log out
      if (session?.user && rememberMe === 'true' && expiresAt) {
        const expirationTime = parseInt(expiresAt, 10);
        if (Date.now() > expirationTime) {
          auditLogger.log(AuditEventType.SESSION_EXPIRED, session.user.email);
          clearRememberMe();
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }
      }

      // Otherwise, keep the session active
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
