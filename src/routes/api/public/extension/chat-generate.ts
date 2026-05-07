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

export const Route = createFileRoute("/api/public/extension/chat-generate")({
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
          const mensagens: Array<{ role: string; content: string }> = Array.isArray(body.mensagens)
            ? body.mensagens
            : [];
          const campos: string[] = Array.isArray(body.campos) ? body.campos.filter(Boolean) : [];
          if (!pacienteNome) return json({ error: "pacienteNome obrigatório" }, 400);
          if (!campos.length) return json({ error: "campos obrigatório" }, 400);

          // Resolve paciente
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
              .insert({ user_id: userId, nome: pacienteNome, nome_externo_id: pacienteIdExterno })
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

          const { data: hist } = await supabaseAdmin
            .from("evolucoes")
            .select("conteudo, created_at")
            .eq("paciente_id", paciente.id)
            .order("created_at", { ascending: false })
            .limit(5);
          const historico = (hist ?? []).map((h) => h.conteudo).reverse();

          const baseSys =
            cfg?.system_prompt ??
            "Você é um assistente terapêutico especializado em evoluções clínicas.";
          const modelo = cfg?.modelo ?? "google/gemini-2.5-pro";
          const estilo = paciente.estilo || cfg?.estilo_padrao || "descritivo";

          const sys = `${baseSys}

MODO EXPANSÃO INTELIGENTE:
- O terapeuta normalmente envia notas curtas, telegráficas ou tópicos rápidos.
- Sua tarefa é EXPANDIR essas notas em texto clínico profissional, rico e bem desenvolvido para CADA campo do formulário.
- Use o perfil, objetivos e histórico do paciente para inferir desdobramentos plausíveis e coerentes (linguagem, postura terapêutica, recursos típicos da abordagem).
- NUNCA invente fatos clínicos novos que mudem a história do paciente: nada de novos diagnósticos, medicações, eventos familiares, datas ou pessoas que não foram mencionadas.
- Para CADA campo do formulário, sempre produza conteúdo substantivo (3 a 8 frases, conforme o campo). Só use uma observação neutra do tipo "Sem intercorrências relevantes nesta sessão." quando realmente não houver nenhuma base para inferir.
- Mantenha coerência cruzada: descrição da sessão ↔ recursos ↔ comportamento ↔ respostas ↔ plano ↔ próximos objetivos devem contar a MESMA história.
- Evite repetir literalmente trechos do histórico; reescreva.
- Estilo: ${estilo}.
- Você DEVE responder usando a função "preencher_evolucao" com EXATAMENTE estas chaves: ${campos.map((c) => JSON.stringify(c)).join(", ")}.
- Cada valor deve ser um texto clínico profissional, direto, sem títulos repetindo o nome do campo.

CONTEXTO DO PACIENTE:
Nome: ${paciente.nome}
Perfil: ${paciente.perfil || "(não informado)"}
Objetivos terapêuticos: ${paciente.objetivos || "(não definidos)"}

HISTÓRICO RECENTE:
${historico.length ? historico.map((h, i) => `[Sessão ${i + 1}]\n${h}`).join("\n\n") : "(sem histórico)"}`;

          const properties: Record<string, any> = {};
          for (const c of campos) {
            properties[c] = { type: "string", description: `Conteúdo clínico para o campo "${c}"` };
          }

          const tools = [
            {
              type: "function",
              function: {
                name: "preencher_evolucao",
                description: "Preenche cada campo do formulário de evolução terapêutica.",
                parameters: {
                  type: "object",
                  properties,
                  required: campos,
                  additionalProperties: false,
                },
              },
            },
          ];

          const messages = [
            { role: "system", content: sys },
            ...mensagens.map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content,
            })),
          ];

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

          console.log(`[chat-generate] paciente=${paciente.nome} campos=${campos.length} modelo=${modelo}`);
          const t0 = Date.now();

          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 60000);
          let aiResp: Response;
          try {
            aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: modelo,
                messages,
                tools,
                tool_choice: { type: "function", function: { name: "preencher_evolucao" } },
                temperature: 0.6,
                max_tokens: 4000,
              }),
              signal: ctrl.signal,
            });
          } catch (e: any) {
            clearTimeout(timer);
            if (e?.name === "AbortError") return json({ error: "IA demorou demais (>60s). Tente novamente." }, 504);
            return json({ error: `Falha ao chamar IA: ${e?.message ?? e}` }, 500);
          }
          clearTimeout(timer);
          console.log(`[chat-generate] AI respondeu em ${Date.now() - t0}ms status=${aiResp.status}`);

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
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          let camposOut: Record<string, string> = {};
          if (toolCall?.function?.arguments) {
            try { camposOut = JSON.parse(toolCall.function.arguments); }
            catch { return json({ error: "Resposta da IA inválida" }, 500); }
          } else {
            // fallback: tenta JSON em content
            const content = data.choices?.[0]?.message?.content ?? "";
            try {
              const m = content.match(/\{[\s\S]*\}/);
              if (m) camposOut = JSON.parse(m[0]);
            } catch { /* ignore */ }
          }

          if (!Object.keys(camposOut).length) {
            return json({ error: "IA não retornou campos preenchidos" }, 500);
          }

          const consolidado = Object.entries(camposOut)
            .map(([k, v]) => `## ${k}\n${v}`)
            .join("\n\n");

          const { data: evo } = await supabaseAdmin
            .from("evolucoes")
            .insert({
              user_id: userId,
              paciente_id: paciente.id,
              conteudo: consolidado,
              origem: "extensao-chat",
            })
            .select()
            .single();

          await supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);

          return json({
            campos: camposOut,
            evolucaoId: evo?.id,
            pacienteId: paciente.id,
            pacienteNome: paciente.nome,
            terapeuta: {
              nome: cfg?.terapeuta_nome ?? "",
              conselho: cfg?.terapeuta_conselho ?? "",
              especialidade: cfg?.terapeuta_especialidade ?? "",
            },
            dataAtual: new Date().toISOString(),
          });
        } catch (e) {
          console.error(e);
          return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
        }
      },
    },
  },
});
