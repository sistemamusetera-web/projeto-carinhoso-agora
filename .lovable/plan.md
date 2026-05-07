## Diagnóstico

Pela captura você enviou:

- O painel mostra **"1 campo(s) detectado(s): Texto"** — ou seja, a extensão **não está reconhecendo** os campos reais do formulário ("Como a criança chegou", "Recursos usados", "Dinâmicas usadas", etc.). Está achando só 1 input e dando o nome errado ("Texto", provavelmente vindo de um placeholder ou heading distante).
- O botão fica preso em **"Gerando…"**: como só 1 campo foi enviado, a IA até pode responder, mas se o service worker da extensão dorme durante o fetch (>30s) o callback nunca volta, e a UI nunca sai do "Gerando…".

Causas:

1. `findLabelFor()` percorre ancestrais de forma frágil — no Clínica nas Nuvens os rótulos ("Como a criança chegou", "Recursos usados"…) ficam em **divs irmãs acima** do `<input>`, não em `<label for=…>`. O fallback acaba pegando textos genéricos ("Texto").
2. Os campos abaixo da dobra ("Dinâmicas usadas", "Comportamento"…) podem nem estar no DOM ainda enquanto não rola.
3. O `chrome.runtime.sendMessage` espera o callback do background. Se a chamada à IA demora muito ou o worker é encerrado, a UI fica eternamente em "Gerando…" sem mensagem de erro.
4. Não há timeout/retry visível para o usuário.

## O que vou fazer

### 1. Detecção de campos muito mais robusta (`extension/content.js`)
- Antes de mapear, **rolar o painel da evolução até o fim** para forçar o React a montar todos os campos, depois voltar para o topo.
- Trocar `findLabelFor` por uma heurística específica para o Clínica nas Nuvens:
  - subir a árvore até encontrar um container "card de campo" (div que tem **um único input/textarea** dentro);
  - dentro desse container, pegar o **primeiro texto curto** (≤ 80 chars) que **não** seja "Obrigatório", asterisco ou o próprio valor;
  - se nada bater, cair para `<label for>` e por último `placeholder`.
- Ignorar inputs de busca/menu (largura pequena, dentro de header/sidebar, com placeholder tipo "Pesquisar").
- Mostrar no painel a lista detectada para você conferir antes de gerar.

### 2. Mensageria confiável entre content script e background
- Adicionar **timeout de 90 s** no `chrome.runtime.sendMessage`: se passar disso, mostra "A geração demorou demais, tente novamente".
- Tratar `chrome.runtime.lastError` (worker reciclado): nesse caso, refazer a chamada uma vez automaticamente.
- No `background.js`, manter o worker vivo durante o fetch usando `chrome.alarms` curto + log explícito de erro de rede.

### 3. Feedback visual
- Substituir o estado "Gerando…" por uma barra com etapas: "Enviando observações → Consultando IA → Preenchendo campos".
- Em caso de erro, mostrar a mensagem real (status HTTP, texto do servidor) dentro do chat, não só no console.
- Botão **"Re-detectar campos"** no header do painel para rodar a varredura manualmente após você rolar a página.

### 4. Endpoint do painel (`/api/public/extension/chat-generate`)
- Adicionar `AbortController` com timeout de 60 s na chamada ao Lovable AI Gateway, devolvendo erro claro em vez de pendurar a request.
- Logar no servidor (console) a quantidade de campos recebidos e o tempo da chamada para diagnosticar futuros casos de lentidão.

### Fora do escopo (não vou mexer agora)
- Persistência do chat entre sessões.
- Geração em background com polling (a stack overflow sugere isso, mas a chamada normal cabe bem em <60 s; só faria sentido se a IA estiver consistentemente passando do limite — me avisa se acontecer).
- Mudar a UI da página de Configurações.

## Como você vai testar depois
1. Eu regero o `.zip` v0.2.1; baixe em **Configurações** e recarregue em `chrome://extensions`.
2. Abra um atendimento e clique no botão flutuante. O painel deve listar **todos** os campos do modelo (não só "Texto").
3. Se faltar algum campo, role o formulário até o fim e clique em **"Re-detectar campos"** — me mande print da lista para eu ajustar a heurística.
