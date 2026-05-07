## Problema

No print, o chat está conectado e detectou o paciente, mas mostra **"Nenhum campo detectado"**. Os textareas da evolução existem na mesma tela do Atendimento, porém só aparecem rolando para baixo — fora da viewport inicial.

A função atual `preScrollEvolutionPanel()` procura um container scrollável **interno** com a palavra "Obrigatório". Na tela do Clínica nas Nuvens, o scroll acontece na própria janela (não num div interno), então o pre-scroll não dispara e a detecção roda só com o que está acima da dobra.

Além disso, o filtro atual descarta:
- Inputs com largura `< 220px` que tenham placeholder de busca (correto)
- Mas também perde alguns textareas/inputs cujo "label do card" está em outro nível da árvore não coberto pelas 8 camadas exploradas

## Solução

### 1. Pre-scroll robusto (extension/content.js)
Substituir `preScrollEvolutionPanel()` por uma rotina que:
- Detecta TODOS os candidatos scrolláveis (incluindo `document.scrollingElement` e `window`)
- Faz scroll completo da janela de cima até o fim e volta ao topo
- Também rola qualquer container interno scrollável encontrado
- Aguarda lazy-render entre passos (~120ms)

### 2. Auto re-detecção (extension/content.js)
Adicionar um `MutationObserver` dentro do painel do chat que:
- Observa adições de `<textarea>` e `<input>` no DOM
- Quando o número de campos visíveis muda, re-roda `detectFormFields()` automaticamente (debounced 600ms)
- Atualiza a barra `.evo-chat-fields` sem precisar clicar em ↻
- Também re-detecta em eventos de `scroll` da janela (debounced)

### 3. Detecção mais permissiva (extension/content.js)
Em `detectFormFields()`:
- Incluir todos `<textarea>` visíveis e habilitados, sem filtro de largura
- Para `<input type=text>`: só descartar se placeholder casar EXATAMENTE com "pesquisar/buscar/filtrar/selecione" E largura < 220px (manter regra atual)
- Aumentar a profundidade de busca de label de 8 para 12 níveis
- Como fallback final, usar o texto imediatamente anterior ao input no DOM (previousElementSibling chain) se nenhum label for encontrado
- Mostrar contagem mais clara: "X campo(s) detectado(s) — role a página se faltar algum"

### 4. Botão "Detectar agora" mais visível
A barra `.evo-chat-fields` ganha um link "↻ atualizar" inline para forçar re-scan rápido sem ter que mirar no botão pequeno do header.

### 5. Versão e empacotamento
- Bump `manifest.json` → `0.2.5`
- Reempacotar `public/agente-evolucao.zip`

## Detalhes técnicos

```js
// Novo pre-scroll
async function preScrollEvolutionPanel() {
  const scroller = document.scrollingElement || document.documentElement;
  const max = scroller.scrollHeight;
  const step = Math.max(300, window.innerHeight - 80);
  for (let y = 0; y <= max; y += step) {
    scroller.scrollTo({ top: y, behavior: "instant" });
    await new Promise(r => setTimeout(r, 120));
  }
  // rola containers internos também
  const inner = Array.from(document.querySelectorAll("div,main,section"))
    .filter(d => isVisible(d) && d.scrollHeight > d.clientHeight + 100);
  for (const c of inner) {
    c.scrollTop = c.scrollHeight;
    await new Promise(r => setTimeout(r, 80));
    c.scrollTop = 0;
  }
  scroller.scrollTo({ top: 0, behavior: "instant" });
  await new Promise(r => setTimeout(r, 150));
}

// Auto re-detecção dentro de openChat()
const fieldObserver = new MutationObserver(() => {
  clearTimeout(panel.__redetect);
  panel.__redetect = setTimeout(() => {
    const fresh = detectFormFields();
    if (fresh.length !== chatState.fields.length) {
      chatState.fields = fresh;
      renderFieldsBar(panel);
    }
  }, 600);
});
fieldObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener("scroll", debouncedRedetect, { passive: true });
```

## Arquivos alterados

- `extension/content.js` — pre-scroll, auto re-detecção, filtro mais permissivo
- `extension/manifest.json` — versão 0.2.5
- `public/agente-evolucao.zip` — reempacotamento

## Como testar

1. Baixar o novo .zip em **Configurações** → recarregar em `chrome://extensions`
2. Abrir o atendimento do paciente
3. Abrir o chat (ícone da extensão) — sem rolar manualmente, ele deve listar os campos
4. Se faltar algum, rolar a página: a contagem se atualiza sozinha