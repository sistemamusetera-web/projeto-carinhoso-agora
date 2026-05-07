
## Objetivo

Trocar o fluxo atual ("clicar → IA gera tudo sozinha → cola na textarea") por:

1. Usuário clica em **Gerar evolução com IA** dentro do Clínica nas Nuvens
2. Abre um **mini-chat lateral** na própria página
3. Terapeuta digita em linguagem natural as principais demandas, desafios, recursos usados, observações da sessão
4. IA processa essas notas + perfil + histórico do paciente
5. IA devolve um **JSON estruturado** com um valor por campo do formulário (Como a criança chegou, Recursos usados, Dinâmicas usadas, Comportamento, etc.)
6. Extensão preenche **cada campo individualmente** na tela do prontuário
7. Banner pede revisão antes do terapeuta clicar em **Finalizar atendimento**

## Mudanças

### 1. Extensão Chrome — novo painel de chat (`extension/`)

- `chat.css` + injeção de um painel lateral fixo (largura ~380px, à direita) quando o usuário clica no botão "Gerar evolução com IA" dentro de um atendimento aberto.
- Estrutura do painel:
  - Cabeçalho com nome do paciente detectado
  - Área de mensagens (estilo chat: terapeuta + assistente)
  - Campo de texto multi-linha + botão "Enviar"
  - Botões de ação: **Preencher formulário**, **Refazer**, **Fechar**
- Estado mantido em memória da página (não persiste entre reloads).
- Mensagens iniciais do assistente sugerindo o que descrever ("Conte como foi a sessão: como a criança chegou, recursos usados, comportamentos, respostas, próximos passos…").

### 2. Detecção de campos do formulário (`content.js`)

Hoje preenche só a maior textarea. Precisa mapear os campos visíveis (screenshot 6):
- Como a criança chegou
- Recursos usados
- Dinâmicas usadas
- (e outros campos do modelo "Evolução terapêutica Musicoterapia")

Estratégia: para cada `<label>`/título de campo visível, achar o input/textarea associado (próximo irmão, ou via `for`/`id`). Construir um array `[{ campoNome, elemento }]` e enviar os nomes dos campos para o backend, para que a IA gere exatamente esses.

### 3. Backend — novo endpoint `/api/public/extension/chat-generate`

Substitui (ou complementa) o atual `generate.ts`. Recebe:
```
{
  pacienteNome, pacienteIdExterno,
  mensagens: [{role, content}],   // conversa do chat
  campos: ["Como a criança chegou", "Recursos usados", ...]
}
```

Fluxo no handler:
1. Autentica via `x-api-key` (igual hoje)
2. Resolve paciente (igual hoje)
3. Carrega perfil + objetivos + 5 últimas evoluções
4. Chama Lovable AI Gateway com **tool calling / structured output**, forçando JSON com chaves = `campos`
5. Salva uma `evolucao` consolidada (concatenando todos os campos) no banco
6. Retorna `{ campos: { "Como a criança chegou": "...", "Recursos usados": "...", ... }, evolucaoId }`

System prompt instrui: usar SOMENTE as observações do terapeuta + histórico, não inventar, manter coerência clínica, estilo configurado em `prompt_config`.

### 4. Preenchimento multi-campo (`content.js`)

Após receber a resposta, para cada `{campoNome, elemento}`:
- Se o nome bate (case-insensitive, normalizado) com uma chave do JSON → `setNativeValue(elemento, valor)` disparando `input`/`change` para o React/Vue do Clínica nas Nuvens reconhecer.
- Campos sem match ficam vazios (terapeuta vê e completa).
- Banner: "Campos preenchidos. Revise antes de finalizar."

### 5. Botões extras nas telas (screenshots 4 e 5)

Manter botão "Gerar evolução com IA" também na tela de **Atendimentos do dia** (lista) e no **Prontuário**, mas nessas telas o clique apenas navega/abre o atendimento — o chat só aparece dentro do atendimento aberto (onde os campos existem).

### 6. Repackage do `.zip`

Re-rodar o build do zip em `public/agente-evolucao.zip` após as mudanças.

## Fora de escopo agora

- Persistir histórico do chat (cada sessão é efêmera).
- Voz / áudio.
- Edição inline campo-a-campo dentro do chat (terapeuta edita direto no formulário do Clínica nas Nuvens).

## Pergunta antes de implementar

Confirma 2 pontos:

1. **Detecção de campos**: posso assumir que os labels visíveis no formulário (ex: "Como a criança chegou", "Recursos usados", "Dinâmicas usadas") são fixos por modelo de atendimento, ou cada terapeuta tem nomes diferentes? Se forem dinâmicos, a extensão lê os labels da tela em tempo real (já é o plano) — só quero confirmar que está ok a IA gerar baseada nos nomes que encontrar, sem você cadastrar o template antes.

2. **Comportamento se faltar info**: se o terapeuta escrever pouca coisa no chat (ex: "sessão tranquila, trabalhamos ritmo"), a IA deve (a) preencher tudo extrapolando do histórico e perfil, ou (b) preencher só o que dá pra inferir e deixar os outros vazios pra ele completar?
