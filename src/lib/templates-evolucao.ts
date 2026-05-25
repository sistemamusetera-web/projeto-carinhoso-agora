// Templates de evolução compartilhados entre a extensão Chrome e a versão mobile.
// Mantidos em sincronia com extension/content.js (constante TEMPLATES).

export type TemplateItem = { label: string; frase: string };
export type TemplateGrupo = {
  grupo: string;
  icone: string;
  key: string;
  cor: string;
  itens: TemplateItem[];
};

export const TEMPLATES: TemplateGrupo[] = [
  {
    grupo: "Comunicação", icone: "💬", key: "comunicacao", cor: "#2563eb",
    itens: [
      { label: "Paciente verbal", frase: "Paciente apresentou-se de forma verbal, comunicando-se por meio de fala funcional durante a sessão." },
      { label: "Paciente não-verbal", frase: "Paciente não-verbal, comunicando-se por meio de gestos, expressões faciais e vocalizações." },
      { label: "Trocas vocais", frase: "Estabeleceu trocas vocais com a terapeuta, alternando emissões em padrão dialógico." },
      { label: "Uso de CAA (PECS)", frase: "Utilizou recursos de Comunicação Alternativa e Aumentativa (PECS/pranchas) para sustentar a interação." },
      { label: "Iniciativa comunicativa", frase: "Apresentou iniciativa comunicativa espontânea, dirigindo solicitações e comentários à terapeuta." },
    ],
  },
  {
    grupo: "Chegada", icone: "🚪", key: "chegada", cor: "#d97706",
    itens: [
      { label: "Chegou tranquilo", frase: "Chegou ao atendimento de forma tranquila, calmo e receptivo ao acolhimento inicial." },
      { label: "Chegou agitado", frase: "Chegou ao atendimento agitado, demonstrando inquietação motora e dificuldade inicial de regulação." },
      { label: "Chegou sonolento", frase: "Chegou ao atendimento sonolento, com baixo nível de alerta nos primeiros minutos." },
      { label: "Após troca de medicação", frase: "Familiar relatou troca recente de medicação, observando-se reflexos no comportamento inicial do paciente." },
      { label: "Após escola/terapia", frase: "Chegou logo após período escolar ou outra terapia, demonstrando sinais de cansaço inicial." },
      { label: "Queixa física relatada", frase: "Chegou com queixa física relatada pelo responsável, considerada na condução da sessão." },
    ],
  },
  {
    grupo: "Abordagem", icone: "🎯", key: "abordagem", cor: "#7c3aed",
    itens: [
      { label: "Abordagem ativa", frase: "Foi conduzida abordagem terapêutica ativa, com proposição direta de atividades estruturadas pela terapeuta." },
      { label: "Abordagem receptiva", frase: "Foi conduzida abordagem terapêutica receptiva, acolhendo as iniciativas e produções espontâneas do paciente." },
      { label: "Abordagem mista", frase: "Foi adotada abordagem mista, alternando proposições estruturadas e momentos de escuta às iniciativas do paciente." },
      { label: "Mediada por canção", frase: "A condução da sessão foi mediada principalmente por canções, utilizadas como eixo organizador das atividades." },
    ],
  },
  {
    grupo: "Interação", icone: "🤝", key: "interacao", cor: "#0d9488",
    itens: [
      { label: "Boa interação", frase: "Estabeleceu boa interação com a terapeuta, mantendo contato visual e respondendo às propostas de forma engajada." },
      { label: "Interação moderada", frase: "Apresentou interação moderada, alternando momentos de engajamento com períodos de retraimento." },
      { label: "Baixa interação", frase: "Apresentou baixa interação durante a sessão, com pouca resposta aos estímulos e às propostas oferecidas." },
      { label: "Interação intermitente", frase: "Manteve interação intermitente, com janelas curtas de engajamento intercaladas por desconexão." },
      { label: "Buscou contato físico", frase: "Buscou contato físico com a terapeuta (abraço, colo, toque), utilizando-o como apoio de regulação." },
    ],
  },
  {
    grupo: "Participação", icone: "🎵", key: "participacao", cor: "#db2777",
    itens: [
      { label: "Boa participação", frase: "Demonstrou boa participação nas atividades propostas, envolvendo-se de forma colaborativa do início ao fim." },
      { label: "Resistência a propostas", frase: "Apresentou resistência a algumas propostas, sendo necessário ajustar o ritmo e oferecer alternativas." },
      { label: "Respondeu bem aos recursos musicais", frase: "Respondeu positivamente aos recursos musicais utilizados, com engajamento corporal e vocal." },
      { label: "Participação flutuante", frase: "Apresentou participação flutuante ao longo da sessão, alternando momentos de engajamento e dispersão." },
      { label: "Liderou momento da sessão", frase: "Assumiu protagonismo em momento da sessão, propondo atividade ou conduzindo a escolha musical." },
    ],
  },
  {
    grupo: "Recursos", icone: "🎼", key: "recursos", cor: "#0891b2",
    itens: [
      { label: "Instrumentos melódicos", frase: "Foram utilizados instrumentos melódicos (teclado e violão) como recurso principal de mediação na sessão." },
      { label: "Percussão", frase: "Foram utilizados instrumentos de percussão (tambor, chocalho e ovinho), favorecendo exploração rítmica e corporal." },
      { label: "Canções de referência", frase: "Foram utilizadas canções de referência da playlist personalizada do paciente como suporte para engajamento e regulação." },
      { label: "Recursos visuais", frase: "Foram utilizados recursos visuais (figuras e apoio com PECS) para sustentar a comunicação durante a sessão." },
      { label: "Recursos corporais", frase: "Foram utilizados recursos corporais, com propostas de movimento e dança integradas à música." },
      { label: "Objetos transicionais", frase: "Foram incorporados objetos transicionais trazidos pelo paciente, favorecendo segurança e adesão às propostas." },
      { label: "Recursos digitais", frase: "Foram utilizados recursos digitais (aplicativos musicais e áudios selecionados) como apoio às atividades." },
    ],
  },
  {
    grupo: "Comportamento", icone: "🧠", key: "comportamento", cor: "#4f46e5",
    itens: [
      { label: "Bem regulado", frase: "Manteve-se bem regulado durante toda a sessão, com bom nível de organização sensorial e emocional." },
      { label: "Episódios de desregulação", frase: "Apresentou episódios de desregulação ao longo da sessão, necessitando suporte da terapeuta para retorno ao estado regulado." },
      { label: "Auto-regulação com apoio", frase: "Conseguiu se auto-regular com apoio da terapeuta e dos recursos musicais oferecidos." },
      { label: "Estereotipias presentes", frase: "Apresentou estereotipias motoras e/ou vocais ao longo da sessão, com intensidade compatível com seu padrão habitual." },
      { label: "Busca por contato/afeto", frase: "Demonstrou busca ativa por contato e afeto, aproximando-se da terapeuta e procurando interação." },
      { label: "Comportamento opositor", frase: "Apresentou comportamento opositor pontual diante de propostas específicas, manejado com flexibilização da atividade." },
      { label: "Auto-agressão sinalizada", frase: "Foram observados episódios de auto-agressão de baixa intensidade, sinalizados para acompanhamento da equipe." },
    ],
  },
  {
    grupo: "Respostas", icone: "🌱", key: "respostas", cor: "#16a34a",
    itens: [
      { label: "Boa resposta", frase: "Apresentou boa resposta às intervenções terapêuticas propostas, com participação efetiva." },
      { label: "Resposta parcial", frase: "Apresentou resposta parcial às intervenções, engajando-se em parte das propostas." },
      { label: "Necessidade de pistas", frase: "Necessitou de pistas verbais, visuais e/ou gestuais frequentes para sustentar a participação." },
      { label: "Avanço x sessão anterior", frase: "Demonstrou avanço em relação à sessão anterior, com ampliação de respostas e iniciativas." },
      { label: "Manutenção do nível", frase: "Manteve o nível de desempenho observado nas sessões anteriores, sem mudanças significativas." },
      { label: "Resposta acima do esperado", frase: "Apresentou resposta acima do esperado para a etapa terapêutica atual, ampliando o repertório de habilidades." },
      { label: "Resposta inconsistente", frase: "Apresentou respostas inconsistentes entre os blocos da sessão, com variação no engajamento." },
    ],
  },
  {
    grupo: "Plano aplicado", icone: "📋", key: "plano", cor: "#64748b",
    itens: [
      { label: "Plano integral", frase: "O plano terapêutico previsto para a sessão foi seguido integralmente." },
      { label: "Plano adaptado", frase: "O plano terapêutico foi adaptado durante a sessão conforme as respostas e necessidades do paciente." },
      { label: "Improviso musical livre", frase: "Foi priorizado o improviso musical livre como eixo da sessão." },
      { label: "Canção estruturada", frase: "Foi priorizado o uso de canção estruturada como eixo da sessão." },
      { label: "Escuta ativa", frase: "Foi priorizada a escuta ativa de músicas selecionadas como eixo da sessão." },
      { label: "Sessão de avaliação", frase: "Sessão conduzida com caráter avaliativo, voltada à observação de habilidades e construção de hipóteses clínicas." },
      { label: "Fechamento de ciclo", frase: "Sessão de fechamento de ciclo terapêutico, com retomada de objetivos trabalhados e síntese do percurso." },
    ],
  },
  {
    grupo: "Estado emocional", icone: "😊", key: "emocional", cor: "#e11d48",
    itens: [
      { label: "Humor estável", frase: "Apresentou humor estável e eutímico ao longo de toda a sessão." },
      { label: "Humor lábil/irritável", frase: "Apresentou humor lábil, com momentos de irritabilidade e oscilações afetivas." },
      { label: "Choro durante a sessão", frase: "Apresentou episódios de choro durante a sessão, acolhidos e manejados com suporte musical." },
      { label: "Riso e prazer", frase: "Demonstrou riso espontâneo e expressões de prazer diante das atividades propostas." },
      { label: "Apatia", frase: "Apresentou apatia e baixa expressividade emocional ao longo da sessão." },
      { label: "Ansiedade observável", frase: "Apresentou sinais observáveis de ansiedade, manejados com recursos de regulação musical." },
    ],
  },
  {
    grupo: "Vínculo", icone: "💞", key: "vinculo", cor: "#a21caf",
    itens: [
      { label: "Vínculo fortalecido", frase: "Demonstrou vínculo terapêutico bem estabelecido e em fortalecimento progressivo." },
      { label: "Vínculo em construção", frase: "Vínculo terapêutico em construção, com avanços graduais na confiança e na disponibilidade para a interação." },
      { label: "Buscou a terapeuta", frase: "Procurou a terapeuta de forma espontânea, demonstrando segurança no setting." },
      { label: "Esquiva inicial", frase: "Apresentou esquiva inicial à terapeuta, gradualmente reduzida ao longo da sessão." },
      { label: "Confiança em propostas novas", frase: "Demonstrou confiança ao se engajar em propostas novas oferecidas pela terapeuta." },
    ],
  },
  {
    grupo: "Aspectos musicais", icone: "🎶", key: "musical", cor: "#0ea5e9",
    itens: [
      { label: "Engajamento rítmico", frase: "Apresentou engajamento rítmico, acompanhando o pulso com palmas e/ou instrumentos de percussão." },
      { label: "Engajamento melódico", frase: "Apresentou engajamento melódico, com vocalizações afinadas e acompanhamento de trechos cantados." },
      { label: "Imitação rítmica", frase: "Reproduziu padrões rítmicos propostos pela terapeuta, demonstrando atenção e coordenação." },
      { label: "Improvisação espontânea", frase: "Realizou improvisações espontâneas ao instrumento, com produção musical autônoma." },
      { label: "Escolha de canção", frase: "Escolheu de forma autônoma canções para serem trabalhadas durante a sessão." },
      { label: "Resposta corporal à música", frase: "Apresentou resposta corporal à música, com movimentos ritmados, balanço e/ou dança." },
    ],
  },
  {
    grupo: "Aspectos sensoriais", icone: "🌈", key: "sensorial", cor: "#f97316",
    itens: [
      { label: "Boa modulação sensorial", frase: "Apresentou boa modulação sensorial, tolerando bem a variedade de estímulos oferecidos." },
      { label: "Hipersensibilidade auditiva", frase: "Apresentou hipersensibilidade auditiva diante de timbres mais intensos, manejada com ajuste do volume e da escolha sonora." },
      { label: "Busca proprioceptiva/vibratória", frase: "Demonstrou busca por estímulos proprioceptivos e vibratórios, especialmente em instrumentos graves de percussão." },
      { label: "Hipossensibilidade", frase: "Apresentou padrão de hipossensibilidade, demandando estímulos sonoros e corporais mais intensos para se engajar." },
      { label: "Tolerou volume e timbres", frase: "Tolerou bem variações de volume e diferentes timbres apresentados ao longo da sessão." },
    ],
  },
  {
    grupo: "Observações", icone: "🔎", key: "observacoes", cor: "#ca8a04",
    itens: [
      { label: "Intercorrência na semana", frase: "Familiar relatou intercorrência ocorrida durante a semana, sinalizada para acompanhamento." },
      { label: "Mudança de medicação", frase: "Familiar informou mudança recente na medicação do paciente." },
      { label: "Ausência justificada", frase: "Houve ausência justificada na semana anterior, conforme informado pelo responsável." },
      { label: "Avaliação multidisciplinar", frase: "Há avaliação multidisciplinar agendada, sinalizada para articulação com a equipe." },
      { label: "Mudança na rotina familiar", frase: "Familiar relatou mudança recente na rotina familiar, considerada na leitura clínica da sessão." },
      { label: "Início em outra terapia", frase: "Foi informado início recente em outra terapia, com possibilidade de impacto no comportamento observado." },
    ],
  },
  {
    grupo: "Família", icone: "👨‍👩‍👧", key: "familia", cor: "#0d9488",
    itens: [
      { label: "Familiar em sala", frase: "Familiar permaneceu em sala durante a sessão, participando de momentos pontuais quando indicado." },
      { label: "Familiar acompanhou recepção", frase: "Familiar acompanhou paciente até a recepção da sala, favorecendo transição segura." },
      { label: "Devolutiva breve", frase: "Foi realizada devolutiva breve ao responsável ao final da sessão sobre os principais aspectos observados." },
      { label: "Orientações para casa", frase: "Foram entregues orientações para casa, incluindo sugestões musicais para apoio à rotina." },
      { label: "Reunião de devolutiva", frase: "Solicitada reunião de devolutiva com o responsável para alinhamento de objetivos terapêuticos." },
    ],
  },
  {
    grupo: "Encaminhamentos", icone: "🔗", key: "encaminhamentos", cor: "#2563eb",
    itens: [
      { label: "Articulação com fono", frase: "Sugerida articulação com a fonoaudiologia para alinhamento de estratégias de comunicação." },
      { label: "Articulação com TO", frase: "Sugerida articulação com a terapia ocupacional para integração de estratégias sensoriais." },
      { label: "Articulação com psicologia", frase: "Sugerida articulação com a psicologia para suporte aos aspectos emocionais e comportamentais." },
      { label: "Articulação com psiquiatria/neuro", frase: "Sugerida articulação com psiquiatria/neurologia para acompanhamento clínico complementar." },
      { label: "Reavaliação interna", frase: "Indicada reavaliação interna do plano terapêutico em musicoterapia para ajuste de objetivos." },
    ],
  },
  {
    grupo: "Próximos objetivos", icone: "🎯", key: "proximos", cor: "#be185d",
    itens: [
      { label: "Manter trabalho atual", frase: "Próximos objetivos: manter o trabalho atual, dando continuidade às estratégias terapêuticas em curso." },
      { label: "Trabalhar imitação rítmica", frase: "Próximos objetivos: ampliar trabalho de imitação rítmica e coordenação corporal." },
      { label: "Ampliar repertório musical", frase: "Próximos objetivos: ampliar repertório de canções e referências musicais utilizadas em sessão." },
      { label: "Estimular comunicação verbal/CAA", frase: "Próximos objetivos: estimular ampliação da comunicação verbal e/ou uso de CAA em situações funcionais." },
      { label: "Reforçar regulação emocional", frase: "Próximos objetivos: reforçar estratégias de regulação emocional por meio de recursos musicais." },
    ],
  },
  {
    grupo: "Saída", icone: "👋", key: "saida", cor: "#475569",
    itens: [
      { label: "Saída tranquila", frase: "Saiu da sessão de forma tranquila, com boa transição ao acompanhante." },
      { label: "Saída com resistência", frase: "Demonstrou resistência ao encerramento, manejada com canção de despedida e suporte verbal." },
      { label: "Saída antecipada", frase: "Houve necessidade de saída antecipada por desregulação significativa ou solicitação do responsável." },
      { label: "Tarefa para casa", frase: "Saiu com proposta musical para reproduzir em casa entre as sessões." },
    ],
  },
];

export const CAMPOS_PADRAO = [
  "Descrição da sessão",
  "Recursos utilizados",
  "Comportamento",
  "Respostas terapêuticas",
  "Participação",
  "Plano aplicado",
  "Observações",
  "Próximos objetivos",
];
