/**
 * Environment Configuration
 * Centralized environment variable access with validation
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

// Validate required environment variables
function validateEnv(): void {
  const missing: string[] = [];

  requiredEnvVars.forEach((key) => {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    );
  }
}

// Validate on module load
validateEnv();

/**
 * Application configuration derived from environment variables
 */
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },

  // Environment flags
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,

  // Feature flags (can be extended)
  features: {
    enableDevTools: import.meta.env.DEV,
    enableAuditLogging: true,
  },
} as const;

/**
 * Get a required environment variable
 * Throws if the variable is not set
 */
export function getEnvVar(key: RequiredEnvVar): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

export default config;
