// Agente de Evolução Terapêutica — content script
// Injeta botão "Gerar evolução com IA" e abre um chat lateral onde o
// terapeuta descreve a sessão. A IA devolve JSON estruturado por campo
// e a extensão preenche cada campo do formulário do Clínica nas Nuvens.

(function () {
  const BTN_CLASS = "evo-ai-btn";
  const PROCESSED = "data-evo-ai-processed";
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

  // ------------------- detecção de paciente -------------------
  function detectPatientFromPage() {
    // Tela de atendimento aberto: nome em h1/h2 ou no topo
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, [class*='nome'], [class*='paciente']"));
    for (const h of headings) {
      const t = (h.innerText || "").trim();
      // nomes em CAPS LOCK no Clínica nas Nuvens
      if (t && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{6,}/.test(t.split("\n")[0])) {
        return { nome: t.split("\n")[0].trim(), externalId: extractIdFromUrl() };
      }
    }
    // fallback: pega primeiro nome em caps no topo
    const all = document.body.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
    const found = all.find((l) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{5,}$/.test(l));
    return { nome: found || "", externalId: extractIdFromUrl() };
  }

  function extractIdFromUrl() {
    const m = location.pathname.match(/\/(\d{5,})/);
    return m ? m[1] : null;
  }

  // ------------------- detecção de campos -------------------
  function detectFormFields() {
    // Procura textareas e inputs visíveis com um label/título acima
    const inputs = Array.from(document.querySelectorAll("textarea, input[type='text']")).filter(
      (el) => el.offsetParent !== null && !el.disabled && !el.readOnly
    );
    const fields = [];
    for (const el of inputs) {
      const label = findLabelFor(el);
      if (!label) continue;
      // ignorar campos minúsculos (provavelmente busca/filtro)
      if (el.tagName === "INPUT" && el.offsetWidth < 200) continue;
      fields.push({ nome: label, el });
    }
    // dedup por nome (mantém primeiro)
    const seen = new Set();
    return fields.filter((f) => {
      const k = normalize(f.nome);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function findLabelFor(el) {
    // 1) <label for="id">
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) return cleanLabel(lab.innerText);
    }
    // 2) ancestor label
    const parentLabel = el.closest("label");
    if (parentLabel) return cleanLabel(parentLabel.innerText.replace(el.value || "", ""));
    // 3) sibling/anterior elemento de texto
    let cur = el.parentElement;
    for (let depth = 0; depth < 4 && cur; depth++) {
      // procura headings/divs/spans com texto curto antes do input
      const candidates = Array.from(cur.children);
      const idx = candidates.indexOf(el.closest(cur.children[0]?.tagName || "*") || el);
      for (let i = candidates.length - 1; i >= 0; i--) {
        const c = candidates[i];
        if (c === el || c.contains(el)) continue;
        const txt = (c.innerText || "").trim().split("\n")[0];
        if (txt && txt.length < 80 && !/^https?:/.test(txt)) {
          return cleanLabel(txt);
        }
      }
      cur = cur.parentElement;
    }
    // 4) placeholder
    if (el.placeholder) return cleanLabel(el.placeholder);
    return null;
  }

  function cleanLabel(s) {
    return (s || "")
      .replace(/\*/g, "")
      .replace(/\(obrigat[óo]rio\)/gi, "")
      .replace(/obrigat[óo]rio/gi, "")
      .trim();
  }

  // ------------------- chat panel -------------------
  function openChat() {
    if (document.querySelector(".evo-chat")) return;
    const fields = detectFormFields();
    const paciente = detectPatientFromPage();

    chatState = {
      pacienteNome: paciente.nome,
      pacienteIdExterno: paciente.externalId,
      fields,
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
        <div>
          <strong>Agente de Evolução</strong>
          <small>${paciente.nome ? escapeHtml(paciente.nome) : "Paciente não detectado"}</small>
        </div>
        <button class="evo-chat-close" title="Fechar">×</button>
      </div>
      <div class="evo-chat-fields">
        ${
          fields.length
            ? `<b>${fields.length} campo(s) detectado(s):</b> ${fields.map((f) => escapeHtml(f.nome)).join(" · ")}`
            : `<b>Nenhum campo de formulário detectado nesta tela.</b> Abra um atendimento com o modelo de evolução para preenchimento automático.`
        }
      </div>
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
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
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

  function pushSystemMsg(panel, text) {
    chatState.messages.push({ role: "system", content: text });
    renderMsgs(panel);
  }

  function generateAndFill(panel, sendBtn) {
    if (!chatState.fields.length) {
      pushSystemMsg(panel, "Nenhum campo detectado para preencher. Abra a tela do atendimento.");
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = "Gerando…";
    chrome.runtime.sendMessage(
      {
        type: "chat-generate",
        payload: {
          pacienteNome: chatState.pacienteNome,
          pacienteIdExterno: chatState.pacienteIdExterno,
          mensagens: chatState.messages.filter((m) => m.role !== "system"),
          campos: chatState.fields.map((f) => f.nome),
        },
      },
      (resp) => {
        sendBtn.disabled = false;
        sendBtn.textContent = "Gerar e preencher";
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
            Object.entries(camposResp)
              .map(([k, v]) => `▸ ${k}\n${v}`)
              .join("\n\n") +
            `\n\nRevise e ajuste antes de finalizar o atendimento. Se quiser refazer, descreva ajustes e clique novamente.`,
        });
        renderMsgs(panel);
      }
    );
  }

  function fillFields(camposResp) {
    let count = 0;
    for (const f of chatState.fields) {
      const key = normalize(f.nome);
      // match exato ou por inclusão
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
