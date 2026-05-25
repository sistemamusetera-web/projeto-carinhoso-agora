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
import {
  Copy,
  Loader2,
  ArrowLeft,
  Settings,
  Check,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

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

  const dataBR = new Date().toLocaleDateString("pt-BR");
  const nomePacienteHeader = paciente?.nome ?? nomeNovo;

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: "#f7faf7", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
    >
      {/* Header (igual painel flutuante) */}
      <header
        className="sticky top-0 z-10 px-4 py-3 text-white shadow-md"
        style={{ background: "linear-gradient(135deg, #5a7e5f 0%, #3d5841 100%)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
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
            <div className="leading-tight">
              <h1 className="text-[15px] font-semibold">🌱 Agente de Evolução</h1>
              <p className="text-[11px] opacity-80">
                {step === "paciente" && "Escolha o paciente"}
                {step === "compor" && (nomePacienteHeader || "Compor sessão")}
                {step === "resultado" && "Copie e cole no sistema"}
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

      <main className="mx-auto max-w-md px-3 pt-3">
        {/* STEP 1: paciente */}
        {step === "paciente" && (
          <div className="space-y-3">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4b6b4f] focus:ring-2 focus:ring-[#4b6b4f]/20"
            />

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

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ou criar novo
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
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "#4b6b4f" }}
                >
                  Usar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: compor (espelha painel da extensão) */}
        {step === "compor" && (
          <div className="space-y-3">
            {/* Nome paciente (igual .evo-chat-paciente) */}
            <input
              type="text"
              value={paciente?.nome ?? nomeNovo}
              onChange={(e) => {
                if (paciente) setPaciente({ ...paciente, nome: e.target.value });
                else setNomeNovo(e.target.value);
              }}
              placeholder="Nome do paciente"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#4b6b4f] focus:ring-2 focus:ring-[#4b6b4f]/20"
            />

            {/* Cartão Assinatura (recolhível, igual .evo-chat-signature) */}
            <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span>✍️</span>
                  <span>Assinatura</span>
                </span>
                <Link
                  to="/configuracoes"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-[#047857] underline"
                >
                  editar
                </Link>
              </summary>
              <div className="border-t border-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                {ther?.nome ? (
                  <>
                    <div>
                      <b>{ther.nome}</b>
                    </div>
                    {ther.conselho && <div>🪪 {ther.conselho}</div>}
                    {ther.especialidade && <div>🎓 {ther.especialidade}</div>}
                    <div className="mt-1 text-slate-500">📅 {dataBR}</div>
                  </>
                ) : (
                  <i className="text-slate-500">
                    Nenhum dado de terapeuta.{" "}
                    <Link to="/configuracoes" className="text-[#047857] underline">
                      configurar agora
                    </Link>
                    <br />
                    📅 {dataBR}
                  </i>
                )}
              </div>
            </details>

            {/* Templates rápidos (igual .evo-chat-templates) */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white"
                    style={{ background: "#4b6b4f" }}
                  >
                    ⚡
                  </span>
                  Templates rápidos
                  {selected.length > 0 && (
                    <span className="ml-1 rounded-full bg-[#4b6b4f]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#4b6b4f]">
                      {selected.length}
                    </span>
                  )}
                </span>
                {selected.length > 0 && (
                  <button
                    onClick={() => setSelected([])}
                    className="text-[11px] font-medium text-slate-500 underline"
                  >
                    limpar
                  </button>
                )}
              </div>
              <div className="space-y-3 px-3 py-3">
                {TEMPLATES.map((grupo) => (
                  <div key={grupo.key}>
                    <div
                      className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: grupo.cor }}
                    >
                      <span className="text-sm">{grupo.icone}</span>
                      <span>{grupo.grupo}</span>
                      <span
                        className="ml-1 h-px flex-1 opacity-30"
                        style={{ background: grupo.cor }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {grupo.itens.map((it) => {
                        const active = selected.some((s) => s.label === it.label);
                        return (
                          <button
                            key={it.label}
                            onClick={() => toggleItem(it)}
                            className="rounded-full border-[1.5px] px-2.5 py-1 text-[11px] font-semibold transition active:scale-95"
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
            </div>

            {/* Nota livre (.evo-chat-input adaptado) */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Nota livre
              </label>
              <textarea
                rows={4}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ex.: hoje trabalhou com tambor, escolheu a canção 'Atirei o pau no gato'..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4b6b4f] focus:ring-2 focus:ring-[#4b6b4f]/20"
              />
            </div>
          </div>
        )}

        {/* STEP 3: resultado */}
        {step === "resultado" && resultado && (
          <div className="space-y-3 pt-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(textoCompleto());
                toast.success("Tudo copiado");
              }}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, #5a7e5f 0%, #3d5841 100%)" }}
            >
              📋 Copiar tudo (com assinatura)
            </button>

            {Object.entries(resultado.campos as Record<string, string>).map(([campo, texto]) => (
              <div
                key={campo}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
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
                {ther.especialidade ? ` · ${ther.especialidade}` : ""} · {dataBR}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Rodapé fixo (igual .evo-chat-actions) */}
      {step === "compor" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="mx-auto flex max-w-md gap-2">
            <button
              onClick={() => {
                setSelected([]);
                setNota("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.99]"
            >
              Limpar
            </button>
            <button
              onClick={() => gerarMut.mutate()}
              disabled={
                gerarMut.isPending ||
                (!selected.length && !nota.trim()) ||
                (!paciente?.nome && !nomeNovo.trim())
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5a7e5f 0%, #3d5841 100%)" }}
            >
              {gerarMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <span>✨</span> Gerar e preencher
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === "resultado" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto max-w-md">
            <button
              onClick={() => {
                setSelected([]);
                setNota("");
                setResultado(null);
                setStep("paciente");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 active:scale-[0.99]"
            >
              <RefreshCw className="h-4 w-4" /> Nova evolução
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
