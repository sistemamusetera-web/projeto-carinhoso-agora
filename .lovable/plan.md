## Problema

Ao abrir o formulário, a extensão preenche corretamente os campos da Assinatura (nome do terapeuta, conselho, especialidade, data) usando `fillTherapistFields()`. Mas ao clicar em **"Gerar e preencher"**, o fluxo é:

1. `fillTherapistFields(terapeuta)` — preenche assinatura ✅
2. `fillFields(camposResp)` — itera **todos** os campos detectados (`chatState.fields`) e, para cada um, procura uma chave da resposta da IA cujo nome contenha (ou esteja contido em) o nome do campo. Como os campos de assinatura ("Nome", "Conselho", "Assinatura", "Data") também foram enviados à IA como `campos`, a IA devolve texto para eles e o `fillFields` **sobrescreve** o que `fillTherapistFields` acabou de colocar.

Resultado: os dados da Assinatura ficam "bagunçados" (substituídos por texto clínico genérico) após gerar.

## Correção (somente em `extension/content.js`)

1. **Marcar campos de assinatura/terapeuta** com um regex único (`SIG_FIELD_RX`) que casa com: `nome`, `terapeuta`, `profissional`, `responsável`, `psicólog[oa]`, `conselho`, `crp/crm/cro/cpf`, `registro`, `especialidade`, `área de atuação`, `formação`, `assinatura`, `assinar`, `signature`, `rodapé`, e variações de "data" associadas a sessão/atendimento/assinatura.

2. **Excluir esses campos da lista enviada à IA** em `generateAndFill()` (filtrar `chatState.fields` antes de montar `campos`), para que a IA nem tente gerar conteúdo para eles.

3. **Skip na `fillFields()`**: pular qualquer field cujo `nome` case com `SIG_FIELD_RX`, como cinto de segurança caso a IA ainda devolva uma chave parecida.

4. **Preservar dados já preenchidos**: em `fillFields`, se o elemento já tem valor (textarea/input/contenteditable não vazio) **e** o campo casa com `SIG_FIELD_RX`, não sobrescrever.

5. **Re-render da assinatura** continua igual após resposta (`chatState.renderSig(terapeuta)`), e `fillTherapistFields(terapeuta)` continua sendo chamado para reaplicar caso o site tenha limpado os campos.

6. Bumpar `manifest.json` para **0.7.1** e reempacotar `public/agente-evolucao.zip`.

Sem alterações em backend, UI da página /configuracoes ou outros arquivos.

## Validação

- Abrir o formulário → assinatura preenchida.
- Digitar nota e clicar "Gerar e preencher" → campos clínicos preenchidos, assinatura **intacta**.
- Mensagem do assistente continua mostrando os campos clínicos gerados.
