'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Singleton for use in client-side hooks/lib
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}
