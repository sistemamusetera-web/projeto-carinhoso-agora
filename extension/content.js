// Injetado nas páginas do Clínica nas Nuvens.
// Detecta listas de pacientes/atendimentos e adiciona botão "Gerar evolução com IA".
// Os seletores reais devem ser ajustados após inspeção da interface real;
// este script usa heurísticas resilientes baseadas em texto.

(function () {
  const BTN_CLASS = "evo-ai-btn";
  const PROCESSED = "data-evo-ai-processed";

  function findPatientRows() {
    // Heurística 1: procurar linhas/cards que contenham botões "Atender", "Atendimento" ou "Evoluir"
    const candidates = Array.from(document.querySelectorAll("tr, li, .card, .panel, [class*='paciente'], [class*='atendimento']"));
    return candidates.filter((el) => {
      if (el.hasAttribute(PROCESSED)) return false;
      const t = (el.innerText || "").toLowerCase();
      return /atender|atendimento|evoluir|evolu[cç][aã]o/.test(t) && el.querySelector("button, a");
    });
  }

  function extractPatientInfo(row) {
    // Tenta achar o nome do paciente — primeiro elemento textual relevante
    const nameEl = row.querySelector("[class*='nome'], strong, b, td, .paciente-nome");
    let nome = "";
    if (nameEl) nome = nameEl.innerText.trim().split("\n")[0].trim();
    if (!nome) nome = (row.innerText || "").trim().split("\n")[0].trim();

    // Tenta achar um id externo em data-attrs ou hrefs
    let externalId = null;
    const link = row.querySelector("a[href*='paciente'], a[href*='atendimento']");
    if (link) {
      const m = link.getAttribute("href").match(/(\d{3,})/);
      if (m) externalId = m[1];
    }
    const dataAttr = row.querySelector("[data-paciente-id], [data-id]");
    if (dataAttr) {
      externalId = dataAttr.getAttribute("data-paciente-id") || dataAttr.getAttribute("data-id") || externalId;
    }
    return { nome, externalId };
  }

  function showBanner(text, action) {
    document.querySelectorAll(".evo-ai-banner").forEach((n) => n.remove());
    const div = document.createElement("div");
    div.className = "evo-ai-banner";
    div.innerHTML = `<strong>Agente de Evolução</strong><div>${text}</div>`;
    if (action) {
      const b = document.createElement("button");
      b.textContent = action.label;
      b.onclick = action.onClick;
      div.appendChild(b);
    }
    const close = document.createElement("button");
    close.textContent = "Fechar";
    close.style.marginLeft = "8px";
    close.style.background = "#9ca3af";
    close.onclick = () => div.remove();
    div.appendChild(close);
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 30000);
  }

  function findEvolucaoTextarea() {
    // Procura a textarea da evolução: heurística por placeholder/label próximo
    const tas = Array.from(document.querySelectorAll("textarea"));
    if (!tas.length) return null;
    // Prefere textarea visível e maior
    return tas
      .filter((t) => t.offsetParent !== null)
      .sort((a, b) => (b.offsetHeight * b.offsetWidth) - (a.offsetHeight * a.offsetWidth))[0] || tas[0];
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillEvolucao(text) {
    const ta = findEvolucaoTextarea();
    if (!ta) {
      showBanner("Não encontrei o campo de evolução. Cole manualmente:<br/><textarea style='width:100%;height:120px;margin-top:6px'>" + text.replace(/</g, "&lt;") + "</textarea>");
      return false;
    }
    setNativeValue(ta, text);
    ta.focus();
    return true;
  }

  async function handleGenerate(row, btn) {
    const info = extractPatientInfo(row);
    if (!info.nome) {
      showBanner("Não foi possível identificar o paciente.");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Gerando…";
    chrome.runtime.sendMessage(
      { type: "generate", payload: { pacienteNome: info.nome, pacienteIdExterno: info.externalId } },
      (resp) => {
        btn.disabled = false;
        btn.textContent = "Gerar evolução com IA";
        if (!resp?.ok) {
          showBanner("Erro: " + (resp?.error || "falha desconhecida"));
          return;
        }
        const ok = fillEvolucao(resp.data.evolucao);
        if (ok) {
          showBanner("Evolução preenchida. Revise e clique em <b>Salvar</b> no sistema.", {
            label: "Marcar como salva",
            onClick: () => {
              chrome.runtime.sendMessage({ type: "confirm", payload: { evolucaoId: resp.data.evolucaoId } });
              document.querySelectorAll(".evo-ai-banner").forEach((n) => n.remove());
            },
          });
        }
      }
    );
  }

  function attachButtons() {
    const rows = findPatientRows();
    rows.forEach((row) => {
      row.setAttribute(PROCESSED, "1");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = BTN_CLASS;
      btn.textContent = "Gerar evolução com IA";
      btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleGenerate(row, btn);
      };
      // Tenta colocar perto do botão de ação
      const actionBtn = row.querySelector("button, a");
      if (actionBtn?.parentElement) actionBtn.parentElement.appendChild(btn);
      else row.appendChild(btn);
    });

    // Se estamos numa tela de evolução de um único paciente, adiciona botão flutuante
    const ta = findEvolucaoTextarea();
    if (ta && !document.querySelector(".evo-ai-floating")) {
      const titleEl = document.querySelector("h1, h2, .titulo, [class*='titulo']");
      const nome = titleEl?.innerText?.trim().split("\n")[0] || "";
      if (nome && /evolu[cç][aã]o/i.test(document.body.innerText)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = BTN_CLASS + " evo-ai-floating";
        btn.style.position = "fixed";
        btn.style.top = "16px";
        btn.style.right = "16px";
        btn.style.zIndex = "999999";
        btn.textContent = "Gerar evolução com IA";
        btn.onclick = () => {
          handleGenerate({ innerText: nome, querySelector: () => null }, btn);
        };
        document.body.appendChild(btn);
      }
    }
  }

  const obs = new MutationObserver(() => {
    clearTimeout(window.__evoAiDebounce);
    window.__evoAiDebounce = setTimeout(attachButtons, 400);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  attachButtons();
})();
