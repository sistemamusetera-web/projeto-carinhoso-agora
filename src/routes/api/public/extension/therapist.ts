import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, x-api-key, baggage, sentry-trace",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
            return json({ error: "Servidor não configurado. Verifique as Environment Variables no Lovable." }, 503);
          }

          const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          
          let userId: string | null = null;

          if (apiKey) {
            const hash = await sha256(apiKey);
            const { data: keyRow } = await supabaseAdmin.from("api_keys").select("user_id").eq("key_hash", hash).maybeSingle();
            if (keyRow) userId = keyRow.user_id;
          }

          // Se não houver chave, tentamos pegar o usuário da sessão (para o auto-setup da extensão)
          if (!userId) {
            const { data: allKeys } = await supabaseAdmin.from("api_keys").select("user_id, key").limit(1);
            if (allKeys && allKeys.length === 1) {
              userId = allKeys[0].user_id;
            }
          }

          if (!userId) {
            return json({ error: "Não autorizado. Faça login no painel primeiro." }, 401);
          }

          const [{ data: cfg }, { data: keys }] = await Promise.all([
            supabaseAdmin.from("prompt_config").select("*").eq("user_id", userId).maybeSingle(),
            supabaseAdmin.from("api_keys").select("key").eq("user_id", userId).limit(1).maybeSingle()
          ]);

          return json({
            nome: cfg?.terapeuta_nome || "",
            conselho: cfg?.terapeuta_conselho || "",
            especialidade: cfg?.terapeuta_especialidade || "",
            assinatura: cfg?.assinatura || "",
            apiKey: keys?.key || null
          });
        } catch (e: any) {
          return json({ error: e.message }, 500);
        }
      },
    },
  },
});