import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  pacienteId: z.string().uuid().nullable().optional(),
  pacienteNome: z.string().min(1).max(255),
  nota: z.string().max(8000).default(""),
  campos: z.array(z.string().min(1).max(120)).min(1).max(20),
});

export const listarPacientesMobile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nome, perfil, objetivos")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return { pacientes: data ?? [] };
  });

export const obterTerapeutaMobile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("prompt_config")
      .select("terapeuta_nome, terapeuta_conselho, terapeuta_especialidade")
      .maybeSingle();
    return {
      nome: data?.terapeuta_nome ?? "",
      conselho: data?.terapeuta_conselho ?? "",
      especialidade: data?.terapeuta_especialidade ?? "",
    };
  });

export const gerarEvolucaoMobile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Resolve / cria paciente usando admin (já validamos user via middleware)
    let paciente: any = null;
    if (data.pacienteId) {
      const { data: p } = await supabaseAdmin
        .from("pacientes")
        .select("*")
        .eq("user_id", userId)
        .eq("id", data.pacienteId)
        .maybeSingle();
      paciente = p;
    }
    if (!paciente) {
      const { data: p } = await supabaseAdmin
        .from("pacientes")
        .select("*")
        .eq("user_id", userId)
        .ilike("nome", data.pacienteNome)
        .maybeSingle();
      paciente = p;
    }
    if (!paciente) {
      const { data: novo, error } = await supabaseAdmin
        .from("pacientes")
        .insert({ user_id: userId, nome: data.pacienteNome })
        .select()
        .single();
      if (error) throw new Error(error.message);
      paciente = novo;
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
      .limit(3);
    const historico = (hist ?? []).map((h) => (h.conteudo ?? "").slice(0, 1200)).reverse();

    const baseSys =
      cfg?.system_prompt ??
      "Você é um assistente terapêutico especializado em evoluções clínicas.";
    const modelo = cfg?.modelo ?? "google/gemini-3.1-flash-lite";
    const estilo = paciente.estilo || cfg?.estilo_padrao || "descritivo";

    const sys = `${baseSys}

MODO PREENCHIMENTO OBRIGATÓRIO:
- O terapeuta envia notas curtas, telegráficas ou tópicos rápidos.
- EXPANDA essas notas em texto clínico profissional, rico, para CADA campo.
- Use perfil, objetivos e histórico do paciente para inferir desdobramentos coerentes.
- NUNCA invente fatos novos (diagnósticos, medicações, eventos, pessoas).
- É PROIBIDO devolver campos vazios, "-", "N/A" ou frases curtas. Mínimo 3 frases (~40 palavras) por campo.
- Mantenha coerência entre todos os campos.
- Estilo: ${estilo}.
- Você DEVE responder usando a função "preencher_evolucao" com EXATAMENTE estas chaves: ${data.campos.map((c) => JSON.stringify(c)).join(", ")}.

CONTEXTO DO PACIENTE:
Nome: ${paciente.nome}
Perfil: ${paciente.perfil || "(não informado)"}
Objetivos terapêuticos: ${paciente.objetivos || "(não definidos)"}

HISTÓRICO RECENTE:
${historico.length ? historico.map((h, i) => `[Sessão ${i + 1}]\n${h}`).join("\n\n") : "(sem histórico)"}`;

    const properties: Record<string, any> = {};
    for (const c of data.campos) {
      properties[c] = {
        type: "string",
        minLength: 40,
        description: `Texto clínico OBRIGATÓRIO para "${c}". Mínimo 3 frases. NUNCA vazio.`,
      };
    }
    const tools = [
      {
        type: "function",
        function: {
          name: "preencher_evolucao",
          description: "Preenche cada campo do formulário de evolução.",
          parameters: {
            type: "object",
            properties,
            required: data.campos,
            additionalProperties: false,
          },
        },
      },
    ];

    const messages = [
      { role: "system", content: sys },
      {
        role: "user",
        content: data.nota.trim()
          ? `Notas da sessão de hoje:\n${data.nota}`
          : "Gere a evolução com base no perfil e histórico do paciente, mantendo coerência clínica.",
      },
    ];

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

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
          max_tokens: 2500,
        }),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === "AbortError") throw new Error("A IA demorou demais. Tente novamente.");
      throw new Error(`Falha ao chamar IA: ${e?.message ?? e}`);
    }
    clearTimeout(timer);

    if (!aiResp.ok) {
      if (aiResp.status === 429) throw new Error("Limite temporário atingido. Tente novamente em instantes.");
      if (aiResp.status === 402) throw new Error("Créditos esgotados no workspace Lovable AI.");
      throw new Error(`Falha ao gerar evolução (HTTP ${aiResp.status}).`);
    }

    const ai = await aiResp.json();
    const toolCall = ai.choices?.[0]?.message?.tool_calls?.[0];
    let camposOut: Record<string, string> = {};
    if (toolCall?.function?.arguments) {
      try {
        camposOut = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new Error("Resposta da IA inválida.");
      }
    }
    if (!Object.keys(camposOut).length) throw new Error("IA não retornou campos preenchidos.");

    const consolidado = Object.entries(camposOut)
      .map(([k, v]) => `## ${k}\n${v}`)
      .join("\n\n");

    const { data: evo } = await supabaseAdmin
      .from("evolucoes")
      .insert({
        user_id: userId,
        paciente_id: paciente.id,
        conteudo: consolidado,
        origem: "mobile-pwa",
      })
      .select()
      .single();

    return {
      campos: camposOut,
      evolucaoId: evo?.id ?? null,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      terapeuta: {
        nome: cfg?.terapeuta_nome ?? "",
        conselho: cfg?.terapeuta_conselho ?? "",
        especialidade: cfg?.terapeuta_especialidade ?? "",
      },
      dataAtual: new Date().toISOString(),
    };
  });
