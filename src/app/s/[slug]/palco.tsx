"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { tokenEspectador } from "./actions";

type Status = "draft" | "scheduled" | "live" | "ended";

function Video() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });
  // prefere uma faixa realmente ativa: depois de encerrar e voltar ao ar, o
  // host pode ficar com uma publicação antiga mutada, e escolher essa deixa a
  // tela preta com o apresentador falando
  const principal =
    tracks.find((t) => t.publication && !t.publication.isMuted) ?? tracks[0];

  if (!principal) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        O apresentador está no ar. Aguardando o vídeo...
      </div>
    );
  }

  return <VideoTrack trackRef={principal} className="h-full w-full object-contain" />;
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-neutral-500">
      {texto}
    </div>
  );
}

export function Palco({ slug, status }: { slug: string; status: Status }) {
  const [cred, setCred] = useState<{ url: string; token: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pedindo = useRef(false);

  // só pede token e conecta quando a sala está no ar
  useEffect(() => {
    if (status !== "live") {
      pedindo.current = false; // ref, não estado: nada de render em cascata
      return;
    }
    if (pedindo.current) return;
    pedindo.current = true;

    tokenEspectador(slug)
      .then(setCred)
      .catch(() => setErro("Não consegui entrar na transmissão."));
  }, [status, slug]);

  // credencial só vale enquanto a sala está no ar
  const credAtiva = status === "live" ? cred : null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      {erro ? (
        <Aviso texto={erro} />
      ) : status === "ended" ? (
        <Aviso texto="Esta transmissão foi encerrada." />
      ) : status !== "live" ? (
        <Aviso texto="A transmissão ainda não começou. Deixe esta página aberta." />
      ) : !credAtiva ? (
        <Aviso texto="Entrando na transmissão..." />
      ) : (
        <LiveKitRoom
          serverUrl={credAtiva.url}
          token={credAtiva.token}
          connect
          video={false}
          audio={false}
          className="h-full"
        >
          <Video />
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}
    </div>
  );
}
