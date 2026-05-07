// Agente de Evolução Terapêutica — content script v0.2.1
// Detecção robusta de campos do Clínica nas Nuvens + mensageria com timeout.

(function () {
  const BTN_CLASS = "evo-ai-btn";
  let chatState = null; // { messages, fields, pacienteNome, pacienteIdExterno }

  // ------------------- helpers -------------------
  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function normalize(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ------------------- paciente -------------------
  function detectPatientFromPage() {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, [class*='nome'], [class*='paciente']"));
    for (const h of headings) {
      const t = (h.innerText || "").trim();
      if (t && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{6,}/.test(t.split("\n")[0])) {
        return { nome: t.split("\n")[0].trim(), externalId: extractIdFromUrl() };
      }
    }
    const all = document.body.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
    const found = all.find((l) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{5,}$/.test(l));
    return { nome: found || "", externalId: extractIdFromUrl() };
  }

  function extractIdFromUrl() {
    const m = location.pathname.match(/\/(\d{5,})/);
    return m ? m[1] : null;
  }

  // ------------------- detecção de campos -------------------
  const IGNORE_LABEL_RX = /^(obrigat[óo]rio|opcional|texto|campo|sele[çc][aã]o|pesquisar|buscar|filtrar)$/i;
  const IGNORE_PLACEHOLDER_RX = /(pesquisar|buscar|filtrar|selecione)/i;

  function isVisible(el) {
    if (!el || el.offsetParent === null) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function isInsideChrome(el) {
    // ignora inputs dentro de barra lateral, header global, sidebar do chat
    return !!el.closest(".evo-chat, nav, header, [class*='sidebar'], [class*='Sidebar'], [class*='menu'], [class*='Menu'], [role='navigation']");
  }

  async function preScrollEvolutionPanel() {
    // Tenta achar o container scrollável que contém um label "Obrigatório" (típico do form)
    const candidate = Array.from(document.querySelectorAll("div"))
      .filter((d) => isVisible(d) && d.scrollHeight > d.clientHeight + 50)
      .find((d) => /Obrigat[óo]rio/i.test(d.innerText || ""));
    if (!candidate) return;
    const original = candidate.scrollTop;
    const max = candidate.scrollHeight;
    for (let y = 0; y <= max; y += Math.max(200, candidate.clientHeight - 50)) {
      candidate.scrollTop = y;
      await new Promise((r) => setTimeout(r, 80));
    }
    candidate.scrollTop = original;
    await new Promise((r) => setTimeout(r, 120));
  }

  function findFieldCardLabel(el) {
    // Sobe a árvore até achar um container que envolve UM input/textarea visível
    // e contém um texto curto identificando o campo.
    let cur = el.parentElement;
    let best = null;
    for (let depth = 0; depth < 8 && cur; depth++) {
      const inputs = cur.querySelectorAll("input[type='text'], input:not([type]), textarea");
      if (inputs.length > 1) break; // saímos do escopo do campo
      // textos diretos no card, antes do input
      const texts = collectLeadingTexts(cur, el);
      const label = pickBestLabel(texts);
      if (label) best = label;
      if (best && cur.querySelector(":scope > label, :scope > div, :scope > span, :scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4")) {
        return best;
      }
      cur = cur.parentElement;
    }
    return best;
  }

  function collectLeadingTexts(container, inputEl) {
    // Pega elementos de texto que aparecem antes do input no DOM order
    const texts = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
    let node = walker.nextNode();
    while (node) {
      if (node === inputEl || node.contains(inputEl)) {
        if (node === inputEl) break;
        node = walker.nextNode();
        continue;
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
      const t = cleanLabel(raw);
      if (!t) continue;
      if (t.length > 80) continue;
      if (IGNORE_LABEL_RX.test(t)) continue;
      if (/^[\d\s\-\/.:]+$/.test(t)) continue;
      return t;
    }
    return null;
  }

  function cleanLabel(s) {
    return (s || "")
      .replace(/\*/g, "")
      .replace(/\(obrigat[óo]rio\)/gi, "")
      .replace(/obrigat[óo]rio/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectFormFields() {
    const inputs = Array.from(document.querySelectorAll("textarea, input[type='text'], input:not([type])")).filter(
      (el) => isVisible(el) && !el.disabled && !el.readOnly && !isInsideChrome(el)
    );
    const fields = [];
    for (const el of inputs) {
      // ignora inputs pequenos com placeholder de busca
      if (el.tagName === "INPUT" && el.offsetWidth < 220 && IGNORE_PLACEHOLDER_RX.test(el.placeholder || "")) continue;
      let label = null;
      // 1) <label for>
      if (el.id) {
        const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab) label = cleanLabel(lab.innerText);
      }
      // 2) heurística do card
      if (!label || IGNORE_LABEL_RX.test(label)) {
        const cardLabel = findFieldCardLabel(el);
        if (cardLabel) label = cardLabel;
      }
      // 3) aria-label
      if (!label && el.getAttribute("aria-label")) label = cleanLabel(el.getAttribute("aria-label"));
      // 4) placeholder, só se não for de busca
      if (!label && el.placeholder && !IGNORE_PLACEHOLDER_RX.test(el.placeholder)) label = cleanLabel(el.placeholder);
      if (!label) continue;
      if (IGNORE_LABEL_RX.test(label)) continue;
      fields.push({ nome: label, el });
    }
    // dedup mantendo primeiro
    const seen = new Set();
    return fields.filter((f) => {
      const k = normalize(f.nome);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // ------------------- chat panel -------------------
  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["panelUrl", "apiKey"], (cfg) => resolve(cfg || {}));
    });
  }
  function saveConfig(panelUrl, apiKey) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ panelUrl, apiKey }, () => resolve());
    });
  }

  async function openChat() {
    if (document.querySelector(".evo-chat")) return;
    const paciente = detectPatientFromPage();
    const cfg = await getConfig();
    chatState = {
      pacienteNome: paciente.nome,
      pacienteIdExterno: paciente.externalId,
      fields: [],
      messages: [
        {
          role: "assistant",
          content:
            "Olá! Me conte como foi a sessão de hoje em linguagem natural: como a criança chegou, o que foi trabalhado, recursos e dinâmicas usadas, comportamento, respostas, observações e próximos passos. Eu organizo tudo nos campos do formulário.",
        },
      ],
    };

    const panel = document.createElement("div");
    panel.className = "evo-chat";
    panel.innerHTML = `
      <div class="evo-chat-header">
        <div style="flex:1;min-width:0">
          <strong>Agente de Evolução</strong>
          <input class="evo-chat-paciente" placeholder="Nome do paciente" value="${escapeHtml(paciente.nome || "")}" style="display:block;width:100%;margin-top:4px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px" />
        </div>
        <div style="display:flex;gap:6px;align-items:center;margin-left:8px">
          <button class="evo-chat-redetect" title="Re-detectar campos">↻</button>
          <button class="evo-chat-close" title="Fechar">×</button>
        </div>
      </div>
      <div class="evo-chat-fields">Detectando campos…</div>
      <div class="evo-chat-status" style="display:none"></div>
      <div class="evo-chat-msgs"></div>
      <div class="evo-chat-input">
        <textarea placeholder="Descreva a sessão de hoje..."></textarea>
        <div class="evo-chat-actions">
          <button class="evo-btn-secondary evo-clear">Limpar</button>
          <button class="evo-btn-primary evo-send">Gerar e preencher</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector(".evo-chat-close").onclick = () => panel.remove();
    panel.querySelector(".evo-chat-redetect").onclick = () => runDetection(panel);
    panel.querySelector(".evo-clear").onclick = () => {
      chatState.messages = chatState.messages.slice(0, 1);
      renderMsgs(panel);
      panel.querySelector("textarea").value = "";
    };
    const textarea = panel.querySelector("textarea");
    const sendBtn = panel.querySelector(".evo-send");
    const send = () => {
      const txt = textarea.value.trim();
      if (!txt) return;
      chatState.messages.push({ role: "user", content: txt });
      textarea.value = "";
      renderMsgs(panel);
      generateAndFill(panel, sendBtn);
    };
    sendBtn.onclick = send;
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
    });

    renderMsgs(panel);
    await runDetection(panel);
  }

  async function runDetection(panel) {
    const fieldsBox = panel.querySelector(".evo-chat-fields");
    fieldsBox.innerHTML = "Rolando o formulário para carregar todos os campos…";
    await preScrollEvolutionPanel();
    const fields = detectFormFields();
    chatState.fields = fields;
    if (!fields.length) {
      fieldsBox.innerHTML = `<b>Nenhum campo detectado.</b> Abra um atendimento com o modelo de evolução, role o formulário e clique em ↻.`;
    } else {
      fieldsBox.innerHTML = `<b>${fields.length} campo(s):</b> ${fields.map((f) => escapeHtml(f.nome)).join(" · ")}`;
    }
  }

  function renderMsgs(panel) {
    const box = panel.querySelector(".evo-chat-msgs");
    box.innerHTML = "";
    for (const m of chatState.messages) {
      const div = document.createElement("div");
      div.className = "evo-msg evo-msg-" + m.role;
      div.textContent = m.content;
      box.appendChild(div);
    }
    box.scrollTop = box.scrollHeight;
  }

  function setStatus(panel, text) {
    const s = panel.querySelector(".evo-chat-status");
    if (!text) { s.style.display = "none"; s.textContent = ""; return; }
    s.style.display = "block";
    s.textContent = text;
    s.style.cssText = "display:block;padding:6px 14px;background:#fef9c3;color:#713f12;font-size:11px;border-bottom:1px solid #fde68a;";
  }

  function pushSystemMsg(panel, text) {
    chatState.messages.push({ role: "system", content: text });
    renderMsgs(panel);
  }

  // sendMessage com timeout e tratamento de lastError
  function sendBgMessage(payload, timeoutMs = 90000) {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve({ ok: false, error: `Timeout após ${Math.round(timeoutMs / 1000)}s. Tente novamente.` });
      }, timeoutMs);
      try {
        chrome.runtime.sendMessage(payload, (resp) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message || "Falha de comunicação com a extensão." });
            return;
          }
          resolve(resp || { ok: false, error: "Resposta vazia da extensão." });
        });
      } catch (e) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ ok: false, error: e.message });
      }
    });
  }

  async function generateAndFill(panel, sendBtn) {
    const inputNome = panel.querySelector(".evo-chat-paciente");
    const nomeManual = inputNome ? inputNome.value.trim() : "";
    if (nomeManual) chatState.pacienteNome = nomeManual;
    if (!chatState.pacienteNome) {
      pushSystemMsg(panel, "Informe o nome do paciente no campo acima antes de gerar.");
      if (inputNome) inputNome.focus();
      return;
    }
    if (!chatState.fields.length) {
      pushSystemMsg(panel, "Nenhum campo detectado para preencher. Abra a tela do atendimento e clique em ↻.");
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = "Gerando…";
    setStatus(panel, "Enviando observações para a IA…");

    const resp = await sendBgMessage({
      type: "chat-generate",
      payload: {
        pacienteNome: chatState.pacienteNome,
        pacienteIdExterno: chatState.pacienteIdExterno,
        mensagens: chatState.messages.filter((m) => m.role !== "system"),
        campos: chatState.fields.map((f) => f.nome),
      },
    });

    sendBtn.disabled = false;
    sendBtn.textContent = "Gerar e preencher";
    setStatus(panel, "");

    if (!resp?.ok) {
      pushSystemMsg(panel, "Erro: " + (resp?.error || "falha desconhecida"));
      return;
    }
    const camposResp = resp.data?.campos || {};
    const filled = fillFields(camposResp);
    chatState.messages.push({
      role: "assistant",
      content:
        `Preenchi ${filled} de ${chatState.fields.length} campo(s).\n\n` +
        Object.entries(camposResp).map(([k, v]) => `▸ ${k}\n${v}`).join("\n\n") +
        `\n\nRevise antes de finalizar. Para ajustar, descreva o que mudar e clique novamente.`,
    });
    renderMsgs(panel);
  }

  function fillFields(camposResp) {
    let count = 0;
    for (const f of chatState.fields) {
      const key = normalize(f.nome);
      let val = null;
      for (const [k, v] of Object.entries(camposResp)) {
        const nk = normalize(k);
        if (nk === key || nk.includes(key) || key.includes(nk)) { val = v; break; }
      }
      if (val) {
        try { setNativeValue(f.el, val); count++; } catch (e) { /* ignore */ }
      }
    }
    return count;
  }

  // ------------------- botão flutuante -------------------
  function ensureFloatingButton() {
    if (document.querySelector(".evo-ai-floating")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BTN_CLASS + " evo-ai-floating";
    btn.textContent = "💬 Gerar evolução com IA";
    btn.onclick = (e) => { e.preventDefault(); openChat(); };
    document.body.appendChild(btn);
  }

  const obs = new MutationObserver(() => {
    clearTimeout(window.__evoAiDebounce);
    window.__evoAiDebounce = setTimeout(ensureFloatingButton, 400);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  ensureFloatingButton();
})();
