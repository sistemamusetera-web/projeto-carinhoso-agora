import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseAdminClient() {
  // Prioriza variáveis de ambiente do Lovable Cloud
  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fallback para URL mock/exemplo apenas se absolutamente nada estiver definido (evita crash imediato)
  if (!url || !key) {
    console.warn(`[Supabase Admin] Variáveis ausentes. URL: ${!!url}, Key: ${!!key}. Verifique se o banco de dados Lovable Cloud está ativo.`);
    
    // Se não temos a chave service_role, não há muito o que fazer para operações ADMIN
    // Mas não jogamos erro aqui para permitir que o Proxy seja criado
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
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    if (!_supabaseAdmin) {
      throw new Error("O banco de dados do Lovable Cloud parece estar pausado ou não configurado. Por favor, reinicie o banco no painel.");
    }
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
