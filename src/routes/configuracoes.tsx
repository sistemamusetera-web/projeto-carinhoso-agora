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
import { Key, Plus, Trash2, Copy, Download, Save, Smartphone, Sparkles, Database as DBIcon, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [geminiKey, setGeminiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [extUrl, setExtUrl] = useState(localStorage.getItem('EXTERNAL_SUPABASE_URL') || "");
  const [extKey, setExtKey] = useState(localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY') || "");
  const [showExternalDB, setShowExternalDB] = useState(false);
  const [dbStatus, setDbStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [dbError, setDbError] = useState<string | null>(null);

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
        gemini_api_key: promptForm.gemini_api_key,
      } as any).eq("user_id", user!.id);
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
          <p className="mt-1 text-muted-foreground">Gerencie a assinatura, as chaves da extensão e a conexão com o banco de dados.</p>
        </div>

        {localStorage.getItem('EXTERNAL_SUPABASE_URL') && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Banco de Dados Externo Ativo</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500">
              Você está conectado a um projeto do Supabase externo. Certifique-se de que as tabelas necessárias foram criadas.
            </AlertDescription>
          </Alert>
        )}

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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Inteligência Artificial (Gemini)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Insira sua chave da API do Google Gemini para evoluções mais precisas e humanas.
                Se não configurada, o sistema usará o motor local sem custos.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowGemini(!showGemini)}>
              {c?.gemini_api_key ? "Alterar chave" : "Configurar"}
            </Button>
          </div>
          
          {(showGemini || !c?.gemini_api_key) && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Chave de API do Gemini</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    placeholder="Cole sua chave aqui..." 
                    value={geminiKey || c?.gemini_api_key || ""} 
                    onChange={(e) => setGeminiKey(e.target.value)} 
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setPromptForm({ ...c, gemini_api_key: geminiKey });
                      setTimeout(() => savePrompt.mutate(), 100);
                      setShowGemini(false);
                    }}
                  >
                    Salvar chave
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você pode obter uma chave gratuita no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
                </p>
              </div>
            </div>
          )}
          {c?.gemini_api_key && !showGemini && (
            <div className="mt-2 text-xs text-success flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Chave configurada e ativa
            </div>
          )}
        </Card>

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
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <DBIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">Banco de Dados Externo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use seu próprio projeto do Supabase para evitar instabilidades de rede.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowExternalDB(!showExternalDB)}>
              {localStorage.getItem('EXTERNAL_SUPABASE_URL') ? "Gerenciar Conexão" : "Configurar"}
            </Button>
          </div>

          {showExternalDB && (
            <div className="mt-4 space-y-4 border-t pt-4">
              {dbStatus === "success" && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-400">Conexão Bem-sucedida!</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-500">
                    O sistema conseguiu se comunicar com o seu Supabase externo.
                  </AlertDescription>
                </Alert>
              )}

              {dbStatus === "error" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro de Conexão</AlertTitle>
                  <AlertDescription>
                    {dbError || "Não foi possível conectar ao banco de dados externo. Verifique a URL e a Chave Anon."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Supabase URL</Label>
                  <Input 
                    placeholder="https://xxxx.supabase.co" 
                    value={extUrl} 
                    onChange={(e) => setExtUrl(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supabase Anon Key</Label>
                  <Input 
                    type="password" 
                    placeholder="eyJhbGciOiJIUzI1Ni..." 
                    value={extKey} 
                    onChange={(e) => setExtKey(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground max-w-md">
                  <strong>Atenção:</strong> Ao salvar, você será deslogado e o sistema recarregará usando o novo banco. 
                  Os dados do Lovable Cloud não serão migrados.
                </p>
                <div className="flex gap-2">
                  {localStorage.getItem('EXTERNAL_SUPABASE_URL') && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                      localStorage.removeItem('EXTERNAL_SUPABASE_URL');
                      localStorage.removeItem('EXTERNAL_SUPABASE_ANON_KEY');
                      window.location.reload();
                    }}>
                      Remover e Usar Padrão
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    disabled={dbStatus === "testing"}
                    onClick={async () => {
                      if (!extUrl || !extKey) {
                        toast.error("Preencha URL e Chave");
                        return;
                      }
                      
                      setDbStatus("testing");
                      setDbError(null);
                      
                      try {
                        const tempClient = (await import('@supabase/supabase-js')).createClient(extUrl.trim(), extKey.trim());
                        const { error } = await tempClient.from('pacientes').select('id').limit(1);
                        
                        if (error && error.code !== 'PGRST116' && error.message !== 'JSON object requested, multiple (or no) rows returned') {
                          // Se o erro for que a tabela não existe, ainda é uma conexão bem-sucedida com o Supabase
                          if (error.code === '42P01') {
                            toast.info("Conectado! Mas a tabela 'pacientes' não foi encontrada.");
                            setDbStatus("success");
                          } else {
                            throw error;
                          }
                        } else {
                          setDbStatus("success");
                          toast.success("Conexão validada!");
                        }

                        localStorage.setItem('EXTERNAL_SUPABASE_URL', extUrl.trim());
                        localStorage.setItem('EXTERNAL_SUPABASE_ANON_KEY', extKey.trim());
                        
                        setTimeout(() => {
                          toast.info("Recarregando para aplicar as mudanças...");
                          window.location.reload();
                        }, 2000);
                        
                      } catch (err: any) {
                        console.error("Connection test failed:", err);
                        setDbStatus("error");
                        setDbError(err.message || "Erro desconhecido ao testar conexão");
                        toast.error("Falha na conexão");
                      }
                    }}
                  >
                    {dbStatus === "testing" ? "Testando..." : "Salvar e Conectar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
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

          <div className="mt-4 space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Dados para configurar na extensão:
              </h3>
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">URL do Painel (copie sem a barra final):</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 break-all rounded bg-background p-2 text-xs border border-border">
                      {window.location.origin}
                    </code>
                    <Button size="icon" variant="outline" size="sm" onClick={() => { 
                      navigator.clipboard.writeText(window.location.origin); 
                      toast.success("URL copiada"); 
                    }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {newKey && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Chave de API (cole na extensão):</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 break-all rounded bg-background p-2 text-xs border border-success/40 text-success-foreground">
                        {newKey}
                      </code>
                      <Button size="icon" variant="outline" size="sm" onClick={() => { 
                        navigator.clipboard.writeText(newKey); 
                        toast.success("Chave copiada"); 
                      }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1">Copie agora — por segurança, esta chave não será mostrada novamente.</p>
                  </div>
                )}
              </div>
              {!newKey && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Gere uma nova chave abaixo se precisar configurar uma nova instalação.
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium">Suas Chaves Ativas</Label>
              {!keys?.length && <div className="text-sm text-muted-foreground">Nenhuma chave ativa encontrada.</div>}
              {keys?.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-mono text-sm">{k.key_prefix}…</div>
                      <div className="text-xs text-muted-foreground">{k.last_used_at ? `Último uso: ${new Date(k.last_used_at).toLocaleString("pt-BR")}` : "Nunca usada"}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteKey.mutate(k.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
