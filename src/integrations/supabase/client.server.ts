import { createClient } from "@supabase/supabase-js";
import { Database } from "../integrations/supabase/types";

// Note: In server functions, process.env is only available inside the handler.
// But we need a factory or a way to get the admin client.

export const createAdminClient = (url: string, key: string) => {
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const getSupabaseAdmin = async () => {
  const url = process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Configuração de banco de dados (VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY) ausente no ambiente do servidor (Lovable Settings)."
    );
  }

  // Remove trailing slash if present
  const cleanUrl = url.replace(/\/$/, "");
  return createAdminClient(cleanUrl, key);
};
