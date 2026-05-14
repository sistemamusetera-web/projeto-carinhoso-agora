## Mais templates prontos, profissionais e completos

Hoje há 12 grupos (Comunicação, Chegada, Abordagem, Interação, Participação, Recursos, Comportamento, Respostas, Plano, Observações, Próximos objetivos, Saída). A proposta é **densificar os grupos existentes** com mais variações clínicas e **adicionar 6 novos grupos** cobrindo dimensões que ainda faltam na musicoterapia.

### 1) Novos grupos em `extension/content.js` (constante `TEMPLATES`)

1. **Estado emocional 😊** (`emocional`, cor `#e11d48`)
   - Humor estável, eutímico
   - Humor irritável / lábil
   - Choro durante a sessão
   - Riso e expressões de prazer
   - Apatia / baixa expressividade
   - Ansiedade observável

2. **Vínculo terapêutico 💞** (`vinculo`, cor `#a21caf`)
   - Vínculo bem estabelecido e fortalecido
   - Vínculo em construção
   - Procurou a terapeuta espontaneamente
   - Manteve distância / esquiva inicial
   - Demonstrou confiança em propostas novas

3. **Aspectos musicais 🎶** (`musical`, cor `#0ea5e9`)
   - Engajamento rítmico (bateu palmas / acompanhou pulso)
   - Engajamento melódico (vocalizações afinadas)
   - Imitação rítmica de padrões propostos
   - Improvisação espontânea ao instrumento
   - Escolha autônoma de canção
   - Resposta corporal à música (dança/movimento)

4. **Aspectos sensoriais 🌈** (`sensorial`, cor `#f97316`)
   - Boa modulação sensorial
   - Hipersensibilidade auditiva
   - Busca por estímulo proprioceptivo/vibratório
   - Hipossensibilidade / busca intensa de estímulo
   - Tolerou bem volume e timbres variados

5. **Família / contexto 👨‍👩‍👧** (`familia`, cor `#0d9488`)
   - Familiar presente em sala
   - Familiar acompanhou da recepção
   - Devolutiva breve ao responsável
   - Orientações para casa entregues
   - Solicitada reunião de devolutiva

6. **Encaminhamentos / articulação 🔗** (`encaminhamentos`, cor `#2563eb`)
   - Sugerida articulação com fonoaudiologia
   - Sugerida articulação com terapia ocupacional
   - Sugerida articulação com psicologia
   - Sugerida articulação com psiquiatria/neurologia
   - Encaminhamento para reavaliação interna

### 2) Itens extras nos grupos existentes

- **Comunicação**: "Comunicação por trocas vocais", "Uso de CAA (PECS/pranchas)", "Iniciativa comunicativa espontânea"
- **Chegada**: "Chegou após escola/terapia anterior", "Chegou com queixa física relatada"
- **Abordagem**: "Abordagem mediada por canção"
- **Interação**: "Interação intermitente", "Buscou contato físico"
- **Participação**: "Participação flutuante", "Liderou momento da sessão"
- **Recursos**: "Objetos transicionais do paciente", "Recursos digitais (apps/áudio)"
- **Comportamento**: "Comportamento opositor pontual", "Auto-agressão sinalizada"
- **Respostas**: "Resposta acima do esperado", "Resposta inconsistente entre blocos"
- **Plano aplicado**: "Sessão de avaliação", "Sessão de fechamento de ciclo"
- **Observações**: "Mudança de rotina familiar relatada", "Início recente em outra terapia"
- **Próximos objetivos**: "Trabalhar imitação rítmica", "Ampliar tempo de permanência em atividade", "Inserir familiar em momento da sessão"
- **Saída**: "Saída antecipada por desregulação", "Saiu com tarefa musical para casa"

Cada item segue o padrão `{ label, frase }` com frase clínica completa em tom profissional (1ª pessoa terapêutica), igual ao estilo já existente.

### 3) `extension/content.css`

Adicionar variáveis de cor para os 6 novos grupos no bloco `/* Cores por grupo */`:

```css
.evo-tpl-group[data-grupo="emocional"]        { --evo-tpl-color: #e11d48; }
.evo-tpl-group[data-grupo="vinculo"]          { --evo-tpl-color: #a21caf; }
.evo-tpl-group[data-grupo="musical"]          { --evo-tpl-color: #0ea5e9; }
.evo-tpl-group[data-grupo="sensorial"]        { --evo-tpl-color: #f97316; }
.evo-tpl-group[data-grupo="familia"]          { --evo-tpl-color: #0d9488; }
.evo-tpl-group[data-grupo="encaminhamentos"]  { --evo-tpl-color: #2563eb; }
```

Sem outras mudanças de layout/CSS estrutural.

### 4) `extension/manifest.json`

Bump de versão para **0.9.4**.

### 5) Repackage

Gerar novamente `public/agente-evolucao.zip` com os arquivos atualizados.

### Fora do escopo

- Não alterar layout/estrutura do painel flutuante
- Não mudar `system prompt` da IA (já cobre todas as seções)
- Não tocar em UI React de `/configuracoes`
- Não mexer em assinatura, conexão, autenticação ou backend
