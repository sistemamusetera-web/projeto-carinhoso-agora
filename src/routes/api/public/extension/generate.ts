import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

          // Configuração de prompt
          const { data: cfg } = await supabaseAdmin
            .from("prompt_config")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          // Histórico recente
          const { data: hist } = await supabaseAdmin
            .from("evolucoes")
            .select("conteudo")
            .eq("paciente_id", paciente.id)
            .order("created_at", { ascending: false })
            .limit(5);
          const historico = (hist ?? []).map((h) => h.conteudo).reverse();

          const sys =
            cfg?.system_prompt ??
            "Você é um assistente terapêutico especializado em evoluções clínicas.";
          const modelo = cfg?.modelo ?? "google/gemini-2.5-flash";
          const estilo = paciente.estilo || cfg?.estilo_padrao || "descritivo";

          const userMsg = `
PERFIL DO PACIENTE:
${paciente.perfil || "(não informado)"}

OBJETIVOS TERAPÊUTICOS:
${paciente.objetivos || "(não definidos)"}

HISTÓRICO RECENTE (últimas sessões):
${historico.map((h, i) => `[${i + 1}] ${h}`).join("\n\n") || "(sem histórico)"}

ESTILO: ${estilo}

TAREFA:
Gere uma evolução terapêutica profissional para a sessão de hoje, estruturada com:
Descrição da sessão, Recursos utilizados, Comportamento, Respostas terapêuticas,
Participação, Plano aplicado, Observações e Próximos objetivos.
Não invente dados clínicos. Mantenha coerência com sessões anteriores. Evite repetição literal.
Saída: apenas o texto da evolução.
`.trim();

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelo,
              messages: [
                { role: "system", content: sys },
                { role: "user", content: userMsg },
              ],
            }),
          });

          if (!aiResp.ok) {
            const text = await aiResp.text();
            console.error("AI gateway error", aiResp.status, text);
            if (aiResp.status === 429)
              return json({ error: "Limite temporário atingido. Tente novamente em instantes." }, 429);
            if (aiResp.status === 402)
              return json({ error: "Créditos esgotados no workspace Lovable AI." }, 402);
            return json({ error: "Falha ao gerar evolução" }, 500);
          }

          const data = await aiResp.json();
          const evolucao: string = data.choices?.[0]?.message?.content ?? "";

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
