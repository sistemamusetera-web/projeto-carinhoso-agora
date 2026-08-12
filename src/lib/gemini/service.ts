import { GoogleGenerativeAI } from "@google/generative-ai";
import { consolidarEvolucao, gerarEvolucaoLocal } from "../evolucao-local";

export type GeminiInput = {
  apiKey: string;
  campos: string[];
  nota: string;
  perfil?: string | null;
  objetivos?: string | null;
  estilo?: string | null;
  terapeuta?: {
    nome: string;
    conselho: string;
    especialidade: string;
  };
};

export async function gerarEvolucaoGemini(input: GeminiInput): Promise<{
  campos: Record<string, string>;
  consolidado: string;
  debug?: string;
}> {
  if (!input.apiKey) {
    const local = gerarEvolucaoLocal({
      campos: input.campos,
      nota: input.nota,
      perfil: input.perfil,
      objetivos: input.objetivos,
    });
    return { campos: local, consolidado: consolidarEvolucao(local) };
  }

  try {
    const genAI = new GoogleGenerativeAI(input.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Você é um assistente especializado em evolução de pacientes para terapeutas (psicólogos, fonoaudiólogos, musicoterapeutas, etc).
Sua tarefa é preencher os campos de uma evolução clínica baseando-se nas notas da sessão e no perfil do paciente.

DADOS DO PACIENTE:
- Nome/Perfil: ${input.perfil ?? "Não informado"}
- Objetivos Terapêuticos: ${input.objetivos ?? "Não informado"}
${input.estilo ? `- Estilo de Escrita Desejado: ${input.estilo}` : ""}

NOTAS DA SESSÃO (Rascunho do terapeuta):
"""
${input.nota}
"""

CAMPOS A PREENCHER:
${input.campos.map(c => `- ${c}`).join("\n")}

INSTRUÇÕES:
1. Responda APENAS com um objeto JSON válido, onde as chaves são os nomes dos campos solicitados e os valores são os textos gerados para cada campo.
2. O texto de cada campo deve ser profissional, ético e baseado nas notas fornecidas.
3. Se as notas não mencionarem nada sobre um campo específico, use o perfil do paciente e o contexto clínico para inferir uma descrição neutra e condizente com a evolução.
4. Mantenha a terminologia técnica adequada.
5. Não inclua Markdown ou blocos de código na resposta, apenas o JSON puro.

ASSINATURA DO TERAPEUTA (para contexto):
${input.terapeuta ? `${input.terapeuta.nome} - ${input.terapeuta.conselho} (${input.terapeuta.especialidade})` : "Não informada"}

RESPOSTA (JSON):
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const generatedCampos = JSON.parse(text);
      // Garantir que todos os campos solicitados existam
      const finalCampos: Record<string, string> = {};
      input.campos.forEach(c => {
        finalCampos[c] = generatedCampos[c] || generatedCampos[c.toLowerCase()] || "Informação não disponível para este campo.";
      });
      
      return {
        campos: finalCampos,
        consolidado: consolidarEvolucao(finalCampos)
      };
    } catch (parseErr) {
      console.error("Erro ao processar JSON do Gemini:", text, parseErr);
      throw new Error("Falha ao interpretar a resposta da IA.");
    }
  } catch (err) {
    console.error("Erro no Gemini:", err);
    // Fallback para local se a API falhar
    const local = gerarEvolucaoLocal({
      campos: input.campos,
      nota: input.nota,
      perfil: input.perfil,
      objetivos: input.objetivos,
    });
    return { 
      campos: local, 
      consolidado: consolidarEvolucao(local),
      debug: err instanceof Error ? err.message : "Erro desconhecido na API do Gemini"
    };
  }
}
