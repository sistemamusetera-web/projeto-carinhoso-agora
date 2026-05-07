## Objetivo

Tornar o agente mais "inteligente" (preenche todos os campos a partir de poucas informações) e adicionar dados do terapeuta que são preenchidos automaticamente em todo formulário.

## 1. Dados do terapeuta (nova configuração)

**Banco** — adicionar colunas em `prompt_config`:
- `terapeuta_nome` (text, default '')
- `terapeuta_conselho` (text, default '') — ex.: "CRP 06/12345"
- `terapeuta_especialidade` (text, default '')
- `terapeuta_extras` (jsonb, default '{}') — pares chave/valor livres (ex.: telefone, e-mail) para mapear em qualquer campo extra que apareça no formulário

**Tela `/configuracoes`** — novo card "Dados do terapeuta" acima de "Prompt e modelo", com inputs para nome, conselho/CPF e especialidade, salvando no mesmo `prompt_config` (mesmo botão Salvar).

## 2. Preenchimento automático dos dados do terapeuta

O endpoint `chat-generate` passa a retornar, junto dos `campos` gerados pela IA, um objeto `terapeuta` com os dados salvos na config.

A extensão (`content.js`), ao receber a resposta, antes de aplicar os textos da IA:
- Detecta campos do terapeuta no formulário por heurística de label (regex em PT-BR):
  - nome → "terapeuta", "profissional", "responsável"
  - conselho → "conselho", "crp", "crm", "cpf", "registro"
  - especialidade → "especialidade", "área"
- Para cada match, faz `setNativeValue` com o valor da config (sem chamar a IA).
- Em seguida aplica normalmente os campos clínicos vindos da IA aos demais textareas.

Assim, todo `Gerar e preencher` deixa os dados do terapeuta prontos.

## 3. IA mais "inteligente" com pouca entrada

No `chat-generate` (server route), reforçar o `system prompt` para o modo "expansão inteligente":

- Instruir explicitamente: "A partir de notas curtas/telegráficas do terapeuta, EXPANDA com linguagem clínica profissional, inferindo desdobramentos plausíveis e coerentes com o perfil/objetivos/histórico do paciente — sem inventar fatos clínicos novos (diagnósticos, medicações, eventos não citados)."
- Para cada campo do formulário, sempre produzir conteúdo substantivo (nunca "Sem registros…") quando houver qualquer informação aproveitável; só usar placeholder neutro se realmente não houver base.
- Manter coerência cruzada entre os campos (descrição ↔ recursos ↔ comportamento ↔ próximos objetivos).
- Subir o `max_tokens` da chamada e usar `temperature: 0.6` para texto mais rico, mas previsível.
- Trocar o modelo padrão (quando o usuário não definiu) para `google/gemini-2.5-pro` (mais detalhe), mantendo override pela config.

A chamada continua usando tool-calling para garantir o JSON com as chaves exatas dos campos detectados — nada muda no contrato com a extensão.

## 4. Versão da extensão

`extension/manifest.json` → `0.2.7` e re-empacotar `public/agente-evolucao.zip`.

## Arquivos afetados

- migration SQL: novas colunas em `prompt_config`
- `src/routes/configuracoes.tsx` — card "Dados do terapeuta" + estado/save
- `src/routes/api/public/extension/chat-generate.ts` — system prompt + retorno `terapeuta`
- `extension/content.js` — preenchimento dos campos do terapeuta
- `extension/manifest.json` + `public/agente-evolucao.zip`
