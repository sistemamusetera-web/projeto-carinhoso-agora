# Plan: Fix RLS for api_keys and add missing GRANTs

The user is experiencing an RLS error (`new row violates row-level security policy`) when trying to generate a new API key. This usually happens in Supabase projects because while policies are defined, the necessary `GRANT` statements are missing for the `authenticated` role to interact with the table via the Data API.

## Proposed Changes

### Database Migrations
- Add `GRANT` statements for all public tables (`pacientes`, `evolucoes`, `prompt_config`, `api_keys`) to the `authenticated` and `service_role` roles.
- Ensure the `api_keys` table has explicit `INSERT` permissions granted.

### Application Logic (Verification)
- Verify if there are any issues with the `user_id` being passed during key generation in `src/routes/configuracoes.tsx`. (The current code seems correct as it uses `user!.id`).

## Technical Details

### SQL Commands to run
```sql
-- Grants for api_keys
GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;

-- Grants for other tables to ensure they also work correctly
GRANT ALL ON TABLE public.pacientes TO authenticated;
GRANT ALL ON TABLE public.pacientes TO service_role;

GRANT ALL ON TABLE public.evolucoes TO authenticated;
GRANT ALL ON TABLE public.evolucoes TO service_role;

GRANT ALL ON TABLE public.prompt_config TO authenticated;
GRANT ALL ON TABLE public.prompt_config TO service_role;
```

Note: Since the user is using an **External Supabase**, I must provide these commands for them to run in their Supabase SQL Editor, as I cannot run migrations directly on their external database. I will also apply them to the local project migrations to ensure consistency for future users.

## User Review Required
> [!IMPORTANT]
> Since you are using an **External Supabase**, you **must** execute the SQL code below in your Supabase dashboard (SQL Editor) for the fix to take effect on your database.
