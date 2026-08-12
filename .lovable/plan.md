# Plano para trocar para Supabase Externo

O usuário deseja utilizar um projeto externo do Supabase em vez do Lovable Cloud. Isso permitirá que ele tenha controle total sobre o banco de dados e evite as instabilidades de rede do projeto atual.

## Ações Técnicas

### 1. Criar Interface de Configuração do Banco de Dados
- Adicionar uma nova seção em `src/routes/configuracoes.tsx` chamada "Conexão com Banco de Dados Externo".
- Campos necessários: `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- Opção para "Salvar e Alternar": as credenciais serão armazenadas no `localStorage`.

### 2. Modificar o Cliente Supabase para ser Dinâmico
- Alterar `src/integrations/supabase/client.ts` para verificar primeiro se existem credenciais no `localStorage`.
- Se existirem, usar o projeto externo. Se não, manter o fallback para as variáveis de ambiente (Lovable Cloud).

### 3. Sincronização e Feedback
- Adicionar um aviso visual no topo do site quando um banco externo estiver sendo utilizado.
- Explicar que os dados (pacientes, evoluções) não serão transferidos automaticamente entre os bancos.

## Detalhes Técnicos
- Armazenamento em `localStorage` é seguro para o cliente (Anon Key), permitindo que cada usuário use seu próprio banco se desejar, ou que o administrador configure um banco fixo para todos via código.
- Como o usuário pediu para "trocar", implementarei a lógica que permite essa substituição em tempo de execução.

---
**Nota:** Ao trocar para um banco externo, as tabelas (`pacientes`, `evolucoes`, `api_keys`, etc.) precisam ser criadas no novo projeto. Fornecerei as instruções SQL se o usuário solicitar.
