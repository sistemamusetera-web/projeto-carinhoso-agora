# PWA companion para uso no celular

Criar uma página web instalável (PWA leve, sem service worker) que funciona no celular. O terapeuta escolhe paciente, monta a nota com os mesmos templates da extensão, gera a evolução com IA pelo backend já existente e copia para colar no Clínica nas Nuvens.

## Por que esta abordagem

Extensões Chrome não rodam em PWA nem no Safari/Chrome iOS. Em vez disso, criamos uma página mobile que reaproveita 100% do backend (`/api/public/extension/chat-generate` e `/therapist`). Sem service worker (conforme guia do projeto), apenas manifest + ícones, para que iOS/Android possam "Adicionar à tela de início" e abrir como app.

## Escopo

### 1. Nova rota `/mobile` (mobile-first, autenticada)
- Lista de pacientes do terapeuta (busca por nome).
- Tela de "Nova evolução" com:
  - Seleção/criação do paciente.
  - Painel de templates rápidos (mesmos grupos da extensão: Comunicação, Chegada, Abordagem, Interação, Participação, Saída, Recursos, Comportamento, Respostas, Plano, Observações, Próximos objetivos, Estado emocional, Vínculo, Aspectos musicais, Sensorial, Família, Encaminhamentos).
  - Textarea para nota livre.
  - Lista de "campos do formulário" pré-definida (descrição da sessão, recursos, comportamento, respostas, plano, observações, próximos objetivos) — editável.
  - Botão "Gerar evolução com IA".
- Tela de resultado com cada campo gerado em um cartão, botão **Copiar campo** e **Copiar tudo** (para colar no app do Clínica).
- Inclui assinatura do terapeuta automaticamente (puxada de `prompt_config`).

### 2. Reaproveitamento de backend
- Usa o endpoint público existente `/api/public/extension/chat-generate` (mesma lógica) — mas como o usuário já está logado no painel, **chamamos via `createServerFn` com `requireSupabaseAuth`** em vez de API key, criando um novo server function `gerarEvolucaoMobile` que faz a mesma coisa porém autenticado por sessão Supabase. Mais simples e seguro no mobile.
- `gerarEvolucaoMobile` resolve/cria paciente, monta prompt e tools (igual ao chat-generate), chama AI Gateway, salva em `evolucoes` com `origem: "mobile-pwa"`.

### 3. PWA instalável (manifest-only, sem SW)
- `public/manifest.webmanifest` com `name`, `short_name`, `start_url: "/mobile"`, `display: "standalone"`, `theme_color`, ícones (reaproveita `extension/icon.png`).
- `<link rel="manifest">` e `<meta name="apple-mobile-web-app-capable">` no `__root.tsx` (apenas tags, sem registrar service worker — segue regra do projeto).
- Sem cache offline (intencional — sempre carrega versão atualizada).

### 4. Entrada no app
- Adicionar card em `/configuracoes` com link "Abrir versão mobile" e instruções de "Adicionar à tela de início" (iOS Safari: compartilhar → adicionar; Android Chrome: menu → instalar app).

## Fora do escopo
- Extensão Chrome (continua igual, v0.9.4).
- Service worker / offline / push.
- Edição inline dos campos no formulário do Clínica (mobile não consegue injetar — só copy/paste).
- App nativo (Capacitor).

## Arquivos

**Novos**
- `src/routes/mobile.tsx` — lista de pacientes + entrada.
- `src/routes/mobile.nova.tsx` — fluxo de geração (templates + nota + resultado).
- `src/lib/evolucao-mobile.functions.ts` — `gerarEvolucaoMobile` (createServerFn + requireSupabaseAuth).
- `src/lib/templates-evolucao.ts` — extrai o array de TEMPLATES da extensão para reuso.
- `public/manifest.webmanifest` + `public/icon-192.png` + `public/icon-512.png` (gerados a partir do icon existente).

**Editados**
- `src/routes/__root.tsx` — adicionar tags manifest + apple-touch-icon.
- `src/routes/configuracoes.tsx` — card "Versão mobile" com link e instruções.
- `extension/content.js` — mover lista TEMPLATES para um JSON também consumido pelo mobile (opcional; aceitável duplicar para evitar refactor da extensão).

## Detalhes técnicos
- Mobile-first com Tailwind: layout single-column, chips de templates com mesmas cores semânticas usadas em `extension/content.css`.
- Botão "Copiar tudo" gera texto com cabeçalhos `## campo\nconteúdo` + assinatura no final.
- `gerarEvolucaoMobile` reaproveita 95% do código de `chat-generate.ts`; fatoramos a função de geração para `src/lib/gerar-evolucao.server.ts` e ambos endpoints chamam.
- Sem alteração de schema de banco.
