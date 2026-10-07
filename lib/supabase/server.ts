import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseUrl, supabaseKey } from './env';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        // Server Components cannot set cookies; the proxy refreshes the session instead.
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
      },
    },
  });
}
