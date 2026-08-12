import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CAMPOS_PADRAO } from "@/lib/templates-evolucao";
import { gerarEvolucaoGemini } from "@/lib/gemini/service";

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
          console.log("[Extension Generate] Validating key hash:", hash);
          
          let query = supabaseAdmin.from("api_keys").select("id, user_id").eq("key_hash", hash);

          // Se estivermos em um ambiente de desenvolvimento ou com Supabase externo configurado no process.env
          // o supabaseAdmin usará as chaves do ambiente.
          const { data: keyRow, error: keyError } = await query.maybeSingle();

          if (keyError) {
            console.error("[Extension Generate] Supabase Error:", keyError);
            return json({ 
              error: `Erro de conexão com o banco de dados: ${keyError.message}. Se você usa Supabase Externo, verifique se o projeto não está pausado.` 
            }, 500);
          }
          if (!keyRow) {
            console.warn("[Extension Generate] Key not found for hash:", hash);
            return json({ error: "Chave API não encontrada ou inválida. Gere uma nova chave nas Configurações." }, 401);
          }

          const userId = keyRow.user_id;
          let body = {};
          try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
          } catch (e) {
            console.error("[Extension API] JSON Parse Error:", e);
          }
          const pacienteNome: string = (body.pacienteNome ?? "").toString().trim();
          const pacienteIdExterno: string | null = body.pacienteIdExterno
            ? body.pacienteIdExterno.toString()
            : null;
          if (!pacienteNome) return json({ error: "pacienteNome obrigatório" }, 400);

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

          const { data: cfg } = await supabaseAdmin
            .from("prompt_config")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          const geminiResp = await gerarEvolucaoGemini({
            apiKey: (cfg as any)?.gemini_api_key ?? "",
            campos: CAMPOS_PADRAO,
            nota: typeof body.nota === "string" ? body.nota : "",
            perfil: paciente.perfil,
            objetivos: paciente.objetivos,
            terapeuta: {
              nome: cfg?.terapeuta_nome ?? "",
              conselho: cfg?.terapeuta_conselho ?? "",
              especialidade: cfg?.terapeuta_especialidade ?? "",
            }
          });

          const { data: evo, error: evoErr } = await supabaseAdmin
            .from("evolucoes")
            .insert({
              user_id: userId,
              paciente_id: paciente.id,
              conteudo: geminiResp.consolidado,
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
            evolucao: geminiResp.consolidado,
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
