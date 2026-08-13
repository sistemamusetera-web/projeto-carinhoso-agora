// Agente de Evolução — versão mobile (bookmarklet)
// Injetado pelo Safari/iOS via Favorito.
// Configuração: window.__EVO_CFG = { panelUrl, apiKey } DEVE estar definido antes do load.
(function () {
  if (window.__EVO_MOBILE_LOADED) {
    // Re-abre o painel se já tiver sido carregado uma vez
    const existing = document.querySelector(".evo-chat");
    if (existing) { existing.remove(); }
    setTimeout(() => window.__EVO_MOBILE_OPEN && window.__EVO_MOBILE_OPEN(), 50);
    return;
  }
  window.__EVO_MOBILE_LOADED = true;

  const CFG = window.__EVO_CFG || {};
  if (!CFG.panelUrl || !CFG.apiKey) {
    console.warn("Mobile Agent: Configuração incompleta", CFG);
  }
  const PANEL = (CFG.panelUrl || "").replace(/\/$/, "");
  const API_KEY = CFG.apiKey || "";

  // ---------- CSS ----------
  const css = `
.evo-chat{position:fixed;inset:auto 0 0 0;width:100%;height:var(--evo-h,55vh);max-height:92vh;min-height:120px;background:#fff;border-top:1px solid #e2e8f0;border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(15,23,42,.25);z-index:2147483647;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;font-size:13px;color:#1f2937;overflow:hidden;transition:height .18s ease}
.evo-chat.min{height:auto !important;min-height:0}
.evo-chat.min>*:not(.evo-chat-header):not(.evo-grip){display:none !important}
.evo-chat.dragging{transition:none}
.evo-grip{height:18px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#5a7e5f,#3d5841);cursor:ns-resize;touch-action:none;border-radius:16px 16px 0 0}
.evo-grip::before{content:"";width:42px;height:4px;border-radius:999px;background:rgba(255,255,255,.55)}
.evo-chat .evo-chat-header{border-radius:0}
.evo-chat-header{padding:12px 14px;background:linear-gradient(135deg,#5a7e5f,#3d5841);color:#fff;display:flex;justify-content:space-between;align-items:center;border-radius:16px 16px 0 0;user-select:none}
.evo-chat-header strong{font-size:14px}
.evo-chat-paciente{display:block;width:100%;margin-top:6px;padding:6px 8px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);border-radius:6px;font-size:12px;color:#fff;outline:none}
.evo-chat-paciente::placeholder{color:rgba(255,255,255,.65)}
.evo-chat-header button{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.15);border:0;border-radius:6px;color:#fff;font-size:16px;cursor:pointer;margin-left:4px}
.evo-chat-sig{background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569}
.evo-chat-sig>summary{list-style:none;cursor:pointer;padding:8px 14px;display:flex;align-items:center;justify-content:space-between}
.evo-chat-sig>summary::-webkit-details-marker{display:none}
.evo-chat-sig .evo-sig-body{padding:0 14px 8px;line-height:1.5}
.evo-edit-ther{font-size:10px;color:#4b6b4f;text-decoration:underline}
.evo-chat-fields{padding:8px 14px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569;max-height:70px;overflow-y:auto;line-height:1.4}
.evo-chat-fields b{color:#1e293b}
.evo-chat-status{display:none;padding:6px 14px;background:#fef9c3;color:#713f12;font-size:11px;border-bottom:1px solid #fde68a}
.evo-chat-templates{flex:1 1 auto;min-height:160px;border-top:2px solid #4b6b4f;background:#f6faf6;padding:12px 14px;overflow-y:auto;-webkit-overflow-scrolling:touch}
.evo-tpl-head{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:#1f2937;margin-bottom:12px;padding-bottom:8px;border-bottom:1px dashed #d1d5db}
.evo-tpl-count{font-weight:600;color:#4b6b4f;font-size:11px;background:#ecfdf5;padding:2px 8px;border-radius:999px;margin-left:6px}
.evo-tpl-clear{font-size:11px;color:#64748b;text-decoration:none;padding:3px 10px;border-radius:999px;cursor:pointer}
.evo-tpl-list{display:flex;flex-direction:column;gap:12px}
.evo-tpl-group-title{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;color:var(--c,#6b7280);text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px}
.evo-tpl-group-title::after{content:"";flex:1;height:1px;background:currentColor;opacity:.3}
.evo-tpl-chips{display:flex;flex-wrap:wrap;gap:6px}
.evo-tpl-chip{padding:7px 13px;font-size:12px;font-weight:600;border:1.5px solid var(--c,#d1d5db);background:#fff;color:var(--c,#374151);border-radius:999px;cursor:pointer;line-height:1.3;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.evo-tpl-chip.active{background:var(--c,#4b6b4f);border-color:var(--c,#4b6b4f);color:#fff}
.evo-chat-input{border-top:1px solid #e2e8f0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;background:#fff}
.evo-chat-input textarea{width:100%;box-sizing:border-box;min-height:56px;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none}
.evo-chat-actions{display:flex;gap:8px}
.evo-chat-actions button{flex:1;padding:12px;border:0;border-radius:8px;font-weight:600;font-size:13px;font-family:inherit;cursor:pointer}
.evo-btn-primary{background:linear-gradient(135deg,#5a7e5f,#3d5841);color:#fff}
.evo-btn-primary[disabled]{opacity:.6}
.evo-btn-secondary{background:#f1f5f9;color:#1f2937}
.evo-msg{padding:9px 12px;border-radius:12px;max-width:90%;white-space:pre-wrap;line-height:1.45;margin:4px 0;font-size:12px}
.evo-msg-assistant{background:#ecfdf5;color:#064e3b;align-self:flex-start;border-bottom-left-radius:3px}
.evo-msg-user{background:#3d5841;color:#fff;align-self:flex-end;border-bottom-right-radius:3px}
.evo-msg-system{background:#fef3c7;color:#78350f;align-self:center}
.evo-chat-msgs{max-height:160px;overflow-y:auto;padding:8px 14px;display:flex;flex-direction:column;background:#fafbfc;border-bottom:1px solid #e2e8f0}
.evo-tpl-group[data-g="comunicacao"]{--c:#2563eb}.evo-tpl-group[data-g="chegada"]{--c:#d97706}.evo-tpl-group[data-g="abordagem"]{--c:#7c3aed}.evo-tpl-group[data-g="interacao"]{--c:#0d9488}.evo-tpl-group[data-g="participacao"]{--c:#db2777}.evo-tpl-group[data-g="saida"]{--c:#475569}.evo-tpl-group[data-g="recursos"]{--c:#0891b2}.evo-tpl-group[data-g="comportamento"]{--c:#4f46e5}.evo-tpl-group[data-g="respostas"]{--c:#16a34a}.evo-tpl-group[data-g="plano"]{--c:#64748b}.evo-tpl-group[data-g="observacoes"]{--c:#ca8a04}.evo-tpl-group[data-g="proximos"]{--c:#be185d}.evo-tpl-group[data-g="emocional"]{--c:#e11d48}.evo-tpl-group[data-g="vinculo"]{--c:#a21caf}.evo-tpl-group[data-g="musical"]{--c:#0ea5e9}.evo-tpl-group[data-g="sensorial"]{--c:#f97316}.evo-tpl-group[data-g="familia"]{--c:#0d9488}.evo-tpl-group[data-g="encaminhamentos"]{--c:#2563eb}
`;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Templates (mesmos da extensão) ----------
  const TEMPLATES = [
    { grupo:"Comunicação", icone:"💬", key:"comunicacao", itens:[
      {label:"Paciente verbal", frase:"Paciente apresentou-se de forma verbal, comunicando-se por meio de fala funcional durante a sessão."},
      {label:"Paciente não-verbal", frase:"Paciente não-verbal, comunicando-se por meio de gestos, expressões faciais e vocalizações."},
      {label:"Trocas vocais", frase:"Estabeleceu trocas vocais com a terapeuta, alternando emissões em padrão dialógico."},
      {label:"Uso de CAA (PECS)", frase:"Utilizou recursos de Comunicação Alternativa e Aumentativa (PECS/pranchas) para sustentar a interação."},
      {label:"Iniciativa comunicativa", frase:"Apresentou iniciativa comunicativa espontânea, dirigindo solicitações e comentários à terapeuta."},
    ]},
    { grupo:"Chegada", icone:"🚪", key:"chegada", itens:[
      {label:"Chegou tranquilo", frase:"Chegou ao atendimento de forma tranquila, calmo e receptivo ao acolhimento inicial."},
      {label:"Chegou agitado", frase:"Chegou ao atendimento agitado, demonstrando inquietação motora e dificuldade inicial de regulação."},
      {label:"Chegou sonolento", frase:"Chegou ao atendimento sonolento, com baixo nível de alerta nos primeiros minutos."},
      {label:"Após troca de medicação", frase:"Familiar relatou troca recente de medicação, observando-se reflexos no comportamento inicial do paciente."},
      {label:"Após escola/terapia", frase:"Chegou logo após período escolar ou outra terapia, demonstrando sinais de cansaço inicial."},
      {label:"Queixa física relatada", frase:"Chegou com queixa física relatada pelo responsável, considerada na condução da sessão."},
    ]},
    { grupo:"Abordagem", icone:"🎯", key:"abordagem", itens:[
      {label:"Abordagem ativa", frase:"Foi conduzida abordagem terapêutica ativa, com proposição direta de atividades estruturadas pela terapeuta."},
      {label:"Abordagem receptiva", frase:"Foi conduzida abordagem terapêutica receptiva, acolhendo as iniciativas e produções espontâneas do paciente."},
      {label:"Abordagem mista", frase:"Foi adotada abordagem mista, alternando proposições estruturadas e momentos de escuta às iniciativas do paciente."},
      {label:"Mediada por canção", frase:"A condução da sessão foi mediada principalmente por canções, utilizadas como eixo organizador das atividades."},
    ]},
    { grupo:"Interação", icone:"🤝", key:"interacao", itens:[
      {label:"Boa interação", frase:"Estabeleceu boa interação com a terapeuta, mantendo contato visual e respondendo às propostas de forma engajada."},
      {label:"Interação moderada", frase:"Apresentou interação moderada, alternando momentos de engajamento com períodos de retraimento."},
      {label:"Baixa interação", frase:"Apresentou baixa interação durante a sessão, com pouca resposta aos estímulos e às propostas oferecidas."},
      {label:"Interação intermitente", frase:"Manteve interação intermitente, com janelas curtas de engajamento intercaladas por desconexão."},
      {label:"Buscou contato físico", frase:"Buscou contato físico com a terapeuta (abraço, colo, toque), utilizando-o como apoio de regulação."},
    ]},
    { grupo:"Participação", icone:"🎵", key:"participacao", itens:[
      {label:"Boa participação", frase:"Demonstrou boa participação nas atividades propostas, envolvendo-se de forma colaborativa do início ao fim."},
      {label:"Resistência a propostas", frase:"Apresentou resistência a algumas propostas, sendo necessário ajustar o ritmo e oferecer alternativas."},
      {label:"Respondeu bem aos recursos musicais", frase:"Respondeu positivamente aos recursos musicais utilizados, com engajamento corporal e vocal."},
      {label:"Participação flutuante", frase:"Apresentou participação flutuante ao longo da sessão, alternando momentos de engajamento e dispersão."},
      {label:"Liderou momento da sessão", frase:"Assumiu protagonismo em momento da sessão, propondo atividade ou conduzindo a escolha musical."},
    ]},
    { grupo:"Recursos", icone:"🎼", key:"recursos", itens:[
      {label:"Instrumentos melódicos", frase:"Foram utilizados instrumentos melódicos (teclado e violão) como recurso principal de mediação na sessão."},
      {label:"Percussão", frase:"Foram utilizados instrumentos de percussão (tambor, chocalho e ovinho), favorecendo exploração rítmica e corporal."},
      {label:"Canções de referência", frase:"Foram utilizadas canções de referência da playlist personalizada do paciente como suporte para engajamento e regulação."},
      {label:"Recursos visuais", frase:"Foram utilizados recursos visuais (figuras e apoio com PECS) para sustentar a comunicação durante a sessão."},
      {label:"Recursos corporais", frase:"Foram utilizados recursos corporais, com propostas de movimento e dança integradas à música."},
    ]},
    { grupo:"Comportamento", icone:"🧠", key:"comportamento", itens:[
      {label:"Bem regulado", frase:"Manteve-se bem regulado durante toda a sessão, com bom nível de organização sensorial e emocional."},
      {label:"Episódios de desregulação", frase:"Apresentou episódios de desregulação ao longo da sessão, necessitando suporte da terapeuta para retorno ao estado regulado."},
      {label:"Auto-regulação com apoio", frase:"Conseguiu se auto-regular com apoio da terapeuta e dos recursos musicais oferecidos."},
      {label:"Estereotipias presentes", frase:"Apresentou estereotipias motoras e/ou vocais ao longo da sessão, com intensidade compatível com seu padrão habitual."},
      {label:"Comportamento opositor", frase:"Apresentou comportamento opositor pontual diante de propostas específicas, manejado com flexibilização da atividade."},
    ]},
    { grupo:"Respostas", icone:"🌱", key:"respostas", itens:[
      {label:"Boa resposta", frase:"Apresentou boa resposta às intervenções terapêuticas propostas, com participação efetiva."},
      {label:"Resposta parcial", frase:"Apresentou resposta parcial às intervenções, engajando-se em parte das propostas."},
      {label:"Avanço x sessão anterior", frase:"Demonstrou avanço em relação à sessão anterior, com ampliação de respostas e iniciativas."},
      {label:"Manutenção do nível", frase:"Manteve o nível de desempenho observado nas sessões anteriores, sem mudanças significativas."},
      {label:"Resposta inconsistente", frase:"Apresentou respostas inconsistentes entre os blocos da sessão, com variação no engajamento."},
    ]},
    { grupo:"Plano aplicado", icone:"📋", key:"plano", itens:[
      {label:"Plano integral", frase:"O plano terapêutico previsto para a sessão foi seguido integralmente."},
      {label:"Plano adaptado", frase:"O plano terapêutico foi adaptado durante a sessão conforme as respostas e necessidades do paciente."},
      {label:"Improviso musical livre", frase:"Foi priorizado o improviso musical livre como eixo da sessão."},
      {label:"Canção estruturada", frase:"Foi priorizado o uso de canção estruturada como eixo da sessão."},
    ]},
    { grupo:"Estado emocional", icone:"😊", key:"emocional", itens:[
      {label:"Humor estável", frase:"Apresentou humor estável e eutímico ao longo de toda a sessão."},
      {label:"Humor lábil/irritável", frase:"Apresentou humor lábil, com momentos de irritabilidade e oscilações afetivas."},
      {label:"Riso e prazer", frase:"Demonstrou riso espontâneo e expressões de prazer diante das atividades propostas."},
      {label:"Apatia", frase:"Apresentou apatia e baixa expressividade emocional ao longo da sessão."},
      {label:"Ansiedade observável", frase:"Apresentou sinais observáveis de ansiedade, manejados com recursos de regulação musical."},
    ]},
    { grupo:"Próximos objetivos", icone:"🎯", key:"proximos", itens:[
      {label:"Trabalhar turno", frase:"Manter o trabalho de turno (esperar a vez e responder) por meio de jogos musicais."},
      {label:"Ampliar repertório", frase:"Ampliar o repertório de canções utilizado em sessão, incluindo novas referências do paciente."},
      {label:"Regulação via música", frase:"Trabalhar estratégias de regulação emocional mediadas pela música."},
      {label:"Tempo de permanência", frase:"Ampliar o tempo de permanência sustentada em uma mesma atividade musical."},
    ]},
    { grupo:"Saída", icone:"👋", key:"saida", itens:[
      {label:"Saiu tranquilo", frase:"Encerrou a sessão de forma tranquila, regulado e organizado para a transição."},
      {label:"Saiu agitado", frase:"Encerrou a sessão ainda agitado, necessitando apoio para a transição para o ambiente externo."},
      {label:"Saiu regulado/sorridente", frase:"Encerrou a sessão sorridente e regulado, demonstrando bem-estar ao final do atendimento."},
    ]},
  ];

  const SIG_RX = /(assinatura|assinar|signature|rodap[ée]|conselho|\bcrp\b|\bcrm\b|\bcro\b|\bcpf\b|registro|n[uú]mero do conselho|crp|crm|cro|registro|especialidade|[áa]rea de atua|forma[çc][aã]o|terapeuta|profissional|respons[áa]vel|psic[óo]log[oa]|atendente|^nome$|nome\s*completo|c\.r\.p|c\.r\.m|c\.r\.o|cart[aã]o|matr[ií]cula|visto|carimbo|(^|\b)(data|dt[_ ]?sess|sess[aã]o.*data|assinatura.*data|data.*sess|data.*atend))/i;
  const isSig = (n) => SIG_RX.test(n || "");

  // ---------- helpers ----------
  function setNativeValue(el, v) {
    if (el.getAttribute && el.getAttribute("contenteditable") === "true") {
      el.focus(); el.innerText = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return;
    }
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function normalize(s) {
    return (s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  }
  function esc(s) { return (s||"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
  const pad = (n)=>String(n).padStart(2,"0");
  function dataBR() { const d=new Date(); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; }

  function detectPatient() {
    const hs = Array.from(document.querySelectorAll("h1,h2,h3,[class*='nome'],[class*='paciente']"));
    for (const h of hs) {
      const t = (h.innerText||"").trim();
      if (t && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{6,}/.test(t.split("\n")[0])) return t.split("\n")[0].trim();
    }
    const lines = document.body.innerText.split("\n").map(s=>s.trim()).filter(Boolean);
    return lines.find(l => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{5,}$/.test(l)) || "";
  }
  function extractIdFromUrl() { const m=location.pathname.match(/\/(\d{5,})/); return m?m[1]:null; }

  function isVisible(el){ if(!el||el.offsetParent===null) return false; const r=el.getBoundingClientRect(); return r.width>0 || r.height>0; }
  function isChrome(el){ return !!el.closest(".evo-chat"); }

  async function preScroll() {
    const sc = document.scrollingElement || document.documentElement;
    const orig = sc.scrollTop, max = sc.scrollHeight;
    for (let y=0;y<=max;y+=Math.max(300,window.innerHeight-80)) { sc.scrollTop=y; await new Promise(r=>setTimeout(r,90)); }
    sc.scrollTop = orig;
    await new Promise(r=>setTimeout(r,150));
  }

  const IGNORE_LABEL_RX = /^(obrigat[óo]rio|opcional|texto|campo|sele[çc][aã]o|pesquisar\.?\.?\.?|buscar|filtrar|selecione|data|hora|nenhum|todos|ok|sim|n[aã]o|salvar|cancelar|editar|excluir|adicionar|novo|carregando|loading|menu|filtro)$/i;
  const IGNORE_LABEL_CONTAINS_RX = /(\(\s*\)|init\s*\(|function\s*\(|var\s+\w+\s*=|window\.|document\.|console\.|<\/?\w+|\{|\}|;)/;
  const IGNORE_PLACEHOLDER_RX = /(pesquisar|buscar|filtrar|selecione|search|filter)/i;
  function clean(s){ return (s||"").replace(/\*/g,"").replace(/\(obrigat[óo]rio\)/gi,"").replace(/obrigat[óo]rio/gi,"").replace(/\s+/g," ").trim(); }
  function isJunkLabel(s){
    if (!s) return true;
    if (IGNORE_LABEL_RX.test(s)) return true;
    if (IGNORE_LABEL_CONTAINS_RX.test(s)) return true;
    if (/^[\d\s\-\/.:]+$/.test(s)) return true;
    if (s.length < 3 || s.length > 120) return true;
    return false;
  }

  const SKIP_TAGS = new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","CANVAS","IFRAME","TEMPLATE","CODE","PRE"]);
  function collectLeadingTexts(container, inputEl) {
    const texts = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode(n){ return SKIP_TAGS.has(n.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    let node = walker.nextNode();
    while (node) {
      if (node === inputEl || node.contains(inputEl)) {
        if (node === inputEl) break;
        node = walker.nextNode(); continue;
      }
      if (node.children.length === 0 || ["LABEL","SPAN","P","DIV","H1","H2","H3","H4","STRONG","B"].includes(node.tagName)) {
        const t = (node.innerText || node.textContent || "").trim();
        if (t) texts.push(t.split("\n")[0].trim());
      }
      node = walker.nextNode();
    }
    return texts;
  }
  function pickBestLabel(texts) {
    for (const raw of texts) {
      const t = clean(raw);
      if (!t) continue;
      if (t.length > 160) continue;
      if (isJunkLabel(t)) continue;
      return t;
    }
    return null;
  }
  function findFieldCardLabel(el) {
    let cur = el.parentElement;
    let best = null;
    for (let depth = 0; depth < 12 && cur; depth++) {
      const inputs = cur.querySelectorAll("input[type='text'], input:not([type]), textarea");
      if (inputs.length > 1) break;
      const texts = collectLeadingTexts(cur, el);
      const label = pickBestLabel(texts);
      if (label) best = label;
      if (best) return best;
      cur = cur.parentElement;
    }
    return best;
  }

  function findLabel(el) {
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) {
        const c = clean(lab.innerText);
        if (c && !isJunkLabel(c)) return c;
      }
    }
    const aria = el.getAttribute("aria-label");
    if (aria) { const c = clean(aria); if (c && !isJunkLabel(c)) return c; }
    const card = findFieldCardLabel(el);
    if (card) return card;
    let cur = el.parentElement;
    for (let d=0; d<8 && cur; d++) {
      let sib = el.previousElementSibling || cur.previousElementSibling;
      while (sib) {
        const t = (sib.innerText||"").trim().split("\n")[0].trim();
        const c = clean(t);
        if (c && !isJunkLabel(c)) return c;
        sib = sib.previousElementSibling;
      }
      cur = cur.parentElement;
    }
    if (el.placeholder && !IGNORE_PLACEHOLDER_RX.test(el.placeholder)) {
      const c = clean(el.placeholder);
      if (c && !isJunkLabel(c)) return c;
    }
    return null;
  }

  function collectRoots() {
    const roots = [document];
    for (const f of document.querySelectorAll("iframe")) {
      try { if (f.contentDocument) roots.push(f.contentDocument); } catch {}
    }
    return roots;
  }
  function isSearchInput(el){
    const ph = (el.placeholder || "") + " " + (el.getAttribute("aria-label") || "") + " " + (el.name || "") + " " + (el.id || "");
    if (IGNORE_PLACEHOLDER_RX.test(ph)) return true;
    if (el.type === "search") return true;
    // Inputs dentro de header/nav/aside costumam ser busca/filtro
    let cur = el.parentElement;
    for (let d=0; d<6 && cur; d++) {
      const tag = cur.tagName;
      if (tag === "HEADER" || tag === "NAV" || tag === "ASIDE") return true;
      const role = cur.getAttribute && cur.getAttribute("role");
      if (role === "search" || role === "navigation" || role === "banner") return true;
      cur = cur.parentElement;
    }
    return false;
  }
  function detectFields() {
    const all = [];
    for (const root of collectRoots()) {
      try {
        all.push(...root.querySelectorAll(
          "textarea, input[type='text'], input:not([type]), [contenteditable='true'], [contenteditable=''], [role='textbox'], .ql-editor, .ProseMirror, .public-DraftEditor-content, .note-editable"
        ));
      } catch {}
    }
    const fields = [];
    const seen = new Set();
    const seenEls = new Set();
    for (const el of all) {
      if (el.disabled || el.readOnly) continue;
      if (isChrome(el)) continue;
      if (seenEls.has(el)) continue;
      const tag = el.tagName;
      // Filtros de busca/chrome só para inputs simples
      if (tag === "INPUT") {
        const t = (el.type || "").toLowerCase();
        if (t && !["text",""].includes(t)) continue;
        if (isSearchInput(el)) continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      let label = findLabel(el);
      if (!label) continue;
      if (isJunkLabel(label)) continue;
      if (label.length < 4) continue;
      const k = normalize(label);
      if (!k) continue;
      let uniqueKey = k;
      let i = 2;
      while (seen.has(uniqueKey)) uniqueKey = `${k}__${i++}`;
      seen.add(uniqueKey);
      seenEls.add(el);
      fields.push({ nome: label, el });
    }
    return fields;
  }

  // ---------- API calls ----------
  async function apiPost(path, body) {
    try {
      const r = await fetch(PANEL + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text.slice(0,200) }; }
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      return data;
    } catch (e) {
      if (e.message.includes("Failed to fetch")) {
        throw new Error("Erro de Rede: Não foi possível conectar ao servidor. Verifique a URL do painel e sua internet.");
      }
      throw e;
    }
  }
  async function apiGet(path) {
    try {
      const r = await fetch(PANEL + path, { headers: { "x-api-key": API_KEY } });
      const text = await r.text();
      let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text.slice(0,200) }; }
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      return data;
    } catch (e) {
      if (e.message.includes("Failed to fetch")) {
        throw new Error("Erro de Rede: Servidor inacessível.");
      }
      throw e;
    }
  }

  // ---------- preencher campos da assinatura ----------
  // retorna {n, missing:[keys]} para que o retry saiba o que falta
  function fillTherapist(t) {
    const out = { n: 0, missing: [] };
    if (!t) return out;
    const map = [
      { key: "nome", val: t.nome, rx: /(nome\s*completo|terapeuta|profissional|respons[áa]vel|psic[óo]logo|psicologa|atendente|assinatura.*nome|^nome$)/i },
      { key: "conselho", val: t.conselho, rx: /(conselho|crp|crm|cro|cpf|registro|n[uú]mero do conselho)/i },
      { key: "especialidade", val: t.especialidade, rx: /(especialidade|[áa]rea de atua|forma[çc][aã]o)/i },
      { key: "data", val: "__DATE__", rx: /(^|\b)(data|dt[_ ]?sess|sess[aã]o.*data|data.*sess|data.*atend)/i },
    ];
    const flds = detectFields();
    const used = new Set();
    for (const m of map) {
      if (!m.val) continue;
      let placed = false;
      for (const f of flds) {
        if (used.has(f.el)) continue;
        // não sobrescreve se já preenchido
        const cur = (f.el.value ?? f.el.innerText ?? "").trim();
        if (cur && m.key !== "data") { if (m.rx.test(f.nome)) { placed = true; used.add(f.el); break; } continue; }
        if (m.rx.test(f.nome)) {
          try {
            let v = m.val;
            if (v === "__DATE__") {
              v = dataBR();
              if (f.el.tagName === "INPUT" && (f.el.type||"").toLowerCase() === "date") {
                const d = new Date(); v = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
              }
            }
            setNativeValue(f.el, v); used.add(f.el); out.n++; placed = true;
          } catch {}
          break;
        }
      }
      if (!placed && m.val && m.key !== "data") out.missing.push(m.key);
    }
    // campo "assinatura" consolidado
    const lines = [t.nome, t.conselho, t.especialidade, `Data: ${dataBR()}`].filter(Boolean);
    if (lines.length) {
      for (const f of flds) {
        if (used.has(f.el)) continue;
        if (!/assinatura|assinar|rodap[ée]/i.test(f.nome)) continue;
        const cur = (f.el.value ?? f.el.innerText ?? "").trim();
        if (cur) continue;
        try { setNativeValue(f.el, lines.join("\n")); used.add(f.el); out.n++; } catch {}
      }
    }
    return out;
  }


  function activateEditor(el) {
    try {
      el.scrollIntoView({ block: "center" });
      // Para editores lazy (Quill/ProseMirror/etc), um click+focus costuma materializar o contenteditable
      const card = el.closest('[class*="field"], [class*="campo"], [class*="card"], [class*="editor"]') || el.parentElement;
      try { card && card.dispatchEvent(new MouseEvent("click", { bubbles: true })); } catch {}
      try { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); } catch {}
      try { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); } catch {}
      try { el.focus(); } catch {}
    } catch {}
  }

  function fillFields(camposResp, fields) {
    let n = 0;
    const filled = new Set();
    const respEntries = Object.entries(camposResp).filter(([k]) => !isSig(k));
    for (const f of fields) {
      if (isSig(f.nome)) continue;
      const k = normalize(f.nome);
      let val = null;
      let bestScore = 0;
      for (const [kk, vv] of respEntries) {
        if (filled.has(kk)) continue;
        const nk = normalize(kk);
        let score = 0;
        if (nk === k) score = 100;
        else if (nk.includes(k) || k.includes(nk)) score = 50;
        else {
          // matching por palavras em comum (>=2 palavras de >=4 chars)
          const wk = new Set(k.split(" ").filter(w => w.length >= 4));
          const wn = new Set(nk.split(" ").filter(w => w.length >= 4));
          let common = 0;
          for (const w of wk) if (wn.has(w)) common++;
          if (common >= 2) score = 20 + common;
        }
        if (score > bestScore) { bestScore = score; val = vv; var chosenKey = kk; }
      }
      if (val && bestScore > 0) {
        activateEditor(f.el);
        try { setNativeValue(f.el, val); n++; filled.add(chosenKey); } catch {}
      }
    }
    return n;
  }

  // ---------- panel ----------
  let state = { pacienteNome:"", fields:[], terapeuta:null, selected:new Set(), msgs:[] };

  async function openChat() {
    const existing = document.querySelector(".evo-chat");
    if (existing) { existing.remove(); }

    state.pacienteNome = detectPatient();
    state.pacienteIdExterno = extractIdFromUrl();
    state.selected = new Set();
    const AGENT_VERSION = "v2026-05-26.6-inputs-back";
    state.msgs = [
      { role:"system", content:`🔧 Agente ${AGENT_VERSION} carregado. API: ${PANEL}` },
      { role:"assistant", content:"Selecione os chips abaixo e/ou descreva a sessão. Eu preencho os campos automaticamente." }
    ];

    const panel = document.createElement("div");
    panel.className = "evo-chat";
    panel.innerHTML = `
      <div class="evo-grip" title="Arraste para redimensionar"></div>
      <div class="evo-chat-header">
        <div style="flex:1;min-width:0">
          <strong>🌱 Agente de Evolução</strong>
          <input class="evo-chat-paciente" placeholder="Nome do paciente" value="${esc(state.pacienteNome)}" />
        </div>
        <div style="display:flex;align-items:center">
          <button class="evo-fill-sig" title="Preencher assinatura">✍️</button>
          <button class="evo-redetect" title="Re-detectar">↻</button>
          <button class="evo-size" title="Alternar tamanho">⇕</button>
          <button class="evo-min" title="Minimizar">—</button>
          <button class="evo-close" title="Fechar">×</button>
        </div>
      </div>
      <details class="evo-chat-sig" open>
        <summary>
          <span>✍️ Assinatura</span>
          <a class="evo-edit-ther" href="${PANEL}/configuracoes" target="_blank">editar</a>
        </summary>
        <div class="evo-sig-body"><i style="color:#6b7280">Carregando…</i></div>
      </details>
      <div class="evo-chat-fields">Detectando campos…</div>
      <div class="evo-chat-status"></div>
      <div class="evo-chat-msgs"></div>
      <div class="evo-chat-templates">
        <div class="evo-tpl-head">
          <span>⚡ Templates rápidos<span class="evo-tpl-count"></span></span>
          <a class="evo-tpl-clear">limpar</a>
        </div>
        <div class="evo-tpl-list">
          ${TEMPLATES.map(g=>`
            <div class="evo-tpl-group" data-g="${g.key}">
              <div class="evo-tpl-group-title">${g.icone} ${esc(g.grupo)}</div>
              <div class="evo-tpl-chips">
                ${g.itens.map(it=>`<button type="button" class="evo-tpl-chip" data-f="${esc(it.frase)}">${esc(it.label)}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
      </div>
      <div class="evo-chat-input">
        <textarea placeholder="Opcional: observações adicionais (intercorrências, recursos específicos...)"></textarea>
        <div class="evo-chat-actions">
          <button class="evo-btn-secondary evo-clear">Limpar</button>
          <button type="button" class="evo-btn-primary evo-send">✨ Gerar e preencher</button>
        </div>
      </div>`;
    document.body.appendChild(panel);

    const $ = (s)=>panel.querySelector(s);
    const sigBody = $(".evo-sig-body");
    const fieldsBox = $(".evo-chat-fields");
    const statusEl = $(".evo-chat-status");
    const msgsBox = $(".evo-chat-msgs");
    const textarea = $("textarea");
    const sendBtn = $(".evo-send");
    const countEl = $(".evo-tpl-count");

    function renderMsgs() {
      msgsBox.innerHTML = "";
      for (const m of state.msgs) {
        const d = document.createElement("div");
        d.className = "evo-msg evo-msg-" + m.role;
        d.textContent = m.content;
        msgsBox.appendChild(d);
      }
      msgsBox.scrollTop = msgsBox.scrollHeight;
    }
    function setStatus(t) {
      if (!t) { statusEl.style.display="none"; statusEl.textContent=""; return; }
      statusEl.style.display="block"; statusEl.textContent=t;
    }
    function renderSig(t) {
      if (!t || (!t.nome && !t.conselho && !t.especialidade)) {
        sigBody.innerHTML = `<i style="color:#6b7280">Nenhum dado. <a href="${PANEL}/configuracoes" target="_blank" style="color:#047857">configurar</a></i><br>📅 ${dataBR()}`;
        return;
      }
      sigBody.innerHTML = [
        t.nome ? `👤 ${esc(t.nome)}` : "",
        t.conselho ? `🪪 ${esc(t.conselho)}` : "",
        t.especialidade ? `🎯 ${esc(t.especialidade)}` : "",
        `📅 ${dataBR()}`,
      ].filter(Boolean).join("<br>");
    }
    function renderFields() {
      if (!state.fields.length) fieldsBox.innerHTML = `<b>Nenhum campo detectado.</b> Role a tela do atendimento e toque ↻.`;
      else fieldsBox.innerHTML = `<b>${state.fields.length} campo(s):</b> ${state.fields.map(f=>esc(f.nome)).join(" · ")}`;
    }
    function updateChips() {
      panel.querySelectorAll(".evo-tpl-chip").forEach(c=>{
        c.classList.toggle("active", state.selected.has(c.dataset.f));
      });
      const n = state.selected.size;
      countEl.textContent = n ? ` (${n})` : "";
    }

    // Tamanho persistente + ciclo S/M/G
    const SIZES = [38, 60, 88];
    const savedH = parseFloat(localStorage.getItem("evo_panel_h"));
    if (savedH && savedH >= 20 && savedH <= 95) panel.style.setProperty("--evo-h", savedH + "vh");
    $(".evo-size").onclick = () => {
      const cur = parseFloat(getComputedStyle(panel).getPropertyValue("--evo-h")) || 55;
      const next = SIZES.find(s => s > cur + 1) || SIZES[0];
      panel.style.setProperty("--evo-h", next + "vh");
      localStorage.setItem("evo_panel_h", String(next));
      panel.classList.remove("min");
    };
    // Arrastar barra superior para redimensionar
    const grip = $(".evo-grip");
    let dragStartY = 0, dragStartH = 0;
    const onMove = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = y - dragStartY;
      const newPx = Math.min(window.innerHeight * 0.92, Math.max(120, dragStartH - dy));
      const vh = (newPx / window.innerHeight) * 100;
      panel.style.setProperty("--evo-h", vh.toFixed(1) + "vh");
    };
    const onEnd = () => {
      panel.classList.remove("dragging");
      const vh = parseFloat(getComputedStyle(panel).getPropertyValue("--evo-h"));
      if (vh) localStorage.setItem("evo_panel_h", String(vh));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    const onStart = (e) => {
      panel.classList.remove("min");
      dragStartY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStartH = panel.getBoundingClientRect().height;
      panel.classList.add("dragging");
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      e.preventDefault();
    };
    grip.addEventListener("mousedown", onStart);
    grip.addEventListener("touchstart", onStart, { passive: false });

    $(".evo-close").onclick = () => panel.remove();
    $(".evo-min").onclick = () => panel.classList.toggle("min");
    $(".evo-redetect").onclick = async () => { fieldsBox.innerHTML="Rolando…"; await preScroll(); state.fields = detectFields(); renderFields(); };
    const handleFillSig = async (ev) => {
      try { ev && ev.preventDefault && ev.preventDefault(); } catch {}
      state.msgs.push({ role:"system", content:"▶️ [Assinatura] clique recebido. Buscando terapeuta…" });
      renderMsgs();
      setStatus("Procurando campos da assinatura…");
      try {
        await preScroll();
        let t = state.terapeuta;
        try {
          const r = await apiGet("/api/public/extension/therapist");
          t = r.terapeuta || t;
          state.terapeuta = t;
          renderSig(t);
          state.msgs.push({ role:"system", content:`📡 API ok — nome="${t?.nome||""}", conselho="${t?.conselho||""}", esp="${t?.especialidade||""}"` });
        } catch (e) {
          state.msgs.push({ role:"system", content:"❌ Falha API terapeuta: " + (e&&e.message||e) });
          renderMsgs();
        }
        if (!t || (!t.nome && !t.conselho && !t.especialidade)) {
          state.msgs.push({ role:"system", content:"⚠️ Nenhum dado de terapeuta retornado pela API. Verifique /configuracoes." });
          renderMsgs(); setStatus(""); return;
        }
        const res = fillTherapist(t);
        const flds = detectFields().map(f=>f.nome);
        const sigDetected = flds.filter(n => /nome\s*completo|conselho|cpf|especialidade|assinatura/i.test(n));
        state.msgs.push({ role:"assistant", content:
          `Assinatura: preenchi ${res.n} campo(s).` +
          (res.missing.length ? ` Faltou: ${res.missing.join(", ")}.` : "") +
          `\nCampos detectados na seção: ${sigDetected.length ? sigDetected.join(" · ") : "nenhum"}.`
        });
      } catch (e) {
        state.msgs.push({ role:"system", content:"❌ Erro assinatura: " + (e&&e.message||e) });
      } finally {
        renderMsgs();
        setStatus("");
      }
    };
    const fillSigBtn = $(".evo-fill-sig");
    let _sigLast = 0;
    const fireSig = (e) => { const n=Date.now(); if(n-_sigLast<700){try{e&&e.preventDefault&&e.preventDefault();}catch{}return;} _sigLast=n; handleFillSig(e); };
    fillSigBtn.addEventListener("click", fireSig);
    fillSigBtn.addEventListener("touchend", fireSig, { passive:false });
    $(".evo-tpl-clear").onclick = (e) => { e.preventDefault(); state.selected.clear(); updateChips(); };
    panel.querySelectorAll(".evo-tpl-chip").forEach(c=>{
      c.onclick = (e) => { e.preventDefault();
        if (state.selected.has(c.dataset.f)) state.selected.delete(c.dataset.f);
        else state.selected.add(c.dataset.f);
        updateChips();
      };
    });
    $(".evo-clear").onclick = () => { state.selected.clear(); textarea.value=""; updateChips(); };

    const handleSend = async (ev) => {
      try { ev && ev.preventDefault && ev.preventDefault(); } catch {}
      // Feedback imediato: prova que o clique chegou
      try {
        state.msgs.push({ role:"system", content:"▶️ Clique recebido. Processando…" });
        renderMsgs();
      } catch {}
      try {
        const nomeManual = $(".evo-chat-paciente").value.trim();
        if (nomeManual) state.pacienteNome = nomeManual;
        if (!state.pacienteNome) {
          state.msgs.push({ role:"system", content:"⚠️ Informe o nome do paciente no topo do painel." });
          renderMsgs(); return;
        }

        // SEMPRE re-rola e re-detecta para capturar campos renderizados sob demanda
        setStatus("Detectando campos do formulário…");
        try { await preScroll(); } catch {}
        state.fields = detectFields();
        renderFields();

        const tpls = Array.from(state.selected);
        const extra = textarea.value.trim();
        if (!tpls.length && !extra) {
          state.msgs.push({ role:"system", content:"⚠️ Selecione ao menos um chip ou escreva uma observação." });
          renderMsgs(); return;
        }

        // Campos não-assinatura realmente detectados na página
        const camposDetectados = state.fields.filter(f=>!isSig(f.nome)).map(f=>f.nome);
        // Usa os labels reais; se nada, cai num conjunto padrão para gerar texto útil ao histórico
        const camposParaGeracao = camposDetectados.length
          ? camposDetectados
          : ["Descrição da sessão","Recursos utilizados","Comportamento","Respostas terapêuticas","Participação","Plano aplicado","Observações","Próximos objetivos"];

        const partes = [];
        if (tpls.length) partes.push("Observações da sessão:\n- " + tpls.join("\n- "));
        if (extra) partes.push(extra);
        const msg = partes.join("\n\n");
        state.msgs.push({ role:"user", content: msg });
        renderMsgs();

        sendBtn.disabled = true;
        sendBtn.textContent = "Gerando…";
        setStatus(`Gerando localmente… (${camposDetectados.length} campo(s) detectado(s))`);

        const data = await apiPost("/api/public/extension/chat-generate", {
          pacienteNome: state.pacienteNome,
          pacienteIdExterno: state.pacienteIdExterno,
          mensagens: state.msgs.filter(m=>m.role!=="system"),
          campos: camposParaGeracao,
        });
        const ther = data.terapeuta || {};
        state.terapeuta = ther;
        renderSig(ther);
        const nT = fillTherapist(ther).n;

        // Múltiplas passadas: rola, detecta, ativa editores lazy e preenche.
        // Mantém os já preenchidos e tenta novamente os que faltaram.
        setStatus("Preenchendo campos do formulário…");
        const respCampos = data.campos || {};
        const blocos = Object.keys(respCampos).length;
        let nF = 0;
        let totalCampos = 0;
        const remaining = { ...respCampos };
        for (let pass = 0; pass < 4; pass++) {
          try { await preScroll(); } catch {}
          state.fields = detectFields();
          renderFields();
          totalCampos = state.fields.filter(f=>!isSig(f.nome)).length;
          const got = fillFields(remaining, state.fields);
          nF += got;
          // remove do "remaining" o que já bateu (heurística: marca por inclusão)
          if (got) {
            for (const f of state.fields) {
              const k = normalize(f.nome);
              for (const kk of Object.keys(remaining)) {
                const nk = normalize(kk);
                if (nk === k || nk.includes(k) || k.includes(nk)) { delete remaining[kk]; break; }
              }
            }
          }
          if (!Object.keys(remaining).length) break;
          await new Promise(r=>setTimeout(r,350));
        }

        const resumo = nF
          ? `✅ Preenchi ${nF} de ${totalCampos} campo(s) do formulário + ${nT} da assinatura.`
          : `⚠️ O gerador criou ${blocos} bloco(s) e salvou a evolução no histórico, mas nenhum campo bateu com o formulário. Abra a aba de evolução, toque ↻ e clique novamente. Campos detectados: ${state.fields.map(f=>f.nome).join(" · ") || "nenhum"}.`;
        state.msgs.push({ role:"assistant", content: resumo });
        textarea.value = "";
        state.selected.clear();
        updateChips();
      } catch (e) {
        state.msgs.push({ role:"system", content: "❌ Erro: " + (e && e.message ? e.message : e) });
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "✨ Gerar e preencher";
        setStatus("");
        renderMsgs();
      }
    };
    // Debounce para evitar duplo disparo (touchend + click no iOS)
    let _lastFire = 0;
    const fireSend = (e) => {
      const now = Date.now();
      if (now - _lastFire < 700) { try{e&&e.preventDefault&&e.preventDefault();}catch{} return; }
      _lastFire = now;
      handleSend(e);
    };
    sendBtn.addEventListener("click", fireSend);
    sendBtn.addEventListener("touchend", fireSend, { passive: false });

    renderMsgs();
    fieldsBox.innerHTML = "Rolando para detectar campos…";
    await preScroll();
    state.fields = detectFields();
    renderFields();
    updateChips();

    // assinatura
    try {
      const r = await apiGet("/api/public/extension/therapist");
      if (r.terapeuta) {
        state.terapeuta = r.terapeuta;
        renderSig(r.terapeuta);
        autoFillTherapistRetry(r.terapeuta);
      } else renderSig(null);
    } catch (e) { renderSig(null); }
  }

  // Re-tenta preencher assinatura por ~20s, rolando a tela entre tentativas
  // para forçar a renderização lazy do "Conselho/CPF", "Especialidade" etc.
  function autoFillTherapistRetry(t) {
    if (!t || (!t.nome && !t.conselho && !t.especialidade)) return;
    const wanted = ["nome","conselho","especialidade"].filter(k => t[k]);
    let tries = 0;
    const sc = document.scrollingElement || document.documentElement;
    const tick = async () => {
      tries++;
      const res = fillTherapist(t);
      const stillMissing = res.missing.filter(k => wanted.includes(k));
      if (stillMissing.length === 0 || tries >= 40) return;
      // a cada 2 tentativas, rola um pouco para forçar lazy-render
      if (tries % 2 === 0) {
        const y = sc.scrollTop;
        sc.scrollTop = Math.min(sc.scrollHeight, y + window.innerHeight * 0.8);
        await new Promise(r=>setTimeout(r,120));
        sc.scrollTop = y;
      }
      setTimeout(tick, 500);
    };
    tick();
  }

  window.__EVO_MOBILE_OPEN = openChat;
  openChat();
})();
