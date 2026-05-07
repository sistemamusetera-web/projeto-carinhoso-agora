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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes")({
  component: () => (
    <RequireAuth><PacientesPage /></RequireAuth>
  ),
});

function PacientesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data: pacientes } = useQuery({
    queryKey: ["pacientes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: any) => {
      const { data, error } = await supabase
        .from("pacientes")
        .insert({ ...form, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => {
      toast.success("Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      setOpen(false);
      nav({ to: "/pacientes/$id", params: { id: p.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = pacientes?.filter((p) =>
    p.nome.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Pacientes</h1>
            <p className="mt-1 text-muted-foreground">
              {pacientes?.length ?? 0} no total
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo paciente</Button>
            </DialogTrigger>
            <NovoPacienteDialog onSubmit={(d) => create.mutate(d)} loading={create.isPending} />
          </Dialog>
        </div>

        <div className="mb-6 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente..."
            className="pl-9"
          />
        </div>

        {!filtered?.length ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum paciente cadastrado ainda.</p>
            <Button className="mt-4 gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Adicionar paciente
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} to="/pacientes/$id" params={{ id: p.id }}>
                <Card className="group h-full p-5 transition-all hover:shadow-[var(--shadow-soft)]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display text-lg font-semibold">{p.nome}</div>
                      {p.nome_externo_id && (
                        <div className="text-xs text-muted-foreground">ID externo: {p.nome_externo_id}</div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {p.perfil || "Sem perfil definido"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NovoPacienteDialog({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ nome: "", nome_externo_id: "", perfil: "", objetivos: "" });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo paciente</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>ID no Clínica nas Nuvens (opcional)</Label>
          <Input value={form.nome_externo_id} onChange={(e) => setForm({ ...form, nome_externo_id: e.target.value })} placeholder="usado pela extensão para casar o paciente" />
        </div>
        <div className="space-y-2">
          <Label>Perfil clínico</Label>
          <Textarea rows={3} value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })} placeholder="Ex.: Paciente de 8 anos, TEA, foco em integração sensorial..." />
        </div>
        <div className="space-y-2">
          <Label>Objetivos terapêuticos</Label>
          <Textarea rows={3} value={form.objetivos} onChange={(e) => setForm({ ...form, objetivos: e.target.value })} placeholder="Ex.: Aumentar atenção compartilhada, reduzir ecolalia..." />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>{loading ? "..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
