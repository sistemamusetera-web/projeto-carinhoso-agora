## Objetivo
Refazer `/mobile` para ficar **visualmente idêntica ao painel flutuante** da extensão (mesmo header verde, mesmos cartões dobráveis, mesmos chips coloridos por grupo, mesmo botão "Gerar e preencher"), mantendo todas as funcionalidades já existentes (escolher paciente, chips, nota livre, IA, copiar campo a campo, assinatura automática).

## O que muda

### `src/routes/mobile.tsx` (reescrita do layout, lógica preservada)
Espelhar o markup do painel da extensão (`extension/content.js` linhas 496–549) e o CSS de `extension/content.css`, traduzido para Tailwind:

1. **Header** verde gradiente `#5a7e5f → #3d5841` com:
   - Título "Agente de Evolução"
   - Input do nome do paciente (igual `.evo-chat-paciente`)
   - Botões compactos: voltar / configurações
2. **Cartão "Assinatura"** (`<details>` recolhível) — mostra terapeuta vindo de Configurações + data BR, com link "editar" → `/configuracoes`. Réplica visual de `.evo-chat-signature`.
3. **Área de templates rápidos** com cabeçalho "⚡ Templates rápidos · N selecionado(s) · limpar", e grupos com:
   - Título colorido (ícone + nome do grupo + linha divisória na cor do grupo)
   - Chips arredondados com cor do grupo (estado ativo = preenchido, inativo = contorno) — idêntico a `.evo-tpl-chip`
4. **Caixa de nota livre** (textarea) substitui o "input + send" da extensão (no celular faz mais sentido textarea).
5. **Rodapé fixo** com:
   - Botão secundário "Limpar"
   - Botão primário gradiente "✨ Gerar evolução com IA"
6. **Tela de resultado** mantém os cartões por campo com botão "copiar" + "📋 Copiar tudo (com assinatura)" + assinatura no rodapé. Cores e tipografia alinhadas ao painel.

### Seleção de paciente
Manter o passo "escolher paciente" (não existe na extensão porque ela detecta da página), mas estilizar igual: cartões brancos com borda fina, hover verde, mesma fonte/spacing do painel.

### Sem mudanças em
- Server functions (`src/lib/evolucao-mobile.functions.ts`)
- Templates (`src/lib/templates-evolucao.ts`)
- Auth, rotas, manifest PWA, extensão Chrome

## Detalhes técnicos
- Tokens de cor copiados do CSS da extensão: header `#3d5841/#5a7e5f`, accent `#4b6b4f`, cinzas `#f7faf7 / #e5e7eb / #6b7280`.
- Cores dos grupos vêm de `TEMPLATES[i].cor` (já existe em `src/lib/templates-evolucao.ts`).
- Usa `<details>`/`<summary>` nativos para o cartão Assinatura (igual extensão).
- Mantém `RequireAuth` e os hooks `useServerFn` + React Query atuais.
- Continua otimizado para o viewport mobile (max-w-md), com rodapé fixo + `pb-28` no main.

## Resultado
A página `/mobile` aberta no celular fica **pixel-próxima** do painel flutuante que aparece no Clínica nas Nuvens no desktop: mesmo verde, mesmos chips coloridos por categoria, mesma ordem (Assinatura → Templates → Nota → Gerar), e mesma sensação tátil (chips arredondados, botão gradiente).