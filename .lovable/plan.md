## Objetivo
Renomear o bloco de configuração para "Assinatura do terapeuta responsável pela evolução" e garantir que esses dados preencham automaticamente o campo Assinatura da evolução na extensão.

## O que já existe
- Tabela `prompt_config` com `terapeuta_nome`, `terapeuta_conselho`, `terapeuta_especialidade`.
- Card em `/configuracoes` ("Dados do terapeuta") com Nome, Conselho/CPF e Especialidade.
- Endpoint `chat-generate` já devolve `terapeuta` + `dataAtual`.
- `extension/content.js` (v0.2.8) já preenche campos separados (terapeuta/conselho/especialidade/data) e tenta preencher um textarea/contenteditable de "assinatura".

## Mudanças

### 1. `src/routes/configuracoes.tsx`
- Renomear o card de **"Dados do terapeuta"** para **"Assinatura do terapeuta responsável pela evolução"**.
- Atualizar o texto de apoio: "Esses dados são inseridos automaticamente no campo Assinatura de cada evolução gerada. A data é preenchida com a data de hoje."

### 2. `extension/content.js`
- Reforçar a detecção do campo Assinatura no Clínica nas Nuvens:
  - Procurar `label`/`placeholder`/`name`/`id` contendo `assinatura|assinar|signature|rodapé|rodape`.
  - Suportar `<textarea>`, `<input type="text">` e `[contenteditable]`.
  - Formato padrão preenchido:
    ```
    {Nome}
    {Conselho/CPF}
    {Especialidade}
    Data: {DD/MM/AAAA}
    ```
  - Só sobrescreve se estiver vazio (mantém comportamento atual).
- Garantir que o bloco "Assinatura do terapeuta" exibido acima do chat use o mesmo título do painel para consistência ("Assinatura do terapeuta responsável pela evolução"), com link "editar" → `/configuracoes`.
- Bump `manifest.json` → `0.2.9` e regerar `public/agente-evolucao.zip`.

## Fora de escopo
- Múltiplos terapeutas (decisão anterior: apenas um).
- Mudança de schema (campos já existem).

## Entrega
Após aprovação: usuário baixa o novo `.zip (v0.2.9)` em **Configurações** e recarrega em `chrome://extensions`.
