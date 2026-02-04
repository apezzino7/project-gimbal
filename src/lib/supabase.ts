import { createClient } from '@supabase/supabase-js';
import { STORAGE_KEYS } from '../constants/app';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local file.');
}

if (!supabaseUrl.startsWith('http')) {
  throw new Error('Invalid VITE_SUPABASE_URL format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // PKCE flow for enhanced security
    storage: window.localStorage,
    storageKey: STORAGE_KEYS.AUTH_TOKEN,
  }
});
