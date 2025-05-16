import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Singleton pattern to maintain a single instance of the Supabase client
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null;

/**
 * Returns a singleton instance of the Supabase browser client
 * This ensures we don't create multiple instances unnecessarily
 */
export function getSupabaseBrowserClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient();
  }
  return supabaseClient;
} 