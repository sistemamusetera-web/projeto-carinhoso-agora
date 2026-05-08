## Adicionar mais templates alinhados ao formulário de evolução

O formulário de evolução tem 8 seções: **Descrição da sessão, Recursos utilizados, Comportamento, Respostas terapêuticas, Participação, Plano aplicado, Observações, Próximos objetivos**.

Hoje os templates cobrem só: Comunicação, Chegada, Abordagem, Interação, Participação, Saída — faltam grupos diretamente ligados às seções do formulário.

### Novos grupos a adicionar em `extension/content.js` (constante `TEMPLATES`)

1. **Recursos 🎼** (key: `recursos`) — cor teal/índigo
   - Instrumentos melódicos (teclado/violão)
   - Instrumentos de percussão (tambor, chocalho, ovinho)
   - Canções de referência / playlist personalizada
   - Recursos visuais (figuras, PECS)
   - Recursos corporais (movimento, dança)

2. **Comportamento 🧠** (key: `comportamento`) — cor índigo
   - Bem regulado durante toda a sessão
   - Episódios de desregulação
   - Auto-regulação com apoio
   - Estereotipias presentes
   - Busca por contato/afeto

3. **Respostas terapêuticas 🌱** (key: `respostas`) — cor verde
   - Boa resposta às intervenções
   - Resposta parcial
   - Necessidade de muitas pistas
   - Avanço em relação à sessão anterior
   - Manutenção do nível anterior

4. **Plano aplicado 📋** (key: `plano`) — cor cinza-azulado
   - Plano seguido integralmente
   - Plano adaptado durante a sessão
   - Foco em improviso musical livre
   - Foco em canção estruturada
   - Foco em escuta ativa

5. **Observações 🔎** (key: `observacoes`) — cor âmbar
   - Familiar relatou intercorrência na semana
   - Mudança de medicação informada
   - Ausência justificada na semana anterior
   - Avaliação multidisciplinar agendada

6. **Próximos objetivos 🎯** (key: `proximos`) — cor rosa/violeta
   - Manter trabalho de turno (esperar/responder)
   - Ampliar repertório de canções
   - Estimular comunicação verbal/CAA
   - Trabalhar regulação emocional via música
   - Inserir novo instrumento na próxima sessão

Também acrescentar 1–2 itens nos grupos existentes onde fizer sentido (ex.: Chegada → "Chegou após troca de medicação"; Saída → "Saiu acompanhado do responsável").

### Mudanças técnicas

- **`extension/content.js`**: estender o array `TEMPLATES` com os 6 novos grupos acima e itens extras nos existentes. Cada item segue o padrão `{ label, frase }` com frase clínica completa em 1ª pessoa profissional (igual ao tom atual).
- **`extension/content.css`**: adicionar regras `[data-grupo="recursos|comportamento|respostas|plano|observacoes|proximos"]` com `--evo-tpl-color` para cada um, mantendo a paleta coerente:
  - recursos: `#0891b2`
  - comportamento: `#4f46e5`
  - respostas: `#16a34a`
  - plano: `#475569`
  - observacoes: `#ca8a04`
  - proximos: `#be185d`
- **`extension/manifest.json`**: bump para **0.9.3**.
- Repackage `public/agente-evolucao.zip`.

### Fora do escopo

- Não alterar layout/CSS estrutural do painel
- Não mudar o system prompt (ele já cobre todas as seções)
- Não tocar em UI React de `/configuracoes`
