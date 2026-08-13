import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * IMPORTANTE: Como o usuário está usando 100% Supabase Externo, 
 * o servidor precisa usar as credenciais desse banco externo para validar chaves de API.
 * Se as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não forem as do banco externo,
 * a extensão falhará ao tentar validar a chave.
 */
function createSupabaseAdminClient() {
  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(`[Supabase Admin] Variáveis críticas ausentes. URL: ${!!url}, Key: ${!!key}`);
    return null;
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: any | undefined;

export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createSupabaseAdminClient();
    }
    
    if (!_supabaseAdmin) {
      return (...args: any[]) => {
        const errorMsg = "FALHA NO SERVIDOR: O banco de dados externo não está configurado corretamente no ambiente (Service Role Key ausente).";
        console.error(errorMsg);
        throw new Error(errorMsg);
      };
    }
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
