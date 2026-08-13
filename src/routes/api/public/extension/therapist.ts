import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, x-api-key",
  "Access-Control-Max-Age": "86400",
};

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/extension/therapist")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        try {
          let supabaseAdmin;
          try {
            supabaseAdmin = await getSupabaseAdmin();
          } catch (envErr: any) {
             console.error("[Therapist API] Env Error:", envErr);
             return json({ error: "Configuração de servidor ausente (VITE_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no painel Lovable)." }, 503);
          }
          
          const apiKey =
            request.headers.get("x-api-key") ??
            request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
            "";
          if (!apiKey) return json({ error: "API key ausente" }, 401);

          const hash = await sha256(apiKey);
          console.log("[Therapist API] Validating key hash:", hash);
          
          let keyRow;
          try {
            const result = await supabaseAdmin
              .from("api_keys")
              .select("id, user_id")
              .eq("key_hash", hash)
              .maybeSingle();
            keyRow = result.data;
          } catch (e: any) {
            console.error("[Therapist API] DB Error:", e);
            return json({ error: `Erro de conexão com o banco externo. Verifique se o Supabase está ativo.` }, 503);
          }

          if (!keyRow) return json({ error: "API key inválida" }, 401);

          console.log("[Therapist API] Fetching config for user:", keyRow.user_id);
          const { data: cfg, error: cfgError } = await supabaseAdmin
            .from("prompt_config")
            .select("terapeuta_nome, terapeuta_conselho, terapeuta_especialidade")
            .eq("user_id", keyRow.user_id)
            .maybeSingle();

          if (cfgError) {
            console.error("[Therapist API] Config Fetch Error:", cfgError);
            return json({ error: `Erro ao buscar configuração: ${cfgError.message}` }, 500);
          }

          console.log("[Therapist API] Config found:", cfg ? "Yes" : "No", cfg);

          return json({
            terapeuta: {
              nome: cfg?.terapeuta_nome || "",
              conselho: cfg?.terapeuta_conselho || "",
              especialidade: cfg?.terapeuta_especialidade || "",
            },
          });
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
        }
      },
    },
  },
});
