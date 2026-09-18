"use client";

import { useCallback, useEffect, useState } from "react";
import type { Pitch as DefinicaoPitch } from "@/blocks/schemas";
import { etapaInicial, proximaEtapa } from "@/lib/pitch-engine";
import { RenderizarBloco } from "@/blocks/views";
import { registrarEvento } from "./pitch-actions";

export type Ativo = {
  activationId: string;
  definicao: DefinicaoPitch;
} | null;

type Progresso = { etapaId: string; respostas: Record<string, string> };

const chave = (activationId: string) => `lyvis_pitch_${activationId}`;

/**
 * Progresso guardado por ativação. Ao encerrar a live o layout muda e este
 * componente remonta: sem isso, quem estava preenchendo o checkout voltava
 * pro começo do quiz.
 */
function lerProgresso(activationId: string): Progresso | null {
  try {
    const bruto = sessionStorage.getItem(chave(activationId));
    return bruto ? (JSON.parse(bruto) as Progresso) : null;
  } catch {
    return null;
  }
}

function salvarProgresso(activationId: string, p: Progresso) {
  try {
    sessionStorage.setItem(chave(activationId), JSON.stringify(p));
  } catch {
    // navegador sem sessionStorage não pode quebrar a sala
  }
}

export function AreaDoPitch({
  slug,
  roomId,
  viewerRef,
  ativo,
  destaque = false,
}: {
  slug: string;
  roomId: string;
  viewerRef?: string;
  /** quem manda é a SalaView: ela não remonta quando a live encerra */
  ativo: Ativo;
  destaque?: boolean;
}) {
  const [etapaId, setEtapaId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  // ativação nova (ou remontagem): retoma de onde a pessoa parou
  useEffect(() => {
    if (!ativo) {
      setEtapaId(null);
      setRespostas({});
      return;
    }
    const salvo = lerProgresso(ativo.activationId);
    setEtapaId(salvo?.etapaId ?? etapaInicial(ativo.definicao));
    setRespostas(salvo?.respostas ?? {});
  }, [ativo]);

  useEffect(() => {
    if (!ativo || !etapaId) return;
    salvarProgresso(ativo.activationId, { etapaId, respostas });
  }, [ativo, etapaId, respostas]);

  useEffect(() => {
    if (!ativo || !etapaId) return;
    registrarEvento({
      slug,
      activationId: ativo.activationId,
      etapaId,
      evento: "viewed",
    });
  }, [ativo, etapaId, slug]);

  const responder = useCallback(
    (blocoId: string, valor: string) => {
      if (!ativo || !etapaId) return;
      setRespostas((r) => ({ ...r, [blocoId]: valor }));

      registrarEvento({
        slug,
        activationId: ativo.activationId,
        etapaId,
        blocoId,
        evento: "answered",
        resposta: valor,
      });

      const proxima = proximaEtapa(ativo.definicao, etapaId, {
        blocoId,
        valor,
      });
      if (proxima) setEtapaId(proxima);
    },
    [ativo, etapaId, slug],
  );

  const evento = useCallback(
    (blocoId: string, nome: string) => {
      if (!ativo || !etapaId) return;
      registrarEvento({
        slug,
        activationId: ativo.activationId,
        etapaId,
        blocoId,
        evento: nome as "clicked" | "checkout_opened",
      });
    },
    [ativo, etapaId, slug],
  );

  if (!ativo || !etapaId) {
    if (destaque) return null; // encerrada e sem oferta: nada de caixa vazia
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-500">
        O pitch aparece aqui quando o apresentador liberar.
      </div>
    );
  }

  const etapa = ativo.definicao.etapas[etapaId];
  if (!etapa) return null;

  return (
    <div
      className={
        destaque
          ? "space-y-5 rounded-xl border border-blue-600/40 bg-neutral-900 p-6 shadow-[0_0_0_1px_rgba(37,99,235,0.15)] md:p-8"
          : "space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5"
      }
    >
      {destaque && (
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
          Oferta apresentada na live
        </p>
      )}
      {etapa.blocos.map((bloco) => (
        <RenderizarBloco
          key={bloco.id}
          bloco={bloco}
          resposta={respostas[bloco.id]}
          aoResponder={responder}
          aoEvento={evento}
          ctx={{
            roomId,
            activationId: ativo.activationId,
            viewerRef,
            respostas,
          }}
        />
      ))}
    </div>
  );
}
