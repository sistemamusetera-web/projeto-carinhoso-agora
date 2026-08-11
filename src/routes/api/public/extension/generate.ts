import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CAMPOS_PADRAO } from "@/lib/templates-evolucao";
import { consolidarEvolucao, gerarEvolucaoLocal } from "@/lib/evolucao-local";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
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

export const Route = createFileRoute("/api/public/extension/generate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const apiKey =
            request.headers.get("x-api-key") ??
            request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
            "";
          if (!apiKey) return json({ error: "API key ausente" }, 401);

          const hash = await sha256(apiKey);
          const { data: keyRow } = await supabaseAdmin
            .from("api_keys")
            .select("id, user_id")
            .eq("key_hash", hash)
            .maybeSingle();
          if (!keyRow) return json({ error: "API key inválida" }, 401);

          const userId = keyRow.user_id;
          const body = await request.json().catch(() => ({}));
          const pacienteNome: string = (body.pacienteNome ?? "").toString().trim();
          const pacienteIdExterno: string | null = body.pacienteIdExterno
            ? body.pacienteIdExterno.toString()
            : null;
          if (!pacienteNome) return json({ error: "pacienteNome obrigatório" }, 400);

          // Busca paciente por nome_externo_id ou nome
          let paciente: any = null;
          if (pacienteIdExterno) {
            const { data } = await supabaseAdmin
              .from("pacientes")
              .select("*")
              .eq("user_id", userId)
              .eq("nome_externo_id", pacienteIdExterno)
              .maybeSingle();
            paciente = data;
          }
          if (!paciente) {
            const { data } = await supabaseAdmin
              .from("pacientes")
              .select("*")
              .eq("user_id", userId)
              .ilike("nome", pacienteNome)
              .maybeSingle();
            paciente = data;
          }
          if (!paciente) {
            const { data: novo, error: insErr } = await supabaseAdmin
              .from("pacientes")
              .insert({
                user_id: userId,
                nome: pacienteNome,
                nome_externo_id: pacienteIdExterno,
              })
              .select()
              .single();
            if (insErr) return json({ error: insErr.message }, 500);
            paciente = novo;
          } else if (pacienteIdExterno && !paciente.nome_externo_id) {
            await supabaseAdmin
              .from("pacientes")
              .update({ nome_externo_id: pacienteIdExterno })
              .eq("id", paciente.id);
          }

          const campos = gerarEvolucaoLocal({
            campos: CAMPOS_PADRAO,
            nota: typeof body.nota === "string" ? body.nota : "",
            perfil: paciente.perfil,
            objetivos: paciente.objetivos,
          });
          const evolucao = consolidarEvolucao(campos);

          const { data: evo, error: evoErr } = await supabaseAdmin
            .from("evolucoes")
            .insert({
              user_id: userId,
              paciente_id: paciente.id,
              conteudo: evolucao,
              origem: "extensao",
            })
            .select()
            .single();
          if (evoErr) return json({ error: evoErr.message }, 500);

          await supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);

          return json({
            evolucao,
            evolucaoId: evo.id,
            pacienteId: paciente.id,
            pacienteNome: paciente.nome,
          });
        } catch (e) {
          console.error(e);
          return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
        }
      },
    },
  },
});
