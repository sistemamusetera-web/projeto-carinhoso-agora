import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Plus, Key, Smartphone, Bookmark } from "lucide-react";

export const Route = createFileRoute("/mobile-bookmarklet")({
  component: () => (
    <RequireAuth>
      <Page />
    </RequireAuth>
  ),
});

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys } = useQuery({
    queryKey: ["api_keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const raw =
        "evo_" +
        crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "");
      const hash = await sha256(raw);
      const { error } = await supabase.from("api_keys").insert({
        user_id: user!.id,
        key_hash: hash,
        key_prefix: raw.slice(0, 12),
        nome: "Bookmarklet iPhone",
      });
      if (error) throw error;
      return raw;
    },
    onSuccess: (raw) => {
      setNewKey(raw);
      setApiKey(raw);
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("Chave criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const panelUrl =
    typeof window !== "undefined" ? window.location.origin : "https://projeto-carinhoso-agora.lovable.app";

  const bookmarklet = useMemo(() => {
    if (!apiKey) return "";
    const code = `(function(){window.__EVO_CFG={panelUrl:'${panelUrl}',apiKey:'${apiKey}'};var s=document.createElement('script');s.src='${panelUrl}/mobile-agent.js?v='+Date.now();document.body.appendChild(s);})();`;
    return "javascript:" + encodeURIComponent(code);
  }, [apiKey, panelUrl]);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header
        className="px-4 py-5 text-white shadow"
        style={{ background: "linear-gradient(135deg,#5a7e5f 0%,#3d5841 100%)" }}
      >
        <div className="mx-auto max-w-2xl">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Smartphone className="h-5 w-5" /> Bookmarklet iPhone (Safari)
          </h1>
          <p className="mt-1 text-sm opacity-90">
            Instale uma vez e use o mesmo painel da extensão no Safari do iPhone, com preenchimento automático.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Passo 1 */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Key className="h-4 w-4 text-[#4b6b4f]" /> Passo 1 — Chave de acesso
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma chave nova ou cole uma já existente.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="evo_xxxxxxxxxxxx..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value.trim())}
              className="flex-1 font-mono text-xs"
            />
            <Button
              onClick={() => createKey.mutate()}
              disabled={createKey.isPending}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Gerar nova
            </Button>
          </div>

          {newKey && (
            <div className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-xs">
              <b>Chave criada — guarde:</b>
              <div className="mt-1 break-all font-mono">{newKey}</div>
            </div>
          )}

          {!!keys?.length && !newKey && (
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Chaves existentes ({keys.length})</summary>
              <ul className="mt-2 space-y-1 font-mono">
                {keys.map((k) => (
                  <li key={k.id}>{k.key_prefix}… ({k.nome})</li>
                ))}
              </ul>
              <p className="mt-2">Por segurança, a chave completa só é mostrada quando criada. Se não a tiver, gere uma nova.</p>
            </details>
          )}
        </Card>

        {/* Passo 2 */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bookmark className="h-4 w-4 text-[#4b6b4f]" /> Passo 2 — Adicionar ao Safari
          </h2>

          {!apiKey ? (
            <p className="mt-2 text-sm text-amber-700">
              Cole ou gere uma chave acima para liberar o bookmarklet.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Este é o seu link mágico. <b>Toque e segure</b> para copiar, ou siga as instruções abaixo.
              </p>

              <div className="mt-3 rounded-md border bg-white p-3">
                <a
                  href={bookmarklet}
                  onClick={(e) => e.preventDefault()}
                  className="break-all font-mono text-xs text-[#3d5841] underline"
                >
                  🌱 Agente de Evolução
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(bookmarklet);
                    toast.success("Código copiado");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar código do bookmarklet
                </Button>
              </div>

              <div className="mt-5 space-y-3 rounded-md bg-slate-50 p-4 text-sm leading-relaxed">
                <p className="font-semibold">📱 Como instalar no Safari do iPhone:</p>
                <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                  <li>
                    Abra esta página <b>no Safari do iPhone</b> (não no Chrome).
                  </li>
                  <li>
                    Toque no botão <b>Compartilhar</b> ↗ e escolha <b>Adicionar aos Favoritos</b>. Salve com nome qualquer (ex.: "Temp").
                  </li>
                  <li>
                    Abra <b>Favoritos</b> (ícone do livro), encontre o que acabou de salvar, toque em <b>Editar</b>.
                  </li>
                  <li>
                    Renomeie para <b>Agente de Evolução</b> e <b>apague o endereço</b> que está lá.
                  </li>
                  <li>
                    Toque em "Copiar código do bookmarklet" acima e <b>cole no campo de endereço</b> do favorito (começa com <code>javascript:</code>).
                  </li>
                  <li>Salve.</li>
                </ol>
              </div>

              <div className="mt-4 space-y-2 rounded-md border border-[#4b6b4f]/30 bg-[#4b6b4f]/5 p-4 text-sm">
                <p className="font-semibold text-[#3d5841]">✨ Como usar:</p>
                <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>Entre no Clínica nas Nuvens pelo Safari.</li>
                  <li>Abra a tela de evolução do paciente.</li>
                  <li>
                    Toque na barra de endereço, abra <b>Favoritos</b> e toque em <b>Agente de Evolução</b>.
                  </li>
                  <li>
                    O painel verde abre, detecta os campos e a IA preenche o formulário automaticamente. 🎉
                  </li>
                </ol>
              </div>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Funciona apenas no Safari do iPhone/iPad. Chrome/Edge do iOS bloqueiam bookmarklets <code>javascript:</code>.
        </p>
      </main>
    </div>
  );
}
