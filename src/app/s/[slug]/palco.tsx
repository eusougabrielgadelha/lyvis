"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { tokenEspectador } from "./actions";

type Status = "draft" | "scheduled" | "live" | "ended";

function Video() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });
  const principal = tracks[0];

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

export function Palco({
  slug,
  roomId,
  statusInicial,
}: {
  slug: string;
  roomId: string;
  statusInicial: Status;
}) {
  const [status, setStatus] = useState<Status>(statusInicial);
  const [cred, setCred] = useState<{ url: string; token: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pedindo = useRef(false);

  // o host avisa quando entra no ar e quando encerra
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`sala:${roomId}`)
      .on("broadcast", { event: "room" }, ({ payload }) => {
        setStatus(payload.status as Status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [roomId]);

  // só pede token e conecta quando a sala está no ar
  useEffect(() => {
    if (status !== "live") {
      setCred(null);
      pedindo.current = false;
      return;
    }
    if (pedindo.current) return;
    pedindo.current = true;

    tokenEspectador(slug)
      .then(setCred)
      .catch(() => setErro("Não consegui entrar na transmissão."));
  }, [status, slug]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      {erro ? (
        <Aviso texto={erro} />
      ) : status === "ended" ? (
        <Aviso texto="Esta transmissão foi encerrada." />
      ) : status !== "live" ? (
        <Aviso texto="A transmissão ainda não começou. Deixe esta página aberta." />
      ) : !cred ? (
        <Aviso texto="Entrando na transmissão..." />
      ) : (
        <LiveKitRoom
          serverUrl={cred.url}
          token={cred.token}
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
