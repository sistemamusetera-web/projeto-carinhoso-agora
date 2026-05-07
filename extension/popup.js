const $ = (id) => document.getElementById(id);

chrome.storage.local.get(["panelUrl", "apiKey"], (cfg) => {
  if (cfg.panelUrl) $("panelUrl").value = cfg.panelUrl;
  if (cfg.apiKey) $("apiKey").value = cfg.apiKey;
});

$("save").addEventListener("click", async () => {
  const panelUrl = $("panelUrl").value.trim().replace(/\/$/, "");
  const apiKey = $("apiKey").value.trim();
  const status = $("status");
  status.textContent = "Testando…";
  status.className = "status";

  if (!panelUrl || !apiKey) {
    status.textContent = "Preencha URL e API key.";
    status.className = "status err";
    return;
  }

  try {
    const r = await fetch(`${panelUrl}/api/public/extension/generate`, {
      method: "OPTIONS",
      headers: { "x-api-key": apiKey },
    });
    if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
    await chrome.storage.local.set({ panelUrl, apiKey });
    status.textContent = "Conectado. Pode usar no Clínica nas Nuvens.";
    status.className = "status ok";
  } catch (e) {
    status.textContent = "Falha ao conectar: " + e.message;
    status.className = "status err";
  }
});
