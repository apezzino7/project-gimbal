/**
 * Supabase Client for Edge Functions
 * Provides authenticated client creation for database operations
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Creates a Supabase client with the appropriate key
 * @param serviceRole - If true, uses service role key for admin operations
 */
export function createSupabaseClient(serviceRole = false): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = serviceRole
    ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    : Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates an admin Supabase client with service role key
 * Use this for operations that need to bypass RLS
 */
export function createSupabaseAdmin(): SupabaseClient {
  return createSupabaseClient(true);
}

/**
 * Verifies the JWT token and returns the user
 * @param req - The incoming request with Authorization header
 */
export async function verifyAuth(req: Request): Promise<{
  user: { id: string; email?: string } | null;
  error: string | null;
}> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message ?? 'Invalid token' };
  }

  return { user: { id: user.id, email: user.email }, error: null };
}

/**
 * Gets the authenticated user ID from the request
 * Throws if not authenticated
 */
export async function requireAuth(req: Request): Promise<string> {
  const { user, error } = await verifyAuth(req);

  if (error || !user) {
    throw new Error(error ?? 'Unauthorized');
  }

  return user.id;
}
