## Objetivo

Antes de cada chat de evolução, mostrar um cartão "Assinatura do terapeuta" já preenchido com os dados salvos em Configurações + a data de hoje. A extensão preenche automaticamente:

- Campos separados (Nome, Conselho/CPF, Especialidade, Data) quando existirem no formulário
- E também um campo único "Assinatura" consolidado, se existir

## Mudanças

### 1. UI do chat (extensão — `extension/content.js` / popup do chat)
Acima da área do chat, adicionar um bloco fixo "Assinatura":
```
👤 Nome do terapeuta
🪪 CRP 06/12345
🎯 Psicologia Clínica
📅 07/05/2026  (hoje, automático)
```
- Dados vêm de `chrome.storage` (cacheados da última resposta de `chat-generate`, que já retorna `terapeuta`).
- Botão pequeno "editar" → abre `/configuracoes` em nova aba.
- Data sempre recalculada como `new Date()` no momento do preenchimento.

### 2. Preenchimento no formulário (`extension/content.js`)

Estender `fillTherapistFields()`:

**a) Campos separados** (já existe parcialmente):
- Nome → regex `terapeuta|profissional|responsável|assinatura.*nome`
- Conselho/CPF → `crp|crm|cro|cpf|conselho|registro`
- Especialidade → `especialidade|área|formação`
- Data → `data|dt[_ ]?sess|sessão.*data|assinatura.*data`

**b) Detecção automática de formato de data:**
- Ler `placeholder`, `pattern`, `maxlength`, `aria-label` ou valor atual
- Reconhecer: `DD/MM/AAAA`, `DD-MM-AAAA`, `AAAA-MM-DD`, `MM/DD/AAAA`
- Se `<input type="date">` → usar `YYYY-MM-DD`
- Fallback: `DD/MM/AAAA` (pt-BR)

**c) Campo "Assinatura" consolidado:**
- Detectar `textarea`/`contenteditable` cujo label/placeholder contenha `assinatura|rodapé|assinatura digital`
- Preencher com:
  ```
  {Nome}
  {Conselho}
  {Especialidade}
  {DataFormatada}
  ```
- Não sobrescrever se o campo já tiver conteúdo do usuário (apenas se vazio).

### 3. `chat-generate` (backend)
Já retorna `terapeuta`. Adicionar `dataAtual: new Date().toISOString()` na resposta para coerência (o cliente pode usar a sua própria data; mantemos a do servidor como referência).

### 4. Configurações (`/configuracoes`)
Sem mudança estrutural — os 3 campos do "Dados do terapeuta" já existem. Adicionar apenas um aviso curto no topo do card:
> "Estes dados são usados como assinatura em toda evolução gerada. A data da sessão é preenchida automaticamente com a data de hoje."

### 5. Versão
- `manifest.json` → `0.2.8`
- Reempacotar `public/agente-evolucao.zip`

## Arquivos afetados
- `extension/content.js` (assinatura + detecção de data + campo consolidado + bloco visual no chat)
- `extension/manifest.json` (version bump)
- `public/agente-evolucao.zip` (repack)
- `src/routes/api/public/extension/chat-generate.ts` (incluir `dataAtual`)
- `src/routes/configuracoes.tsx` (texto de ajuda)

Sem migration de banco — os campos já existem em `prompt_config`.