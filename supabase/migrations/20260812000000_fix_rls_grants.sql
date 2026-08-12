-- Adiciona concessões de acesso para o role authenticated e service_role
-- Isso é necessário para que a API do PostgREST (usada pelo cliente Supabase)
-- consiga interagir com as tabelas, mesmo com RLS ativado.

GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;

GRANT ALL ON TABLE public.pacientes TO authenticated;
GRANT ALL ON TABLE public.pacientes TO service_role;

GRANT ALL ON TABLE public.evolucoes TO authenticated;
GRANT ALL ON TABLE public.evolucoes TO service_role;

GRANT ALL ON TABLE public.prompt_config TO authenticated;
GRANT ALL ON TABLE public.prompt_config TO service_role;
