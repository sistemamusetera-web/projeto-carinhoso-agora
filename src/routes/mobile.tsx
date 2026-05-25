import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import {
  TEMPLATES,
  CAMPOS_PADRAO,
  type TemplateItem,
} from "@/lib/templates-evolucao";
import {
  gerarEvolucaoMobile,
  listarPacientesMobile,
  obterTerapeutaMobile,
} from "@/lib/evolucao-mobile.functions";
import { Copy, Loader2, Sparkles, ArrowLeft, Settings, Check } from "lucide-react";

export const Route = createFileRoute("/mobile")({
  component: () => (
    <RequireAuth>
      <MobilePage />
    </RequireAuth>
  ),
});

type Paciente = { id: string; nome: string; perfil: string; objetivos: string };

function MobilePage() {
  const listPacientes = useServerFn(listarPacientesMobile);
  const getTher = useServerFn(obterTerapeutaMobile);
  const gerar = useServerFn(gerarEvolucaoMobile);

  const [step, setStep] = useState<"paciente" | "compor" | "resultado">("paciente");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<TemplateItem[]>([]);
  const [nota, setNota] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [copiados, setCopiados] = useState<Record<string, boolean>>({});

  const { data: pacData } = useQuery({
    queryKey: ["mobile-pacientes"],
    queryFn: () => listPacientes(),
  });
  const { data: ther } = useQuery({
    queryKey: ["mobile-therapist"],
    queryFn: () => getTher(),
  });

  const pacientes: Paciente[] = (pacData?.pacientes ?? []) as any;
  const filtrados = useMemo(
    () =>
      busca.trim()
        ? pacientes.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
        : pacientes,
    [pacientes, busca]
  );

  const gerarMut = useMutation({
    mutationFn: async () => {
      const notaCompleta = [
        selected.map((s) => `- ${s.frase}`).join("\n"),
        nota.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");
      return gerar({
        data: {
          pacienteId: paciente?.id ?? null,
          pacienteNome: paciente?.nome ?? nomeNovo.trim(),
          nota: notaCompleta,
          campos: CAMPOS_PADRAO,
        },
      });
    },
    onSuccess: (data) => {
      setResultado(data);
      setStep("resultado");
      toast.success("Evolução gerada!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao gerar"),
  });

  function toggleItem(item: TemplateItem) {
    setSelected((prev) =>
      prev.find((s) => s.label === item.label)
        ? prev.filter((s) => s.label !== item.label)
        : [...prev, item]
    );
  }

  function copiarCampo(campo: string, texto: string) {
    navigator.clipboard.writeText(texto);
    setCopiados((c) => ({ ...c, [campo]: true }));
    setTimeout(() => setCopiados((c) => ({ ...c, [campo]: false })), 1500);
    toast.success("Copiado");
  }

  function textoCompleto(): string {
    if (!resultado) return "";
    const partes = Object.entries(resultado.campos as Record<string, string>).map(
      ([k, v]) => `${k}\n${v}`
    );
    const ass = ther
      ? `\n\n— ${ther.nome}${ther.conselho ? " · " + ther.conselho : ""}${ther.especialidade ? " · " + ther.especialidade : ""}\n${new Date().toLocaleDateString("pt-BR")}`
      : "";
    return partes.join("\n\n") + ass;
  }

  // ====== Render ======
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-[#5a7e5f] to-[#3d5841] px-4 py-3 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {step !== "paciente" && (
              <button
                onClick={() => {
                  if (step === "resultado") setStep("compor");
                  else setStep("paciente");
                }}
                className="rounded-md p-1.5 hover:bg-white/15"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-base font-semibold leading-tight">Evolução Mobile</h1>
              <p className="text-xs opacity-80 leading-tight">
                {step === "paciente" && "Escolha o paciente"}
                {step === "compor" && paciente?.nome}
                {step === "resultado" && "Resultado — copie e cole no app"}
              </p>
            </div>
          </div>
          <Link
            to="/configuracoes"
            className="rounded-md p-1.5 hover:bg-white/15"
            aria-label="Configurações"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {/* STEP 1: paciente */}
        {step === "paciente" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar paciente</label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite o nome..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4b6b4f] focus:ring-2 focus:ring-[#4b6b4f]/20"
              />
            </div>

            <div className="space-y-2">
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPaciente(p);
                    setSelected([]);
                    setNota("");
                    setStep("compor");
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#4b6b4f] hover:shadow"
                >
                  <div>
                    <div className="font-medium text-slate-900">{p.nome}</div>
                    {p.objetivos && (
                      <div className="line-clamp-1 text-xs text-slate-500">{p.objetivos}</div>
                    )}
                  </div>
                  <span className="text-slate-400">›</span>
                </button>
              ))}
              {!filtrados.length && (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  {busca ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <label className="text-sm font-medium text-slate-700">
                Ou criar paciente novo
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={nomeNovo}
                  onChange={(e) => setNomeNovo(e.target.value)}
                  placeholder="Nome do paciente"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4b6b4f]"
                />
                <button
                  disabled={!nomeNovo.trim()}
                  onClick={() => {
                    setPaciente({ id: "", nome: nomeNovo.trim(), perfil: "", objetivos: "" });
                    setSelected([]);
                    setNota("");
                    setStep("compor");
                  }}
                  className="rounded-lg bg-[#4b6b4f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Usar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: compor */}
        {step === "compor" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Toque nos chips para incluir frases prontas. A IA expande para texto clínico.
              Você pode adicionar uma nota livre abaixo.
            </div>

            {/* Templates */}
            <div className="space-y-4">
              {TEMPLATES.map((grupo) => (
                <div key={grupo.key}>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: grupo.cor }}
                  >
                    <span>{grupo.icone}</span>
                    <span>{grupo.grupo}</span>
                    <span className="ml-1 h-px flex-1 opacity-30" style={{ background: grupo.cor }} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grupo.itens.map((it) => {
                      const active = selected.some((s) => s.label === it.label);
                      return (
                        <button
                          key={it.label}
                          onClick={() => toggleItem(it)}
                          className="rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition active:scale-95"
                          style={{
                            borderColor: grupo.cor,
                            background: active ? grupo.cor : "#fff",
                            color: active ? "#fff" : grupo.cor,
                          }}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Nota livre */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Nota livre (opcional)
              </label>
              <textarea
                rows={4}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ex.: hoje trabalhou com tambor, escolheu a canção 'Atirei o pau no gato'..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4b6b4f] focus:ring-2 focus:ring-[#4b6b4f]/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                {selected.length} chip(s) selecionado(s)
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: resultado */}
        {step === "resultado" && resultado && (
          <div className="space-y-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(textoCompleto());
                toast.success("Tudo copiado");
              }}
              className="w-full rounded-lg bg-[#4b6b4f] py-3 text-sm font-semibold text-white shadow active:scale-[0.99]"
            >
              📋 Copiar tudo (com assinatura)
            </button>

            {Object.entries(resultado.campos as Record<string, string>).map(([campo, texto]) => (
              <div key={campo} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">{campo}</h3>
                  <button
                    onClick={() => copiarCampo(campo, texto)}
                    className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                  >
                    {copiados[campo] ? (
                      <>
                        <Check className="h-3 w-3" /> ok
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {texto}
                </p>
              </div>
            ))}

            {ther?.nome && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <strong>Assinatura:</strong> {ther.nome}
                {ther.conselho ? ` · ${ther.conselho}` : ""}
                {ther.especialidade ? ` · ${ther.especialidade}` : ""} ·{" "}
                {new Date().toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer fixo */}
      {step === "compor" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => gerarMut.mutate()}
              disabled={
                gerarMut.isPending ||
                (!selected.length && !nota.trim()) ||
                (!paciente?.nome && !nomeNovo.trim())
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#5a7e5f] to-[#3d5841] py-3.5 text-sm font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-50"
            >
              {gerarMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Gerar evolução com IA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === "resultado" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => {
                setSelected([]);
                setNota("");
                setResultado(null);
                setStep("paciente");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 active:scale-[0.99]"
            >
              Nova evolução
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
