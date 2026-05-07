import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Sparkles, Trash2, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes/$id")({
  component: () => (<RequireAuth><PacienteDetail /></RequireAuth>),
});

function PacienteDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const { data } = useQuery({
    queryKey: ["paciente", id],
    queryFn: async () => {
      const [p, e] = await Promise.all([
        supabase.from("pacientes").select("*").eq("id", id).single(),
        supabase.from("evolucoes").select("*").eq("paciente_id", id).order("created_at", { ascending: false }),
      ]);
      if (p.error) throw p.error;
      return { paciente: p.data, evolucoes: e.data ?? [] };
    },
  });

  const paciente = form ?? data?.paciente;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pacientes").update({
        nome: paciente.nome,
        nome_externo_id: paciente.nome_externo_id || null,
        perfil: paciente.perfil,
        objetivos: paciente.objetivos,
        ativo: paciente.ativo,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["paciente", id] }); setForm(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pacientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Paciente removido"); nav({ to: "/pacientes" }); },
  });

  async function gerarEvolucao() {
    if (!data) return;
    setGenerating(true);
    try {
      const historico = data.evolucoes.slice(0, 5).map((x) => x.conteudo);
      const { data: result, error } = await supabase.functions.invoke("gerar-evolucao", {
        body: {
          paciente: { nome: data.paciente.nome, perfil: data.paciente.perfil, objetivos: data.paciente.objetivos, estilo: data.paciente.estilo },
          historico,
        },
      });
      if (error) throw error;
      const conteudo = (result as any).evolucao as string;
      const { error: insErr } = await supabase.from("evolucoes").insert({
        user_id: user!.id, paciente_id: id, conteudo, origem: "manual",
      });
      if (insErr) throw insErr;
      toast.success("Evolução gerada");
      qc.invalidateQueries({ queryKey: ["paciente", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }

  if (!data) return <div className="min-h-screen"><Header /><div className="container py-10">Carregando...</div></div>;

  const p = form ?? data.paciente;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link to="/pacientes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Pacientes
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">Perfil clínico</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-2"><Label>Nome</Label>
                <Input value={p.nome} onChange={(e) => setForm({ ...p, nome: e.target.value })} />
              </div>
              <div className="space-y-2"><Label>ID no Clínica nas Nuvens</Label>
                <Input value={p.nome_externo_id ?? ""} onChange={(e) => setForm({ ...p, nome_externo_id: e.target.value })} />
              </div>
              <div className="space-y-2"><Label>Perfil</Label>
                <Textarea rows={4} value={p.perfil} onChange={(e) => setForm({ ...p, perfil: e.target.value })} />
              </div>
              <div className="space-y-2"><Label>Objetivos terapêuticos</Label>
                <Textarea rows={4} value={p.objetivos} onChange={(e) => setForm({ ...p, objetivos: e.target.value })} />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover paciente?")) remove.mutate(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!form} onClick={() => setForm(null)}>Cancelar</Button>
                  <Button disabled={!form || save.isPending} onClick={() => save.mutate()} className="gap-1.5">
                    <Save className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6 bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">Gerar evolução agora</h3>
                  <p className="mt-0.5 text-sm opacity-90">Usa perfil + últimas 5 sessões como contexto.</p>
                </div>
                <Button variant="secondary" disabled={generating} onClick={gerarEvolucao} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {generating ? "Gerando..." : "Gerar"}
                </Button>
              </div>
            </Card>

            <h3 className="font-display text-lg font-semibold">Histórico de evoluções</h3>
            {!data.evolucoes.length ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma evolução ainda.</Card>
            ) : (
              <div className="space-y-3">
                {data.evolucoes.map((e) => (
                  <Card key={e.id} className="p-5">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-0.5">{e.origem === "extensao" ? "extensão" : "manual"}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}</span>
                        <button onClick={() => { navigator.clipboard.writeText(e.conteudo); toast.success("Copiado"); }} className="hover:text-foreground">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{e.conteudo}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
