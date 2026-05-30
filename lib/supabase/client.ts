import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Bypass the Web Locks API to prevent lock contention when the tab is
        // inactive or in React Strict Mode double-invocations. Without this,
        // autoRefreshToken holds a Web Lock that blocks ALL Supabase operations
        // (queries, signOut, etc.) from making any network request.
        // Token refresh is handled server-side by the proxy on every navigation.
        lock: (_name, _acquireTimeout, fn) => fn(),
      },
    }
  );
  return client;
}

/**
 * Descarta el singleton para que la próxima llamada a createClient() devuelva
 * una instancia limpia. Llamar después de sign-out para evitar que un cliente
 * con sesión expirada o en estado inconsistente afecte la siguiente sesión sin
 * necesidad de recargar la página.
 */
export function resetClient(): void {
  client = undefined;
}
