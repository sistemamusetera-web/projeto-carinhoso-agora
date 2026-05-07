import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        nav({ to: "/" });
      }
    } catch (err: any) {
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
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </Card>
      </div>
    </div>
  );
}
