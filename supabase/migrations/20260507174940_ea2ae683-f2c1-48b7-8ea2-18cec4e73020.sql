
-- Tabela de pacientes
CREATE TABLE public.pacientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  nome_externo_id TEXT,
  perfil TEXT NOT NULL DEFAULT '',
  objetivos TEXT NOT NULL DEFAULT '',
  estilo TEXT NOT NULL DEFAULT 'descritivo',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pacientes_user_id_idx ON public.pacientes(user_id);
CREATE INDEX pacientes_nome_externo_idx ON public.pacientes(user_id, nome_externo_id);

-- Tabela de evoluções
CREATE TABLE public.evolucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','extensao')),
  confirmada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX evolucoes_paciente_idx ON public.evolucoes(paciente_id, created_at DESC);
CREATE INDEX evolucoes_user_idx ON public.evolucoes(user_id, created_at DESC);

-- Configuração de prompt por terapeuta
CREATE TABLE public.prompt_config (
  user_id UUID NOT NULL PRIMARY KEY,
  system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente terapêutico especializado em evoluções clínicas. Gere uma evolução terapêutica profissional baseada nos dados do paciente. REGRAS: não invente dados clínicos inexistentes; mantenha coerência com sessões anteriores; use linguagem profissional clínica; estruture com Descrição da sessão, Recursos utilizados, Comportamento, Respostas terapêuticas, Participação, Plano aplicado, Observações e Próximos objetivos; evite repetição literal de textos anteriores.',
  modelo TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  estilo_padrao TEXT NOT NULL DEFAULT 'descritivo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chaves de API para extensão (hasheadas)
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL DEFAULT 'Extensão Chrome',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_hash_idx ON public.api_keys(key_hash);
CREATE INDEX api_keys_user_idx ON public.api_keys(user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER pacientes_touch BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER prompt_config_touch BEFORE UPDATE ON public.prompt_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pacientes" ON public.pacientes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own evolucoes" ON public.evolucoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own prompt_config" ON public.prompt_config FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own api_keys" ON public.api_keys FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
