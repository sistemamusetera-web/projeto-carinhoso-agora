import { createFileRoute } from "@tanstack/react-router";
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
import { Key, Plus, Trash2, Copy, Download, Save, Smartphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  component: () => (<RequireAuth><ConfigPage /></RequireAuth>),
});

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ConfigPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState<any>(null);

  const { data: cfg } = useQuery({
    queryKey: ["prompt_config", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("prompt_config").select("*").eq("user_id", user!.id).maybeSingle();
      if (!data) {
        const { data: ins } = await supabase.from("prompt_config").insert({ user_id: user!.id }).select().single();
        return ins;
      }
      return data;
    },
  });

  const { data: keys } = useQuery({
    queryKey: ["api_keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const savePrompt = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prompt_config").update({
        system_prompt: promptForm.system_prompt,
        estilo_padrao: promptForm.estilo_padrao,
        terapeuta_nome: promptForm.terapeuta_nome ?? "",
        terapeuta_conselho: promptForm.terapeuta_conselho ?? "",
        terapeuta_especialidade: promptForm.terapeuta_especialidade ?? "",
      }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["prompt_config"] }); setPromptForm(null); },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const raw = "evo_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const hash = await sha256(raw);
      const { error } = await supabase.from("api_keys").insert({
        user_id: user!.id, key_hash: hash, key_prefix: raw.slice(0, 12),
      });
      if (error) throw error;
      return raw;
    },
    onSuccess: (raw) => { setNewKey(raw); qc.invalidateQueries({ queryKey: ["api_keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chave removida"); qc.invalidateQueries({ queryKey: ["api_keys"] }); },
  });

  const c = promptForm ?? cfg;

  function downloadExtensao() {
    fetch("/agente-evolucao.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Falha no download: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "agente-evolucao.zip";
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Download iniciado");
      })
      .catch((e) => toast.error(e.message));
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">Configurações</h1>
          <p className="mt-1 text-muted-foreground">Gerencie a assinatura, as chaves da extensão e o instalador.</p>
        </div>

        {c && (
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">Assinatura do terapeuta responsável pela evolução</h2>
            <p className="mt-1 text-sm text-muted-foreground">Esses dados são inseridos automaticamente no campo Assinatura de cada evolução gerada pela extensão. A data é preenchida com a data de hoje.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Nome</Label>
                <Input value={c.terapeuta_nome ?? ""} onChange={(e) => setPromptForm({ ...c, terapeuta_nome: e.target.value })} />
              </div>
              <div className="space-y-2"><Label>Conselho / CPF</Label>
                <Input placeholder="Ex.: CRP 06/12345" value={c.terapeuta_conselho ?? ""} onChange={(e) => setPromptForm({ ...c, terapeuta_conselho: e.target.value })} />
              </div>
              <div className="space-y-2"><Label>Especialidade</Label>
                <Input value={c.terapeuta_especialidade ?? ""} onChange={(e) => setPromptForm({ ...c, terapeuta_especialidade: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" disabled={!promptForm} onClick={() => setPromptForm(null)}>Cancelar</Button>
              <Button disabled={!promptForm || savePrompt.isPending} onClick={() => savePrompt.mutate()} className="gap-1.5">
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold">Extensão Chrome</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Instale a extensão para gerar evoluções automaticamente dentro do Clínica nas Nuvens.
          </p>
          <Button onClick={downloadExtensao} className="mt-4 gap-2"><Download className="h-4 w-4" /> Baixar extensão (.zip)</Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Após baixar: descompacte → abra <code>chrome://extensions</code> → ative o "Modo desenvolvedor" → "Carregar sem compactação" → selecione a pasta.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#4b6b4f]/10 p-2.5">
              <Smartphone className="h-5 w-5 text-[#4b6b4f]" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold">Versão mobile (celular)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Abra no seu celular para gerar evoluções localmente e copiar/colar no app do Clínica nas Nuvens.
                Funciona em iOS e Android, sem instalar nada.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/mobile"
                  className="inline-flex items-center gap-2 rounded-md bg-[#4b6b4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5841]"
                >
                  <Smartphone className="h-4 w-4" /> Versão mobile (copiar/colar)
                </Link>
                <Link
                  to="/mobile-bookmarklet"
                  className="inline-flex items-center gap-2 rounded-md border border-[#4b6b4f] bg-white px-4 py-2 text-sm font-medium text-[#4b6b4f] hover:bg-[#4b6b4f]/5"
                >
                  📑 Bookmarklet iPhone (auto-preenchimento)
                </Link>
              </div>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong>Instalar como app no celular:</strong>
                </p>
                <p>
                  • <strong>iPhone (Safari):</strong> abra <code>/mobile</code>, toque em Compartilhar
                  e em "Adicionar à Tela de Início".
                </p>
                <p>
                  • <strong>Android (Chrome):</strong> abra <code>/mobile</code>, toque no menu
                  (⋮) e em "Instalar app" ou "Adicionar à tela inicial".
                </p>
              </div>
            </div>
          </div>
        </Card>


        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Chaves de API</h2>
              <p className="mt-1 text-sm text-muted-foreground">A extensão usa essa chave para se conectar ao painel.</p>
            </div>
            <Button onClick={() => createKey.mutate()} disabled={createKey.isPending} className="gap-2">
              <Plus className="h-4 w-4" /> Nova chave
            </Button>
          </div>

          {newKey && (
            <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-4">
              <div className="text-sm font-medium text-foreground">Copie agora — não será mostrada novamente:</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background p-2 text-xs">{newKey}</code>
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copiado"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewKey(null)}>Ok, anotei</Button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {!keys?.length && <div className="text-sm text-muted-foreground">Nenhuma chave criada ainda.</div>}
            {keys?.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-mono text-sm">{k.key_prefix}…</div>
                    <div className="text-xs text-muted-foreground">{k.last_used_at ? `Usada por último: ${new Date(k.last_used_at).toLocaleString("pt-BR")}` : "Nunca usada"}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteKey.mutate(k.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
