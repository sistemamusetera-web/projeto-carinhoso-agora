// Agente de Evolução Terapêutica — content script v0.2.1
// Detecção robusta de campos do Clínica nas Nuvens + mensageria com timeout.

(function () {
  const BTN_CLASS = "evo-ai-btn";
  let chatState = null; // { messages, fields, pacienteNome, pacienteIdExterno }

  // ------------------- helpers -------------------
  function setNativeValue(el, value) {
    if (el.getAttribute && el.getAttribute("contenteditable") === "true") {
      el.focus();
      el.innerText = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return;
    }
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

  // ------------------- data -------------------
  function pad2(n) { return String(n).padStart(2, "0"); }
  function todayParts() {
    const d = new Date();
    return { d: pad2(d.getDate()), m: pad2(d.getMonth() + 1), y: String(d.getFullYear()) };
  }
  function formatDateForField(el) {
    const { d, m, y } = todayParts();
    if (el && el.tagName === "INPUT" && (el.type || "").toLowerCase() === "date") return `${y}-${m}-${d}`;
    const hints = [
      el?.getAttribute?.("placeholder"),
      el?.getAttribute?.("pattern"),
      el?.getAttribute?.("aria-label"),
      el?.value,
    ].filter(Boolean).join(" ").toLowerCase();
    if (/aaaa[\/-]mm[\/-]dd|yyyy[\/-]mm[\/-]dd/.test(hints)) return `${y}-${m}-${d}`;
    if (/mm[\/-]dd[\/-]aaaa|mm[\/-]dd[\/-]yyyy/.test(hints)) return `${m}/${d}/${y}`;
    if (/dd-mm-aaaa|dd-mm-yyyy/.test(hints)) return `${d}-${m}-${y}`;
    return `${d}/${m}/${y}`; // pt-BR default
  }
  function formatDateBR() {
    const { d, m, y } = todayParts();
    return `${d}/${m}/${y}`;
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
    // ignora apenas o próprio chat e nav/header globais
    return !!el.closest(".evo-chat, nav[role='navigation'], header[role='banner']");
  }

  function collectAllRoots() {
    // raiz principal + iframes same-origin acessíveis
    const roots = [document];
    for (const f of document.querySelectorAll("iframe")) {
      try {
        if (f.contentDocument) roots.push(f.contentDocument);
      } catch (e) { /* cross-origin */ }
    }
    return roots;
  }

  async function preScrollEvolutionPanel() {
    // 1) Rola a janela inteira de cima ao fim e volta (força lazy-render)
    const scroller = document.scrollingElement || document.documentElement;
    const originalY = scroller.scrollTop;
    const maxY = scroller.scrollHeight;
    const stepY = Math.max(300, window.innerHeight - 80);
    for (let y = 0; y <= maxY; y += stepY) {
      scroller.scrollTop = y;
      await new Promise((r) => setTimeout(r, 110));
    }
    // 2) Também rola containers internos scrolláveis
    const inner = Array.from(document.querySelectorAll("div, main, section, form"))
      .filter((d) => isVisible(d) && d.scrollHeight > d.clientHeight + 80 && d !== scroller);
    for (const c of inner.slice(0, 6)) {
      const orig = c.scrollTop;
      const max = c.scrollHeight;
      for (let y = 0; y <= max; y += Math.max(200, c.clientHeight - 50)) {
        c.scrollTop = y;
        await new Promise((r) => setTimeout(r, 70));
      }
      c.scrollTop = orig;
    }
    scroller.scrollTop = originalY;
    await new Promise((r) => setTimeout(r, 150));
  }

  function findFieldCardLabel(el) {
    // Sobe a árvore até achar um container que envolve UM input/textarea visível
    // e contém um texto curto identificando o campo.
    let cur = el.parentElement;
    let best = null;
    for (let depth = 0; depth < 12 && cur; depth++) {
      const inputs = cur.querySelectorAll("input[type='text'], input:not([type]), textarea");
      if (inputs.length > 1) break; // saímos do escopo do campo
      const texts = collectLeadingTexts(cur, el);
      const label = pickBestLabel(texts);
      if (label) best = label;
      if (best) return best;
      cur = cur.parentElement;
    }
    return best;
  }

  function findLabelFromSiblings(el) {
    // Fallback: caminha pelos previousElementSiblings e ancestrais procurando texto curto
    let cur = el;
    for (let d = 0; d < 6 && cur; d++) {
      let sib = cur.previousElementSibling;
      while (sib) {
        const t = (sib.innerText || sib.textContent || "").trim().split("\n")[0].trim();
        const cleaned = cleanLabel(t);
        if (cleaned && cleaned.length <= 80 && !IGNORE_LABEL_RX.test(cleaned) && !/^[\d\s\-\/.:]+$/.test(cleaned)) {
          return cleaned;
        }
        sib = sib.previousElementSibling;
      }
      cur = cur.parentElement;
    }
    return null;
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
    const roots = collectAllRoots();
    const all = [];
    for (const root of roots) {
      try {
        all.push(...root.querySelectorAll("textarea, input[type='text'], input:not([type]), [contenteditable='true']"));
      } catch (e) { /* ignore */ }
    }
    const inputs = all.filter((el) => {
      if (el.disabled || el.readOnly) return false;
      if (isInsideChrome(el)) return false;
      const r = el.getBoundingClientRect();
      // aceita mesmo offscreen, desde que tenha tamanho
      if (r.width < 4 || r.height < 4) return false;
      return true;
    });
    const fields = [];
    for (const el of inputs) {
      // ignora inputs pequenos com placeholder de busca
      if (el.tagName === "INPUT" && el.offsetWidth < 220 && IGNORE_PLACEHOLDER_RX.test(el.placeholder || "")) continue;
      let label = null;
      if (el.id) {
        const lab = (el.ownerDocument || document).querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab) label = cleanLabel(lab.innerText);
      }
      if (!label || IGNORE_LABEL_RX.test(label)) {
        const cardLabel = findFieldCardLabel(el);
        if (cardLabel) label = cardLabel;
      }
      if (!label && el.getAttribute("aria-label")) label = cleanLabel(el.getAttribute("aria-label"));
      if (!label) label = findLabelFromSiblings(el);
      if (!label && el.placeholder && !IGNORE_PLACEHOLDER_RX.test(el.placeholder)) label = cleanLabel(el.placeholder);
      if (!label && (el.tagName === "TEXTAREA" || el.getAttribute("contenteditable") === "true")) label = `Campo ${fields.length + 1}`;
      if (!label) continue;
      if (IGNORE_LABEL_RX.test(label)) continue;
      fields.push({ nome: label, el });
    }
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
    const cachedTher = await new Promise((res) => {
      try { chrome.storage.local.get(["terapeuta"], (o) => res((o && o.terapeuta) || {})); }
      catch (e) { res({}); }
    });
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
      <div class="evo-chat-config" style="padding:10px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;font-weight:600;color:#374151">Conexão</span>
          <span class="evo-chat-conn-status" style="font-size:11px"></span>
        </div>
        <input class="evo-chat-url" placeholder="URL do painel (https://...)" value="${escapeHtml(cfg.panelUrl || "")}" style="width:100%;box-sizing:border-box;padding:5px 7px;border:1px solid #d1d5db;border-radius:4px;font-size:11px" />
        <input class="evo-chat-key" type="password" placeholder="API Key (evo_...)" value="${escapeHtml(cfg.apiKey || "")}" style="width:100%;box-sizing:border-box;padding:5px 7px;border:1px solid #d1d5db;border-radius:4px;font-size:11px" />
        <button class="evo-chat-save-cfg" style="padding:5px;border:0;border-radius:4px;background:#374151;color:white;font-size:11px;font-weight:600;cursor:pointer">Salvar conexão</button>
      </div>
      <div class="evo-chat-signature" style="padding:8px 12px;background:#ecfdf5;border-bottom:1px solid #d1fae5;font-size:11px;color:#065f46">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:600">✍️ Assinatura</span>
          <a href="#" class="evo-edit-ther" style="font-size:10px;color:#047857;text-decoration:underline">editar</a>
        </div>
        <div class="evo-sig-body"></div>
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

    const connStatus = panel.querySelector(".evo-chat-conn-status");
    const updateConnStatus = (cfg) => {
      if (cfg.panelUrl && cfg.apiKey) {
        connStatus.textContent = "✓ conectado";
        connStatus.style.color = "#16a34a";
      } else {
        connStatus.textContent = "⚠ não configurado";
        connStatus.style.color = "#dc2626";
      }
    };
    updateConnStatus(cfg);

    const sigBody = panel.querySelector(".evo-sig-body");
    const renderSig = (t) => {
      const dataBR = formatDateBR();
      if (!t || (!t.nome && !t.conselho && !t.especialidade)) {
        sigBody.innerHTML = `<i style="color:#6b7280">Nenhum dado de terapeuta. <a href="#" class="evo-edit-ther2" style="color:#047857;text-decoration:underline">configurar agora</a></i><br/>📅 ${dataBR}`;
        const a = sigBody.querySelector(".evo-edit-ther2");
        if (a) a.onclick = (e) => { e.preventDefault(); openConfigPage(); };
        return;
      }
      sigBody.innerHTML = [
        t.nome ? `👤 ${escapeHtml(t.nome)}` : "",
        t.conselho ? `🪪 ${escapeHtml(t.conselho)}` : "",
        t.especialidade ? `🎯 ${escapeHtml(t.especialidade)}` : "",
        `📅 ${dataBR}`,
      ].filter(Boolean).join("<br/>");
    };
    chatState.terapeuta = cachedTher;
    renderSig(cachedTher);
    // Auto-preenche já com cache, se houver
    if (cachedTher && (cachedTher.nome || cachedTher.conselho || cachedTher.especialidade)) {
      autoFillTherapistWhenReady(panel);
    }
    // Busca dados atualizados do terapeuta no painel
    sendBgMessage({ type: "fetch-therapist" }, 15000).then((r) => {
      if (r?.ok && r.data?.terapeuta) {
        chatState.terapeuta = r.data.terapeuta;
        try { chrome.storage.local.set({ terapeuta: r.data.terapeuta }); } catch (e) {}
        renderSig(r.data.terapeuta);
        autoFillTherapistWhenReady(panel);
      }
    });
    const openConfigPage = async () => {
      const c = await getConfig();
      const url = (c.panelUrl || "").replace(/\/$/, "");
      window.open(url ? `${url}/configuracoes` : "about:blank", "_blank");
    };
    panel.querySelector(".evo-edit-ther").onclick = (e) => { e.preventDefault(); openConfigPage(); };
    chatState.renderSig = renderSig;
    panel.querySelector(".evo-chat-save-cfg").onclick = async () => {
      const url = panel.querySelector(".evo-chat-url").value.trim().replace(/\/$/, "");
      const key = panel.querySelector(".evo-chat-key").value.trim();
      if (!url || !key) { connStatus.textContent = "preencha URL e key"; connStatus.style.color = "#dc2626"; return; }
      await saveConfig(url, key);
      updateConnStatus({ panelUrl: url, apiKey: key });
    };

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
    setupAutoRedetect(panel);
  }

  function renderFieldsBar(panel) {
    const fieldsBox = panel.querySelector(".evo-chat-fields");
    const fields = chatState.fields;
    if (!fields.length) {
      fieldsBox.innerHTML = `<b>Nenhum campo detectado.</b> Role a página do atendimento ou clique <a href="#" class="evo-redetect-link" style="color:#4b6b4f;text-decoration:underline">aqui para re-detectar</a>.`;
    } else {
      fieldsBox.innerHTML = `<b>${fields.length} campo(s):</b> ${fields.map((f) => escapeHtml(f.nome)).join(" · ")} <a href="#" class="evo-redetect-link" style="color:#4b6b4f;text-decoration:underline;margin-left:6px">↻ atualizar</a>`;
    }
    const link = fieldsBox.querySelector(".evo-redetect-link");
    if (link) link.onclick = (e) => { e.preventDefault(); runDetection(panel); };
  }

  async function runDetection(panel) {
    const fieldsBox = panel.querySelector(".evo-chat-fields");
    fieldsBox.innerHTML = "Rolando o formulário para carregar todos os campos…";
    await preScrollEvolutionPanel();
    chatState.fields = detectFormFields();
    renderFieldsBar(panel);
  }

  function setupAutoRedetect(panel) {
    let scheduled = null;
    const schedule = () => {
      if (scheduled) clearTimeout(scheduled);
      scheduled = setTimeout(() => {
        if (!document.body.contains(panel)) return;
        const fresh = detectFormFields();
        const sigOld = chatState.fields.map((f) => f.nome).join("|");
        const sigNew = fresh.map((f) => f.nome).join("|");
        if (sigOld !== sigNew) {
          chatState.fields = fresh;
          renderFieldsBar(panel);
        }
      }, 600);
    };
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches?.("textarea, input") || n.querySelector?.("textarea, input")) {
            schedule();
            return;
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    // limpa quando o painel for removido
    const cleanup = new MutationObserver(() => {
      if (!document.body.contains(panel)) {
        obs.disconnect();
        window.removeEventListener("scroll", schedule);
        cleanup.disconnect();
      }
    });
    cleanup.observe(document.body, { childList: true });
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
    const terapeuta = resp.data?.terapeuta || {};
    const filledTher = fillTherapistFields(terapeuta);
    if (chatState.renderSig) chatState.renderSig(terapeuta);
    const filled = fillFields(camposResp);
    // Fallback: se nada do terapeuta foi colocado em um campo dedicado,
    // anexa o bloco de assinatura ao final do último campo de evolução preenchido.
    let appendedSig = false;
    if (!filledTher && (terapeuta.nome || terapeuta.conselho || terapeuta.especialidade)) {
      appendedSig = appendSignatureToLastField(camposResp, terapeuta);
    }
    const therMsg = filledTher
      ? ` (+${filledTher} dado(s) do terapeuta)`
      : appendedSig ? " (assinatura anexada ao final)" : "";
    chatState.messages.push({
      role: "assistant",
      content:
        `Preenchi ${filled} de ${chatState.fields.length} campo(s)${therMsg}.\n\n` +
        Object.entries(camposResp).map(([k, v]) => `▸ ${k}\n${v}`).join("\n\n") +
        `\n\nRevise antes de finalizar. Para ajustar, descreva o que mudar e clique novamente.`,
    });
    renderMsgs(panel);
  }

  function buildSignatureBlock(t) {
    const dataBR = formatDateBR();
    const lines = [
      "",
      "—",
      t.nome ? t.nome : "",
      t.conselho ? t.conselho : "",
      t.especialidade ? t.especialidade : "",
      `Data: ${dataBR}`,
    ].filter((l) => l !== "");
    return lines.join("\n");
  }

  function appendSignatureToLastField(camposResp, t) {
    const keys = Object.keys(camposResp);
    if (!keys.length) return false;
    // procura o último campo (na ordem do formulário) que casa com a resposta
    let target = null;
    for (let i = chatState.fields.length - 1; i >= 0; i--) {
      const f = chatState.fields[i];
      const key = normalize(f.nome);
      const match = keys.find((k) => {
        const nk = normalize(k);
        return nk === key || nk.includes(key) || key.includes(nk);
      });
      if (match) { target = f; break; }
    }
    if (!target) return false;
    try {
      const cur = (target.el.value ?? target.el.innerText ?? "").toString();
      if (/—\s*\n/.test(cur) && (t.nome ? cur.includes(t.nome) : false)) return false;
      setNativeValue(target.el, cur + buildSignatureBlock(t));
      return true;
    } catch (e) { return false; }
  }

  // Auto-preenche os campos de assinatura assim que o formulário aparecer.
  // Tenta por ~10s caso os campos ainda não estejam renderizados.
  function autoFillTherapistWhenReady(panel) {
    const t = chatState?.terapeuta;
    if (!t || (!t.nome && !t.conselho && !t.especialidade)) return;
    let tries = 0;
    const maxTries = 20; // ~10s
    const tick = () => {
      tries++;
      if (!document.body.contains(panel)) return;
      const n = fillTherapistFields(t);
      if (n > 0 || tries >= maxTries) return;
      setTimeout(tick, 500);
    };
    tick();
  }

  function fillTherapistFields(t) {
    if (!t) t = {};
    // cache para o cartão de assinatura
    try { chrome.storage.local.set({ terapeuta: t }); } catch (e) { /* ignore */ }
    const dataBR = formatDateBR();
    const map = [
      { val: t.nome, rx: /(nome\s*completo|terapeuta|profissional|respons[áa]vel|psic[óo]logo|psicologa|atendente|assinatura.*nome|^nome$)/i },
      { val: t.conselho, rx: /(conselho|crp|crm|cro|cpf|registro|n[uú]mero do conselho)/i },
      { val: t.especialidade, rx: /(especialidade|[áa]rea de atua|forma[çc][aã]o)/i },
      { val: "__DATE__", rx: /(^|\b)(data|dt[_ ]?sess|sess[aã]o.*data|assinatura.*data|data.*sess|data.*atend)/i },
    ];
    const allFields = detectFormFields();
    let n = 0;
    const used = new Set();
    for (const m of map) {
      if (m.val === undefined || m.val === null || m.val === "") continue;
      for (const f of allFields) {
        if (used.has(f.el)) continue;
        if (m.rx.test(f.nome)) {
          try {
            const v = m.val === "__DATE__" ? formatDateForField(f.el) : m.val;
            setNativeValue(f.el, v);
            used.add(f.el);
            n++;
          } catch (e) { /* ignore */ }
          break;
        }
      }
    }
    // Campo "Assinatura" consolidado (textarea/input/contenteditable)
    const assinaturaLines = [t.nome, t.conselho, t.especialidade, dataBR ? `Data: ${dataBR}` : ""].filter(Boolean);
    if (assinaturaLines.length) {
      const multi = assinaturaLines.join("\n");
      const single = assinaturaLines.join(" — ");
      for (const f of allFields) {
        if (used.has(f.el)) continue;
        if (!/assinatura|assinar|signature|rodap[ée]/i.test(f.nome)) continue;
        const tag = f.el.tagName;
        const isEditable = f.el.getAttribute && f.el.getAttribute("contenteditable") === "true";
        const isTextInput = tag === "INPUT" && /^(text|search|)$/i.test(f.el.type || "text");
        if (tag !== "TEXTAREA" && !isEditable && !isTextInput) continue;
        const cur = (f.el.value ?? f.el.innerText ?? "").trim();
        if (cur) continue; // não sobrescreve
        const v = isTextInput ? single : multi;
        try { setNativeValue(f.el, v); used.add(f.el); n++; } catch (e) { /* ignore */ }
      }
    }
    return n;
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

  // Auto-preencher assinatura mesmo sem abrir o chat.
  // Busca dados do terapeuta uma vez e tenta preencher conforme o formulário aparece.
  (async () => {
    try {
      const cached = await new Promise((res) =>
        chrome.storage.local.get(["terapeuta"], (o) => res((o && o.terapeuta) || null))
      );
      const tryFill = (t) => {
        if (!t || (!t.nome && !t.conselho && !t.especialidade)) return;
        let tries = 0;
        const tick = () => {
          tries++;
          const n = fillTherapistFields(t);
          if (n > 0 || tries >= 30) return;
          setTimeout(tick, 700);
        };
        tick();
      };
      if (cached) tryFill(cached);
      sendBgMessage({ type: "fetch-therapist" }, 15000).then((r) => {
        if (r?.ok && r.data?.terapeuta) {
          try { chrome.storage.local.set({ terapeuta: r.data.terapeuta }); } catch (e) {}
          tryFill(r.data.terapeuta);
        }
      }).catch(() => {});
      // Re-tenta quando a SPA troca de tela
      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          chrome.storage.local.get(["terapeuta"], (o) => tryFill((o && o.terapeuta) || null));
        }
      }, 1000);
    } catch (e) { /* ignore */ }
  })();

  // Abre o chat quando o ícone da extensão é clicado
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "open-chat") {
        openChat();
        sendResponse({ ok: true });
      }
    });
  } catch (e) { /* ignore */ }
})();

