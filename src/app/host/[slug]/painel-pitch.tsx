"use client";

import { useEffect, useState, useTransition } from "react";
import { encerrarPitch, liberarPitch, metricasDoPitch } from "./pitch-actions";

type PitchResumo = { id: string; name: string };

export function PainelPitch({
  slug,
  pitches,
}: {
  slug: string;
  pitches: PitchResumo[];
}) {
  const [escolhido, setEscolhido] = useState(pitches[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<{
    viu: number;
    respondeu: number;
    abriuCheckout: number;
  } | null>(null);
  const [pendente, startTransition] = useTransition();

  // funil do pitch no ar, atualizado a cada 5s
  useEffect(() => {
    let vivo = true;
    const buscar = () =>
      metricasDoPitch(slug)
        .then((m) => vivo && setMetricas(m))
        .catch(() => {});
    buscar();
    const t = setInterval(buscar, 5000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [slug]);

  if (!pitches.length) {
    return (
      <p className="text-sm text-neutral-500">
        Nenhum pitch salvo pra esta sala. Monte um em Pitches.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={escolhido}
          onChange={(e) => setEscolhido(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        >
          {pitches.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button
          disabled={pendente}
          onClick={() =>
            startTransition(async () => {
              setErro(null);
              const r = await liberarPitch(slug, escolhido);
              if (r.erro) setErro(r.erro);
            })
          }
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Liberar pitch
        </button>

        <button
          disabled={pendente}
          onClick={() =>
            startTransition(async () => {
              await encerrarPitch(slug);
              setMetricas(null);
            })
          }
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm"
        >
          Encerrar pitch
        </button>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {metricas && (
        <div className="flex gap-6 text-sm text-neutral-400">
          <span>
            Viu: <b className="text-neutral-100">{metricas.viu}</b>
          </span>
          <span>
            Respondeu: <b className="text-neutral-100">{metricas.respondeu}</b>
          </span>
          <span>
            Abriu checkout:{" "}
            <b className="text-neutral-100">{metricas.abriuCheckout}</b>
          </span>
        </div>
      )}
    </div>
  );
}
