ALTER TABLE public.prompt_config
  ADD COLUMN IF NOT EXISTS terapeuta_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terapeuta_conselho text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terapeuta_especialidade text NOT NULL DEFAULT '';