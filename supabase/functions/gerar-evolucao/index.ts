// Edge function: gera evolução terapêutica via Lovable AI Gateway
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { paciente, historico, systemPrompt, modelo } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const sys = systemPrompt ?? "Você é um assistente terapêutico especializado em evoluções clínicas.";
    const userMsg = `
PERFIL DO PACIENTE:
${paciente?.perfil || "(não informado)"}

OBJETIVOS TERAPÊUTICOS:
${paciente?.objetivos || "(não definidos)"}

HISTÓRICO RECENTE (últimas sessões):
${(historico ?? []).map((h: string, i: number) => `[${i + 1}] ${h}`).join("\n\n") || "(sem histórico)"}

ESTILO: ${paciente?.estilo || "descritivo"}

TAREFA:
Gere uma evolução terapêutica profissional para a sessão de hoje, estruturada com:
Descrição da sessão, Recursos utilizados, Comportamento, Respostas terapêuticas,
Participação, Plano aplicado, Observações e Próximos objetivos.
Não invente dados clínicos. Mantenha coerência com sessões anteriores. Evite repetição literal.
Saída: apenas o texto da evolução.
`.trim();

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo ?? "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite temporário atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados no workspace Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error", resp.status, text);
      return new Response(JSON.stringify({ error: "Falha ao gerar evolução" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const evolucao = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ evolucao }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
