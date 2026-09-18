"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BannerFinal, GateConfig } from "@/lib/rooms";
import type { Pitch as DefinicaoPitch } from "@/blocks/schemas";
import { Palco } from "./palco";
import { AreaDoPitch, type Ativo } from "./pitch";
import { Chat, type Mensagem } from "./chat";
import { Inscricao } from "./inscricao";
import { Encerrada } from "./encerrada";

type Status = "draft" | "scheduled" | "live" | "ended";

export function SalaView({
  slug,
  roomId,
  titulo,
  statusInicial,
  bannerFinal,
  gate,
  inscrito,
  viewerRef,
  mensagens,
  pitchInicial,
}: {
  slug: string;
  roomId: string;
  titulo: string;
  statusInicial: Status;
  bannerFinal: BannerFinal;
  gate: GateConfig;
  inscrito: boolean;
  viewerRef?: string;
  mensagens: Mensagem[];
  pitchInicial: { activationId: string; definicao: DefinicaoPitch } | null;
}) {
  const [status, setStatus] = useState<Status>(statusInicial);
  // a ativação vive aqui: ao encerrar a live o layout muda e a área do pitch
  // remonta. Se o estado morasse lá dentro, a oferta sumia junto com o vídeo.
  const [ativo, setAtivo] = useState<Ativo>(pitchInicial);

  // Um canal por assunto (:room, :pitch, :chat). Com os três no mesmo nome
  // de canal, o Supabase entregava o evento só pra um deles — foi assim que
  // "voltar ao ar" não chegava no espectador.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`sala:${roomId}:room`)
      .on("broadcast", { event: "room" }, ({ payload }) =>
        setStatus(payload.status as Status),
      )
      .subscribe();

    const canalPitch = supabase
      .channel(`sala:${roomId}:pitch`)
      .on("broadcast", { event: "pitch" }, ({ payload }) => {
        if (payload.acao === "encerrar") return setAtivo(null);
        if (payload.acao === "liberar") {
          setAtivo({
            activationId: payload.activationId,
            definicao: payload.definicao,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
      supabase.removeChannel(canalPitch);
    };
  }, [roomId]);

  const encerrada = status === "ended";

  const chat = (
    <div className="flex flex-col gap-3 md:h-[560px]">
      {!inscrito && gate.when === "to_chat" && (
        <Inscricao slug={slug} gate={gate} titulo="Quer falar?" />
      )}
      <div className="min-h-64 flex-1">
        <Chat
          slug={slug}
          roomId={roomId}
          inicial={mensagens}
          podeFalar={inscrito || gate.when === "never"}
        />
      </div>
    </div>
  );

  const pitch = (
    <AreaDoPitch
      slug={slug}
      roomId={roomId}
      viewerRef={viewerRef}
      ativo={ativo}
      destaque={encerrada}
    />
  );

  // Depois do fim: sem vídeo competindo, a oferta ocupa a coluna principal
  // e o chat encolhe pro lado.
  if (encerrada) {
    return (
      <>
        <h1 className="mb-4 text-xl font-semibold">{titulo}</h1>
        <div className="mb-4">
          <Encerrada banner={bannerFinal} />
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <div>{pitch}</div>
          {chat}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">{titulo}</h1>
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* o vídeo acompanha a rolagem: a pessoa responde quiz e preenche
              o checkout sem perder o apresentador de vista */}
          <div className="sticky top-0 z-20 -mx-4 bg-neutral-950 px-4 py-2 md:mx-0 md:px-0">
            <Palco slug={slug} status={status} />
          </div>
          {pitch}
        </div>
        {chat}
      </div>
    </>
  );
}
