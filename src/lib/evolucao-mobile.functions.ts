import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gerarEvolucaoGemini } from "@/lib/gemini/service";

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
  .inputValidator((input) => z.object({
    pacienteId: z.string().uuid().nullable().optional(),
    pacienteNome: z.string().min(1).max(255),
    nota: z.string().max(8000).default(""),
    campos: z.array(z.string().min(1).max(120)).min(1).max(20),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = await getSupabaseAdmin();

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

    const geminiResp = await gerarEvolucaoGemini({
      apiKey: (cfg as any)?.gemini_api_key ?? "",
      campos: data.campos,
      nota: data.nota,
      perfil: paciente.perfil,
      objetivos: paciente.objetivos,
      terapeuta: {
        nome: cfg?.terapeuta_nome ?? "",
        conselho: cfg?.terapeuta_conselho ?? "",
        especialidade: cfg?.terapeuta_especialidade ?? "",
      }
    });

    const { data: evo } = await supabaseAdmin
      .from("evolucoes")
      .insert({
        user_id: userId,
        paciente_id: paciente.id,
        conteudo: geminiResp.consolidado,
        origem: "mobile-pwa",
      })
      .select()
      .single();

    return {
      campos: geminiResp.campos,
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
