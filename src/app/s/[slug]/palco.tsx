"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { tokenEspectador } from "./actions";

function Video() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });
  const estado = useConnectionState();
  const principal = tracks[0];

  if (!principal) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        {estado === ConnectionState.Connected
          ? "A transmissão ainda não começou."
          : "Conectando..."}
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={principal}
      className="h-full w-full object-contain"
    />
  );
}

export function Palco({ slug }: { slug: string }) {
  const [cred, setCred] = useState<{ url: string; token: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const pediuToken = useRef(false);

  useEffect(() => {
    if (pediuToken.current) return;   // evita conexão dupla no efeito repetido
    pediuToken.current = true;

    tokenEspectador(slug)
      .then(setCred)
      .catch(() => setErro("Não consegui entrar na transmissão."));
  }, [slug]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      {erro && (
        <div className="flex h-full items-center justify-center text-sm text-red-400">
          {erro}
        </div>
      )}
      {!erro && !cred && (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Entrando na sala...
        </div>
      )}
      {cred && (
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
