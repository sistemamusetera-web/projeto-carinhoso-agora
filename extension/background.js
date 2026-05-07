// Service worker — proxy para chamadas ao painel (evita CORS no content script)
// Mantém a resposta assíncrona viva e devolve mensagens de erro úteis.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "generate" && msg?.type !== "confirm" && msg?.type !== "chat-generate") return;

  (async () => {
    try {
      const cfg = await chrome.storage.local.get(["panelUrl", "apiKey"]);
      if (!cfg.panelUrl || !cfg.apiKey) {
        sendResponse({ ok: false, error: "Configure URL e API key no popup da extensão." });
        return;
      }
      const pathMap = {
        generate: "/api/public/extension/generate",
        confirm: "/api/public/extension/confirm",
        "chat-generate": "/api/public/extension/chat-generate",
      };
      const url = `${cfg.panelUrl.replace(/\/$/, "")}${pathMap[msg.type]}`;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 80000);

      let resp;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey },
          body: JSON.stringify(msg.payload ?? {}),
          signal: ctrl.signal,
        });
      } catch (e) {
        clearTimeout(timer);
        if (e.name === "AbortError") {
          sendResponse({ ok: false, error: "A IA demorou demais (>80s). Tente novamente." });
        } else {
          sendResponse({ ok: false, error: `Falha de rede: ${e.message}` });
        }
        return;
      }
      clearTimeout(timer);

      const text = await resp.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text?.slice(0, 200) }; }
      if (!resp.ok) {
        sendResponse({ ok: false, error: data.error || `HTTP ${resp.status}` });
        return;
      }
      sendResponse({ ok: true, data });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();

  return true; // mantém o canal aberto para sendResponse assíncrono
});
