import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — Evolução" },
      { name: "description", content: "Acesse o painel de evoluções terapêuticas." },
    ],
  }),
});

function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFetchError(false);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.auth.getSession();
        window.location.href = "/";
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setFetchError(true);
      }
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[image:var(--gradient-primary)] p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Evolução</span>
        </Link>
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Evoluções terapêuticas inteligentes, no tempo do paciente.
          </h1>
          <p className="max-w-md text-primary-foreground/85">
            Cadastre seus pacientes, defina objetivos clínicos e deixe a extensão preencher as evoluções diárias no
            Clínica nas Nuvens.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© Evolução · Painel + Extensão</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Acesse seu painel de evoluções."
              : "Crie sua conta de terapeuta para começar."}
          </p>

          {fetchError && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Conexão</AlertTitle>
              <AlertDescription className="text-xs space-y-2">
                <p>O sistema não conseguiu localizar o servidor de autenticação (Erro de DNS).</p>
                
                {localStorage.getItem('EXTERNAL_SUPABASE_URL') ? (
                  <>
                    <p className="font-semibold text-amber-600 dark:text-amber-400 mt-2">Você está usando um Supabase Externo.</p>
                    <p>Verifique se o seu projeto em <strong>{localStorage.getItem('EXTERNAL_SUPABASE_URL')}</strong> está ativo e se a chave Anon está correta.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 text-[10px]"
                      onClick={() => {
                        localStorage.removeItem('EXTERNAL_SUPABASE_URL');
                        localStorage.removeItem('EXTERNAL_SUPABASE_ANON_KEY');
                        window.location.reload();
                      }}
                    >
                      Remover Banco Externo e Usar Padrão
                    </Button>
                  </>
                ) : (
                  <>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>O serviço do banco de dados pode estar temporariamente <strong>pausado ou em manutenção</strong>.</li>
                      <li>Clique em <strong>"View Backend"</strong> no topo do painel do Lovable para verificar se o serviço está ativo.</li>
                      <li>Se você tiver créditos expirados ou serviços pausados, o backend pode ficar offline.</li>
                    </ul>
                  </>
                )}

                <div className="flex flex-col gap-2 mt-4">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full h-9 text-xs gap-2"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-3 w-3" /> Tentar novamente agora
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="terapeuta@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setFetchError(false);
            }}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </Card>
      </div>
    </div>
  );
}