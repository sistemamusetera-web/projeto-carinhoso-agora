# Plano de Correção do Erro de Autenticação (Failed to Fetch)

O erro "Failed to fetch" ao tentar logar ou criar conta indica que o navegador não está conseguindo alcançar os servidores do Lovable Cloud (Supabase). Isso geralmente acontece por bloqueios locais no dispositivo do usuário (AdBlock, VPN, Firewall) ou instabilidades de DNS.

## Mudanças propostas

### Frontend (Interface de Login)
- [x] Adicionar detecção específica para o erro "Failed to fetch".
- [x] Exibir um alerta amigável com instruções de solução (desativar AdBlock, verificar internet, recarregar).
- [x] Adicionar botão de "Recarregar" direto no erro para facilitar a limpeza de estados corrompidos.

### Backend (Configuração)
- [ ] Verificar e garantir que os cabeçalhos CORS permitam todas as origens necessárias (já revisado em turnos anteriores).
- [ ] Manter os endpoints da extensão resilientes a falhas de rede.

## Detalhes Técnicos
- O erro é um `TypeError: Failed to fetch`, que no Supabase Auth ocorre quando a requisição `POST /auth/v1/token` falha antes de chegar ao servidor.
- Implementado estado `fetchError` no `src/routes/login.tsx` para capturar essa exceção específica.
- Instrução ao usuário: O erro é externo ao código (infraestrutura/rede), mas melhoramos o feedback visual para guiá-lo na solução.

## Próximos Passos
1. Aguardar feedback do usuário após ele seguir as novas instruções exibidas na tela de login.
2. Se o problema persistir apenas para um usuário, o problema é local no dispositivo dele.
