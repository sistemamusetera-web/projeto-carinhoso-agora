## Templates rápidos no painel da extensão

Adicionar uma barra de "templates" (chips clicáveis) dentro do painel flutuante da extensão. O usuário só clica nos templates desejados (pode escolher vários) e em "Gerar e preencher" — o texto consolidado vira a observação enviada à IA, que então preenche o formulário.

### Templates inclusos (editáveis no código)

Organizados em grupos para facilitar a escolha:

**Comunicação**
- Paciente verbal
- Paciente não-verbal

**Chegada**
- Chegou tranquilo
- Chegou agitado
- Chegou sonolento

**Abordagem**
- Abordagem ativa
- Abordagem receptiva

**Interação**
- Boa interação
- Interação moderada
- Baixa interação

**Participação / Resposta**
- Boa participação nas atividades
- Resistência a algumas propostas
- Respondeu bem aos recursos musicais

**Saída**
- Saiu tranquilo
- Saiu agitado
- Saiu sorridente / regulado

Cada chip tem um `label` curto (mostrado no botão) e um `frase` completa em texto clínico (ex.: "Paciente apresentou-se de forma verbal, comunicando-se com frases curtas e funcionais durante a sessão.") que é o que efetivamente é enviado à IA.

### Como funciona na UI

1. Logo acima do `<textarea>` de "Descreva a sessão de hoje…", aparece a seção **"Templates rápidos"** com os chips agrupados por categoria.
2. Clicar num chip alterna selecionado/deselecionado (visual destacado).
3. Um botão **"Limpar templates"** desmarca todos.
4. Ao clicar em **"Gerar e preencher"**:
   - As frases dos chips selecionados são concatenadas (uma por linha) e prefixadas com "Observações da sessão:".
   - Se o usuário também escreveu algo no textarea, esse texto é anexado depois.
   - O resultado vira a mensagem `user` enviada para a IA (mesmo fluxo atual de `generateAndFill`), que continua expandindo em texto clínico para cada campo do formulário.
5. Após gerar, os chips são desmarcados automaticamente.

### Mudanças técnicas

- **`extension/content.js`**:
  - Nova constante `TEMPLATES` (lista de grupos com `{ label, frase }`).
  - Renderizar a barra de chips dentro do `openChat()` (acima do textarea).
  - Estado `chatState.selectedTemplates: Set<string>` para controlar seleção.
  - Em `send()` / `generateAndFill()`: se houver templates selecionados, montar mensagem combinada antes de enviar.
- **`extension/content.css`**: estilos para `.evo-tpl-group`, `.evo-tpl-chip`, `.evo-tpl-chip.active`.
- **`extension/manifest.json`**: bump para **0.8.0**.
- **`public/agente-evolucao.zip`**: repackage.

Sem mudanças no backend / endpoints — a IA continua recebendo texto livre e preenchendo o formulário como hoje.