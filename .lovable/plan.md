
# Agente de Evolução Terapêutica — Painel Web + Extensão Chrome

Vamos transformar o seu projeto Python em duas peças que trabalham juntas:

1. **Painel web** (construído no Lovable) — onde você cadastra pacientes, perfis, objetivos, vê histórico de evoluções e ajusta o prompt da IA.
2. **Extensão Chrome** (gerada pelo Lovable, instalada manualmente uma vez) — roda dentro do seu navegador já logado no Clínica nas Nuvens, lê os pacientes do dia, gera a evolução com IA via o painel e preenche o campo automaticamente.

A IA é o **Lovable AI Gateway** (Gemini/GPT) — sem precisar gerenciar chave da OpenAI.

---

## Arquitetura

```text
 ┌─────────────────────────┐         ┌──────────────────────────┐
 │  Chrome do terapeuta    │         │  Painel Web (Lovable)    │
 │                         │         │                          │
 │  ┌───────────────────┐  │  HTTPS  │  - Login terapeuta       │
 │  │ Extensão Chrome   │◄─┼────────►│  - CRUD pacientes        │
 │  │ (content script)  │  │         │  - Histórico evoluções   │
 │  └─────────┬─────────┘  │         │  - Ajuste de prompt      │
 │            │ DOM        │         │  - Endpoint /api/generate│
 │            ▼            │         │    (chama Lovable AI)    │
 │  app.clinicanasnuvens   │         │                          │
 │  .com.br                │         │  Banco: Lovable Cloud    │
 └─────────────────────────┘         └──────────────────────────┘
```

A extensão NUNCA chama a IA direto — sempre passa pelo painel, então a chave fica protegida e o histórico fica salvo no banco.

---

## Etapa 1 — Painel Web (Lovable Cloud)

**Backend (Lovable Cloud / Supabase):**
- Auth por e-mail/senha para o terapeuta.
- Tabelas:
  - `pacientes` (id, user_id, nome_externo_id*, nome, perfil, objetivos, estilo, ativo)
  - `evolucoes` (id, paciente_id, conteudo, criada_em, origem: 'manual'|'extensao')
  - `prompt_config` (user_id, system_prompt, modelo, estilo padrão)
- RLS: cada terapeuta só vê seus próprios dados.
- `nome_externo_id` = identificador do paciente no Clínica nas Nuvens (a extensão envia, o painel casa).

**Telas (rotas TanStack):**
- `/login` — autenticação.
- `/` (dashboard) — visão do dia, últimas evoluções geradas.
- `/pacientes` — lista + busca.
- `/pacientes/$id` — perfil, objetivos, histórico, edição.
- `/configuracoes` — system prompt editável, modelo padrão, chave de API da extensão.

**Endpoints (server routes / server functions):**
- `POST /api/public/extension/generate` — recebe `{ apiKey, pacienteNome, pacienteIdExterno }`, retorna `{ evolucao }`. Verifica chave, busca/cria paciente, monta prompt com perfil + últimos 5 históricos, chama Lovable AI, salva a evolução no banco e devolve o texto.
- `POST /api/public/extension/confirm` — marca evolução como "preenchida no sistema" (após a extensão confirmar inserção).
- Ambos com CORS aberto + autenticação via API key longa por terapeuta (gerada em `/configuracoes`).

---

## Etapa 2 — Extensão Chrome (Manifest V3)

Empacotada como `.zip` baixável diretamente do painel (`/configuracoes` → botão "Baixar extensão"). Instalação manual via `chrome://extensions` → modo desenvolvedor → "Carregar sem compactação".

**Arquivos:**
- `manifest.json` — host_permissions para `https://app.clinicanasnuvens.com.br/*` e para a URL do painel publicado.
- `popup.html` + `popup.js` — campo para colar a API key (salva em `chrome.storage.local`), botão "Conectar painel", status.
- `content.js` — injetado nas páginas do Clínica nas Nuvens. Detecta a tela "Atendimentos do dia", adiciona um botão flutuante **"Gerar evolução com IA"** ao lado de cada paciente. Ao clicar:
  1. Extrai nome + id do paciente do DOM.
  2. Chama `POST /api/public/extension/generate` no painel.
  3. Abre o atendimento → tela de evolução terapêutica.
  4. Localiza o `textarea` da evolução, preenche com o texto retornado e dispara `input` event para o React/Angular do sistema reconhecer.
  5. Mostra um banner "Revise e clique em salvar" — NÃO clica em salvar sozinho (segurança clínica: você sempre revisa).
- `background.js` — service worker para roteamento de mensagens e fetch para o painel.

**Seletores:** começamos com os já mapeados no seu `config.py` (`#username`, `#password`, `text=Atendimento`, etc.) e ajustamos após inspeção real — vou pedir prints da interface depois para refinar.

---

## Etapa 3 — Fluxo do usuário (você)

1. Acessa o painel, faz login, cadastra pacientes (perfil + objetivos) — pode importar do `pacientes_db.json` que você já tem.
2. Vai em "Configurações", copia sua API key, baixa o `.zip` da extensão.
3. Instala a extensão no Chrome uma única vez, cola a API key no popup.
4. Abre o Clínica nas Nuvens normalmente, faz login (a extensão NÃO toca em login — usa sua sessão já ativa).
5. Em "Atendimentos do dia", cada paciente ganha um botão **"Gerar evolução com IA"**. Clica → texto aparece preenchido → você revisa → salva no sistema.
6. Painel guarda histórico automaticamente, então a próxima evolução já considera as anteriores.

---

## Detalhes técnicos

- **Stack:** TanStack Start + Lovable Cloud (Supabase) + Lovable AI Gateway (modelo padrão `google/gemini-3-flash-preview`, configurável).
- **Prompt:** porto do seu `clinical_engine.py` — mesmas regras (estrutura de descrição, recursos, comportamento, plano, próximos objetivos, sem inventar dados).
- **Memória curta:** mantém últimas 5 evoluções no contexto, idêntico ao `memory_manager.py`.
- **Segurança:** RLS por terapeuta; API key da extensão hasheada no banco; CORS restrito; extensão nunca clica em "Salvar".
- **Empacotamento da extensão:** zipada via `nix run nixpkgs#zip`, servida em `public/agente-evolucao.zip`, baixada via fetch+blob (link direto não funciona no preview do Lovable).

---

## Escopo da primeira entrega (MVP)

1. Painel: auth, CRUD de pacientes, histórico, configurações com API key + download do zip.
2. Endpoint `/api/public/extension/generate` integrado com Lovable AI.
3. Extensão Chrome funcional: popup + content script que injeta botão e preenche o textarea de evolução.
4. Importação inicial dos dados do seu `pacientes_db.json`.

Após o MVP, refinamos seletores reais com base em prints da interface do Clínica nas Nuvens (vou te pedir).

---

## O que vou precisar de você depois de aprovar o plano

- Habilitar Lovable Cloud (peço na hora certa).
- Eventualmente, prints/HTML das telas "Atendimentos do dia" e "Evolução terapêutica" para acertar seletores reais.

Aprovando, começo pelo painel + endpoint + estrutura da extensão.
