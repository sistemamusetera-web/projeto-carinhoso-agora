import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseAdminClient() {
  // 1. Prioriza variáveis de ambiente do Lovable Cloud
  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 2. Fallback dinâmico: Se não houver service_role (ambiente pausado), 
  // tentamos usar as chaves do ambiente VITE injetadas no deploy
  if (!url) url = process.env.VITE_SUPABASE_URL;
  if (!key) key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/**
 * Cliente Supabase com privilégios de admin (service_role).
 * Resiliente a reinicializações de ambiente e falhas de variáveis.
 */
export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop, receiver) {
    // Tenta (re)inicializar se estiver nulo ou se as variáveis podem ter mudado
    if (!_supabaseAdmin) {
      _supabaseAdmin = createSupabaseAdminClient();
    }
    
    if (!_supabaseAdmin) {
      // Retorna um objeto que lança erro explicativo ao ser chamado
      return (...args: any[]) => {
        throw new Error("O banco de dados (Lovable Cloud) está inacessível. Certifique-se de que ele não está PAUSADO no painel do Lovable.");
      };
    }
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
