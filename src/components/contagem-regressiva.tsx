"use client";

import { useEffect, useRef, useState } from "react";
import { horaDoServidor } from "@/app/actions/tempo";
import {
  calcularContagem,
  intervaloDeAtualizacao,
  type Contagem,
} from "@/lib/tempo";

/**
 * Contagem regressiva sincronizada com o servidor.
 *
 * Mede uma vez a diferença entre o relógio do visitante e o do servidor e
 * corrige a partir dela. Reconfere ao voltar pra aba, porque aba em segundo
 * plano tem timer estrangulado pelo navegador e o número congela.
 */
export function useContagem(alvoIso: string | null) {
  const [contagem, setContagem] = useState<Contagem | null>(null);
  const desvio = useRef(0); // servidor - cliente, em ms
  const sincronizou = useRef(false);

  useEffect(() => {
    if (!alvoIso) return;
    const alvoMs = new Date(alvoIso).getTime();
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;

    const agora = () => Date.now() + desvio.current;

    const sincronizar = async () => {
      const t0 = Date.now();
      const doServidor = await horaDoServidor().catch(() => null);
      if (!doServidor || !vivo) return;
      const latencia = (Date.now() - t0) / 2;
      desvio.current = doServidor + latencia - Date.now();
      sincronizou.current = true;
    };

    const tique = () => {
      if (!vivo) return;
      const c = calcularContagem(alvoMs, agora());
      setContagem(c);
      timer = setTimeout(tique, intervaloDeAtualizacao(c.fase));
    };

    sincronizar().finally(tique);

    const aoVoltar = () => {
      if (document.visibilityState === "visible") sincronizar().then(tique);
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      vivo = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [alvoIso]);

  return contagem;
}

export function ContagemRegressiva({
  alvoIso,
  titulo = "A transmissão começa em",
  compacta = false,
}: {
  alvoIso: string;
  titulo?: string;
  compacta?: boolean;
}) {
  const c = useContagem(alvoIso);

  if (!c) {
    return <p className="text-sm text-neutral-500">Carregando horário...</p>;
  }

  if (c.fase === "passou") {
    return (
      <p className={compacta ? "text-sm" : "text-lg font-medium"}>
        Começando a qualquer momento...
      </p>
    );
  }

  if (compacta) {
    return (
      <span className="text-sm text-neutral-300">
        {titulo} <b className="text-neutral-100">{c.texto}</b>
      </span>
    );
  }

  const blocos: [number, string][] =
    c.dias > 0
      ? [
          [c.dias, c.dias === 1 ? "dia" : "dias"],
          [c.horas, "horas"],
          [c.minutos, "min"],
        ]
      : [
          [c.horas, "horas"],
          [c.minutos, "min"],
          [c.segundos, "seg"],
        ];

  return (
    <div className="text-center">
      <p className="text-sm text-neutral-400">{titulo}</p>
      <div className="mt-3 flex items-start justify-center gap-4">
        {blocos.map(([valor, rotulo]) => (
          <div key={rotulo} className="min-w-16">
            <p className="font-mono text-3xl font-semibold tabular-nums md:text-4xl">
              {String(valor).padStart(2, "0")}
            </p>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {rotulo}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
