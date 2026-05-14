import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseAdminClient?: SupabaseClient | null;
};

export function isSupabaseTranscriptStoreConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseTranscriptStoreConfigured()) {
    return null;
  }

  if (globalForSupabase.__supabaseAdminClient === undefined) {
    globalForSupabase.__supabaseAdminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return globalForSupabase.__supabaseAdminClient;
}
