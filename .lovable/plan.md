## Melhorar layout e responsividade da extensão

A extensão funciona bem, mas o painel flutuante está visualmente apertado, com seções "empilhadas" (Conexão, Assinatura, Campos, Templates, Input) competindo por espaço — especialmente em viewports menores. Os templates estão como chips simples de borda cinza, sem identidade visual.

### Objetivos

1. Painel mais elegante, com hierarquia visual clara e identidade verde "musicoterapia" mais forte.
2. Templates rápidos virando o destaque visual: chips coloridos por categoria, com ícones, hover/active mais ricos.
3. Responsividade real: funciona em telas pequenas (≤480px) sem cortar conteúdo.
4. Reorganização para reduzir scroll e poluição.

### Mudanças de layout no painel (`extension/content.js` + `content.css`)

**Header**
- Mantém verde, mas com gradiente sutil (`#4b6b4f → #3d5841`) e sombra interna.
- Input do nome do paciente com fundo translúcido branco e ícone 👤.
- Botões `↻ — ×` viram ícones circulares com hover destacado.

**Seção Conexão** → vira **colapsável** (fechada por padrão quando já conectado).
- Quando conectado: mostra apenas uma linha fina verde "✓ Conectado a projeto-...lovable.app" com link "editar".
- Quando não configurado: abre automaticamente.
- Reduz drasticamente o espaço vertical no caso comum.

**Seção Assinatura**
- Card verde claro com borda lateral verde-escura (4px).
- Layout em duas colunas quando largura ≥360px (nome+conselho à esquerda, especialidade+data à direita); empilha em telas menores.
- Ícones SVG inline (não emoji) mais consistentes.

**Seção Campos detectados**
- Vira um chip único minimalista: "📋 16 campos detectados ▾" — clicável para expandir/colapsar a lista.
- Reduz ruído visual quando o usuário não precisa ver a lista.

**Templates rápidos (foco principal do redesign)**
- Header da seção com ícone ⚡ em badge circular verde, título "Templates rápidos" e contador `(3 selecionados)` quando há seleção.
- Cada grupo recebe uma cor de acento própria e ícone:
  - Comunicação 💬 (azul suave)
  - Chegada 🚪 (âmbar)
  - Abordagem 🎯 (roxo)
  - Interação 🤝 (verde-água)
  - Participação 🎵 (rosa)
  - Saída 👋 (cinza-azul)
- Chips redesenhados:
  - Pílulas com fundo branco, borda 1.5px na cor do grupo, texto na cor do grupo.
  - Estado `active`: preenchidos com a cor do grupo, texto branco, leve scale (1.02) e sombra colorida.
  - Hover: fundo tinted (10% da cor do grupo) e leve translateY(-1px).
  - Transições suaves (150ms ease).
- Group title fica inline com uma linha divisória sutil à direita (estilo seção de revista).
- Layout em grid responsivo: chips fluem naturalmente; em telas estreitas ocupam largura total mantendo legibilidade.

**Input + ações**
- Textarea com placeholder mais convidativo e altura inicial menor (50px) — cresce conforme digita.
- Botão "Gerar e preencher" com gradiente verde, ícone ✨ e leve animação no hover.
- Botão "Limpar" mais discreto (ghost).
- Quando há templates selecionados, o botão primário muda para "✨ Gerar com N template(s)".

### Responsividade

- Painel: largura `min(380px, calc(100vw - 24px))`, altura `min(640px, calc(100vh - 100px))`.
- Em viewport ≤480px (mobile): painel ocupa quase a tela toda, posicionado bottom-sheet (full width, bordas arredondadas só em cima).
- Todas as seções com `overflow` controlado e `min-width: 0` para evitar cortes.
- Templates: container com `max-height` proporcional (não fixo 180px) — usa `clamp(140px, 30vh, 240px)`.
- Inputs e chips com `font-size: 13px` (mobile mantém ≥12px para evitar zoom no iOS).

### Polimento visual geral

- Tipografia: melhor escala (header 14px, títulos de seção 11px uppercase, corpo 13px).
- Bordas arredondadas consistentes (8px nos cards, 999px nos chips, 6px nos inputs).
- Sombras em camadas (não só `box-shadow` plano).
- Scrollbars custom (slim, verde-claro) no painel e na lista de templates.
- Estados de foco acessíveis (outline verde) em todos botões/inputs.

### Arquivos afetados

- `extension/content.css` — reescrita ampla das classes existentes + novas classes (`.evo-tpl-group--comunicacao`, etc.) usando CSS custom properties por grupo.
- `extension/content.js` — pequenos ajustes:
  - Adicionar `cor` e `icone` a cada grupo de `TEMPLATES`.
  - Marcar `data-grupo` nos chips para CSS por categoria.
  - Lógica de colapsar Conexão / Campos detectados.
  - Atualizar texto do botão primário com contagem.
  - Renderização do contador na header dos templates.
- `extension/manifest.json` — bump para **0.9.0**.
- `public/agente-evolucao.zip` — repackage.

Sem mudanças no backend, endpoints, ou lógica de preenchimento de campos.
