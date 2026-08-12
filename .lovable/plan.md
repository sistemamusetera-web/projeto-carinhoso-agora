# Plan: Fix Persistent RLS Policy Error for api_keys

The RLS error persists even after granting `GRANT ALL` to the `authenticated` role on your external Supabase. This indicates the policy `auth.uid() = user_id` is failing during the `INSERT` operation. This happens if `auth.uid()` returns null or doesn't match the `user_id` being sent.

## Proposed Changes

### Database Fix (External Supabase)
We will rewrite the policy to be more robust and explicitly check the session. We will also ensure the `authenticated` role has permissions on the schema.

### Application Logic Verification
Verify that `supabase.auth.getUser()` is actually returning a valid user before the mutation runs in `src/routes/configuracoes.tsx`.

## Technical Details

### SQL Commands to run in your Supabase SQL Editor:
```sql
-- 1. Ensure the schema is accessible
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Drop existing policy to recreate it
DROP POLICY IF EXISTS "own api_keys" ON public.api_keys;

-- 3. Create a more explicit policy for ALL operations
CREATE POLICY "Users can manage their own api_keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Re-apply grants just to be sure
GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;
```

### Debugging Steps
If the error persists:
1. Check if the "Supabase URL" and "Supabase Anon Key" in your settings are exactly the same as in your Supabase Dashboard.
2. Verify if the `auth.users` table in your external Supabase contains the user you are logged in with (the one shown in the app header).

## User Review Required
> [!IMPORTANT]
> Since you are using an **External Supabase**, you **must** execute the new SQL code below in your Supabase dashboard (SQL Editor).
