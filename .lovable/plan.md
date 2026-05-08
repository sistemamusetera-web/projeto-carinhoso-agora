## Tornar a seção "Conexão" discreta quando conectada

Hoje a seção de Conexão ocupa muito espaço no topo do painel (label, URL, API key e botão "Salvar conexão" sempre visíveis). Quando o usuário já configurou a conexão, isso é informação redundante e atrapalha a leitura dos templates.

### Comportamento desejado

- **Quando conectado** (panelUrl + apiKey salvos): mostrar apenas uma linha fina, discreta, no topo:
  - Texto à esquerda: `🔗 Conexão` em cinza claro
  - Texto à direita: `✓ conectado` em verde pequeno
  - Pequeno caret `▾` indicando que é expansível
  - Altura ~26px, fundo levemente diferenciado, mesma estética da linha "✍️ Assinatura"
- **Ao clicar na linha**: expande mostrando os campos URL, API key e botão "Salvar conexão" (estado atual)
- **Quando NÃO conectado**: a seção começa **aberta** automaticamente, com um destaque sutil em âmbar/vermelho no status (`⚠ não configurado`), para que o usuário perceba que precisa configurar
- Após salvar com sucesso, a seção colapsa automaticamente

### Mudanças técnicas

**`extension/content.js`** (~linhas 359–367 e 404–460):
- Trocar a `<div class="evo-chat-config">` por um `<details class="evo-chat-config">` com `<summary>` no mesmo padrão visual da assinatura
- O `<details>` abre por padrão (atributo `open`) somente quando `!cfg.panelUrl || !cfg.apiKey`
- Mover o status (`✓ conectado` / `⚠ não configurado`) para dentro do `<summary>`, à direita
- Em `panel.querySelector(".evo-chat-save-cfg").onclick`, após salvar com sucesso, chamar `details.removeAttribute("open")` para colapsar

**`extension/content.css`**:
- Remover os estilos inline que ainda sobram em `.evo-chat-config` no JS (passar tudo para CSS)
- Reescrever `.evo-chat-config` no padrão `<details>`:
  - `summary` com `list-style:none`, padding 6–8px×14px, flex space-between, cursor pointer, font-size 11px, fundo `#f8fafc`, borda inferior 1px `#e2e8f0`
  - Caret `▾` à direita girando 180° quando aberto (igual à assinatura)
  - Body com padding 8–10px×14px e `display:flex; flex-direction:column; gap:6px` mantendo inputs/botão atuais
- Pequena variação de cor do summary quando o status for "não configurado" (texto âmbar) para chamar atenção sem poluir

**`extension/manifest.json`**: bump para **0.9.2**.

**Empacotamento**: regerar `public/agente-evolucao.zip` com `nix run nixpkgs#zip`.

### Fora do escopo

- Não mudar lógica de conexão, salvamento, validação ou requests
- Não alterar Templates, Assinatura, Campos detectados ou Input
- Não mudar nada no painel React (`/configuracoes`)
