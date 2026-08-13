import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * IMPORTANTE: O usuário agora usa 100% Supabase Externo.
 * Para que o backend (extensão e IA) funcione sem o banco interno,
 * precisamos de uma Service Role Key do banco externo.
 */
function createSupabaseAdminClient(url?: string, key?: string) {
  const finalUrl = url || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const finalKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!finalUrl || !finalKey) {
    console.warn(`[Supabase Admin] Variáveis ausentes. URL: ${!!finalUrl}, Key: ${!!finalKey}.`);
    return null;
  }

  return createClient<Database>(finalUrl, finalKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: any | undefined;

export const getSupabaseAdmin = (externalUrl?: string, externalKey?: string) => {
  if (externalUrl && externalKey) {
    return createSupabaseAdminClient(externalUrl, externalKey);
  }
  
  if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
  
  if (!_supabaseAdmin) {
    return new Proxy({} as any, {
      get() {
        return () => {
          throw new Error("BANCO EXTERNO NÃO CONFIGURADO: Para usar 100% banco externo, você precisa adicionar SUPABASE_SERVICE_ROLE_KEY em 'Settings' no Lovable.");
        };
      }
    });
  }
  return _supabaseAdmin;
};

export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop, receiver) {
    const client = getSupabaseAdmin();
    return Reflect.get(client, prop, receiver);
  },
});

