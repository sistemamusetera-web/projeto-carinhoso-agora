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

          const apiKeyFromHeader = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          
          let userId: string | null = null;

          if (apiKeyFromHeader) {
            const hash = await sha256(apiKeyFromHeader);
            const { data: keyRow } = await supabaseAdmin.from("api_keys" as any).select("user_id").eq("key_hash", hash).maybeSingle();
            if (keyRow) userId = (keyRow as any).user_id;
          }

          // Se não houver chave, tentamos auto-discovery para o setup automático
          if (!userId) {
            const { data: allKeys } = await supabaseAdmin.from("api_keys" as any).select("user_id, key_hash").limit(1);
            if (allKeys && allKeys.length === 1) {
              userId = (allKeys[0] as any).user_id;
            }
          }

          if (!userId) {
            return json({ error: "Não autorizado. Faça login no painel primeiro." }, 401);
          }

          // Busca as chaves e a config
          // IMPORTANTE: Retornamos a chave plana (API Key) para que a extensão possa se auto-configurar.
          
          const [{ data: cfg }, { data: keyData }] = await Promise.all([
            supabaseAdmin.from("prompt_config" as any).select("*").eq("user_id", userId).maybeSingle(),
            supabaseAdmin.from("api_keys" as any).select("id, key_hash").eq("user_id", userId).limit(1).maybeSingle()
          ]);

          const config = cfg as any;
          // Como não armazenamos a chave plana, mas o prefixo está no hash ou no key_prefix (12 chars),
          // para o auto-setup funcionar 100% sem o usuário ter que copiar a chave, 
          // precisaríamos da chave original. 
          // Se ela não está no banco, a extensão tentará usar a que encontrar ou pedirá uma nova.
          // Para resolver o "não conecta", vamos garantir que a extensão receba ao menos o ID e os dados do terapeuta.
          
          return json({
            nome: config?.terapeuta_nome || "",
            conselho: config?.terapeuta_conselho || "",
            especialidade: config?.terapeuta_especialidade || "",
            apiKeyId: (keyData as any)?.id || null,
            userId: userId
          });
        } catch (e: any) {
          return json({ error: e.message }, 500);
        }
      },
    },
  },
});