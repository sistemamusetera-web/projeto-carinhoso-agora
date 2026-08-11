export type EvolucaoLocalInput = {
  campos: string[];
  nota?: string;
  perfil?: string | null;
  objetivos?: string | null;
};

const categorias: Array<{ termos: string[]; campos: string[] }> = [
  { termos: ["instrument", "percuss", "violão", "teclado", "canç", "música", "visual", "pecs", "recurso"], campos: ["recurso", "plano"] },
  { termos: ["agitad", "regulad", "opositor", "estereotip", "comport", "ansied", "choro", "humor"], campos: ["comport", "observ"] },
  { termos: ["particip", "engaj", "intera", "contato", "iniciativa", "colabor"], campos: ["particip", "descrição", "descricao"] },
  { termos: ["respondeu", "resposta", "avanço", "pista", "imita", "comunica", "vocal"], campos: ["resposta"] },
  { termos: ["objetivo", "próxim", "proxim", "manter", "ampliar", "estimular", "reforçar"], campos: ["objetivo"] },
  { termos: ["famili", "responsável", "medicação", "intercorr", "rotina", "devolutiva"], campos: ["observ"] },
  { termos: ["abordagem", "plano", "sessão", "atividade", "proposta", "improviso", "escuta"], campos: ["descrição", "descricao", "plano"] },
];

function limpar(texto?: string | null) {
  return (texto ?? "").replace(/^\s*[-•]+\s*/gm, "").replace(/\s+/g, " ").trim();
}

function frases(texto?: string | null) {
  return limpar(texto)
    .split(/(?<=[.!?])\s+|\s*[;\n]+\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => /[.!?]$/.test(item) ? item : `${item}.`);
}

function normalizar(texto: string) {
  return texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function selecionar(campo: string, itens: string[]) {
  const campoNormalizado = normalizar(campo);
  const termos = categorias
    .filter((categoria) => categoria.campos.some((nome) => campoNormalizado.includes(normalizar(nome))))
    .flatMap((categoria) => categoria.termos.map(normalizar));
  return itens.filter((item) => termos.some((termo) => normalizar(item).includes(termo)));
}

function complemento(campo: string, perfil: string, objetivos: string) {
  const nome = normalizar(campo);
  if (nome.includes("objetivo")) {
    return objetivos ? `A continuidade terapêutica seguirá os objetivos registrados: ${objetivos}.` : "Será mantida a continuidade das estratégias já registradas no plano terapêutico.";
  }
  if (nome.includes("observ")) return "O registro foi elaborado exclusivamente a partir das informações fornecidas para esta sessão.";
  if (nome.includes("recurso")) return "Os recursos selecionados foram empregados como mediadores das propostas descritas na sessão.";
  if (nome.includes("plano")) return objetivos ? `A condução permaneceu vinculada aos objetivos terapêuticos registrados: ${objetivos}.` : "A condução foi organizada de acordo com as demandas registradas para o atendimento.";
  if (nome.includes("resposta")) return "As respostas foram registradas conforme o desempenho observado nas propostas descritas.";
  if (nome.includes("particip")) return "A participação foi considerada ao longo das atividades e interações relatadas.";
  if (nome.includes("comport")) return "O comportamento foi acompanhado durante todo o atendimento, respeitando o ritmo apresentado.";
  return perfil ? `A condução considerou o perfil terapêutico registrado: ${perfil}.` : "A sessão foi conduzida a partir das demandas e observações registradas pelo profissional.";
}

export function gerarEvolucaoLocal(input: EvolucaoLocalInput): Record<string, string> {
  const itens = frases(input.nota);
  const perfil = limpar(input.perfil);
  const objetivos = limpar(input.objetivos);
  const base = itens.length ? itens : ["Atendimento realizado conforme o planejamento terapêutico registrado."];

  return Object.fromEntries(input.campos.map((campo) => {
    const relacionados = selecionar(campo, base);
    const escolhidos = (relacionados.length ? relacionados : base).slice(0, 3);
    const texto = [...new Set([...escolhidos, complemento(campo, perfil, objetivos)])].join(" ");
    return [campo, texto];
  }));
}

export function consolidarEvolucao(campos: Record<string, string>) {
  return Object.entries(campos).map(([campo, texto]) => `## ${campo}\n${texto}`).join("\n\n");
}