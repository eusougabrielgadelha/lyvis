"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Pitch as DefinicaoPitch } from "@/blocks/schemas";
import { etapaInicial, proximaEtapa } from "@/lib/pitch-engine";
import { RenderizarBloco } from "@/blocks/views";
import { registrarEvento } from "./pitch-actions";

type Ativo = { activationId: string; definicao: DefinicaoPitch } | null;

export function AreaDoPitch({
  slug,
  roomId,
  viewerRef,
  inicial,
}: {
  slug: string;
  roomId: string;
  viewerRef?: string;
  inicial: Ativo;
}) {
  const [ativo, setAtivo] = useState<Ativo>(inicial);
  const [etapaId, setEtapaId] = useState<string | null>(
    inicial ? etapaInicial(inicial.definicao) : null,
  );
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  // liberação e encerramento chegam por broadcast: a tela muda na hora
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`sala:${roomId}`)
      .on("broadcast", { event: "pitch" }, ({ payload }) => {
        if (payload.acao === "encerrar") {
          setAtivo(null);
          setEtapaId(null);
          setRespostas({});
          return;
        }
        if (payload.acao === "liberar") {
          setAtivo({
            activationId: payload.activationId,
            definicao: payload.definicao as DefinicaoPitch,
          });
          setEtapaId(etapaInicial(payload.definicao as DefinicaoPitch));
          setRespostas({});
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [roomId]);

  // marca que esta pessoa viu a etapa
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
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-500">
        O pitch aparece aqui quando o apresentador liberar.
      </div>
    );
  }

  const etapa = ativo.definicao.etapas[etapaId];
  if (!etapa) return null;

  return (
    <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
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
