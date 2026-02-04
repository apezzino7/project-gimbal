/**
 * CORS Headers for Supabase Edge Functions
 * Used to allow cross-origin requests from the frontend
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Creates a CORS-enabled response
 */
export function corsResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Creates a CORS-enabled error response
 */
export function corsErrorResponse(
  message: string,
  status = 400,
  code?: string
): Response {
  return corsResponse(
    {
      error: message,
      code: code ?? 'ERROR',
    },
    status
  );
}

/**
 * Handles OPTIONS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
