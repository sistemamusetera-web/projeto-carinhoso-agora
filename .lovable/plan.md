## Objetivo
Garantir que a IA preencha **todos os campos** do formulário de evolução, mesmo quando o terapeuta enviar poucas informações no chat.

## Diagnóstico
Hoje o prompt em `src/routes/api/public/extension/chat-generate.ts` já pede expansão, mas tem brechas:
- Permite "Sem intercorrências relevantes nesta sessão." quando a IA julgar que falta base → vira desculpa para campos curtos/vazios.
- Não força tamanho mínimo por campo.
- `tool_choice` força a função, mas não garante que cada `string` venha não-vazia (a IA pode mandar `""`).
- Sem retry/segunda passada caso algum campo volte vazio.

## Mudanças (somente backend, no endpoint `chat-generate.ts`)

1. **Reescrever o system prompt — modo "preenchimento obrigatório"**
   - Remover a frase que autoriza "Sem intercorrências…".
   - Regra explícita: "É PROIBIDO retornar qualquer campo vazio, com `-`, `N/A`, ou frases genéricas curtas. Cada campo deve ter no mínimo 3 frases completas (≈ 40 palavras)."
   - Reforçar: usar perfil + objetivos + histórico + abordagem do terapeuta para inferir conteúdo plausível e coerente quando a nota do terapeuta for curta.
   - Manter a regra anti-alucinação (não inventar diagnósticos, medicações, datas, pessoas novas).
   - Instrução de coerência cruzada entre os campos (mesma sessão, mesma história).

2. **Reforçar o schema da tool `preencher_evolucao`**
   - Em cada propriedade, descrição: "Texto clínico obrigatório, mínimo 3 frases. Nunca vazio."
   - Manter `required: campos` e `additionalProperties: false`.

3. **Validação + retry automático no servidor**
   - Após receber `camposOut`, verificar quais campos vieram vazios ou muito curtos (`< 40 caracteres` ou contendo apenas `-`, `n/a`, `sem informações`, etc.).
   - Se houver campos faltantes, fazer **uma segunda chamada** à IA passando a lista exata dos campos a recompletar + o que já foi gerado (para manter coerência) e mesclar o resultado.
   - Limitar a 1 retry para não estourar custo/latência.

4. **Aumentar levemente `max_tokens`** (de 4000 → 6000) para evitar truncamento quando há muitos campos.

5. **Logs**: registrar quantos campos vieram vazios e se o retry resolveu.

## Fora de escopo
- Sem mudanças na extensão (`extension/*`), no formulário ou em outras rotas.
- Sem mudança de modelo padrão (continua o configurado em `prompt_config`).
- Sem mudança de UI.

## Arquivos afetados
- `src/routes/api/public/extension/chat-generate.ts` (único arquivo).
