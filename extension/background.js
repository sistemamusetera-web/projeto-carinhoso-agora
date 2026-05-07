// Service worker — proxy para chamadas ao painel (evita CORS no content script)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "generate" || msg?.type === "confirm") {
    chrome.storage.local.get(["panelUrl", "apiKey"], async (cfg) => {
      try {
        if (!cfg.panelUrl || !cfg.apiKey) {
          sendResponse({ ok: false, error: "Configure URL e API key no popup da extensão." });
          return;
        }
        const path = msg.type === "generate" ? "/api/public/extension/generate" : "/api/public/extension/confirm";
        const resp = await fetch(`${cfg.panelUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey },
          body: JSON.stringify(msg.payload ?? {}),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          sendResponse({ ok: false, error: data.error || `HTTP ${resp.status}` });
          return;
        }
        sendResponse({ ok: true, data });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    });
    return true; // resposta assíncrona
  }
});
