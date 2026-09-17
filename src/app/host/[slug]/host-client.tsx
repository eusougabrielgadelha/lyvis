"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useParticipants,
  useConnectionState,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { mudarStatus, tokenHost } from "./actions";

function Controles({
  slug,
  status,
  aoMudarStatus,
}: {
  slug: string;
  status: string;
  aoMudarStatus: (s: "live" | "ended") => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const participantes = useParticipants();
  const estado = useConnectionState();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const minha = tracks.find(
    (t) => t.participant.identity === localParticipant.identity,
  );

  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const espectadores = Math.max(participantes.length - 1, 0);

  async function alternarCamera() {
    const novo = !camera;
    await localParticipant.setCameraEnabled(novo);
    setCamera(novo);
  }

  async function alternarMic() {
    const novo = !mic;
    await localParticipant.setMicrophoneEnabled(novo);
    setMic(novo);
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        {minha ? (
          <VideoTrack trackRef={minha} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Câmera desligada
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={alternarCamera}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
        >
          {camera ? "Desligar câmera" : "Ligar câmera"}
        </button>
        <button
          onClick={alternarMic}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
        >
          {mic ? "Desligar microfone" : "Ligar microfone"}
        </button>

        {status !== "live" ? (
          <button
            onClick={async () => {
              aoMudarStatus("live");
              await mudarStatus(slug, "live");
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium"
          >
            Entrar no ar
          </button>
        ) : (
          <button
            onClick={async () => {
              aoMudarStatus("ended");
              await mudarStatus(slug, "ended");
            }}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm"
          >
            Encerrar transmissão
          </button>
        )}
      </div>

      <div className="flex gap-6 text-sm text-neutral-400">
        <span>
          Conexão:{" "}
          <b className="text-neutral-200">
            {estado === ConnectionState.Connected ? "conectado" : estado}
          </b>
        </span>
        <span>
          Ao vivo: <b className="text-neutral-200">{espectadores} reais</b>
        </span>
      </div>
    </div>
  );
}

export function HostClient({
  slug,
  status: statusInicial,
}: {
  slug: string;
  status: string;
}) {
  const [cred, setCred] = useState<{ url: string; token: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // status vive no cliente: mudar no servidor não pode remontar o vídeo
  const [status, setStatus] = useState(statusInicial);
  const pediuToken = useRef(false);

  useEffect(() => {
    // em dev o React roda o efeito duas vezes; sem esta trava a sala
    // recebia dois connect e aparecia "already connected to room"
    if (pediuToken.current) return;
    pediuToken.current = true;

    tokenHost(slug)
      .then(setCred)
      .catch((e) => setErro(e.message ?? "Falha ao abrir a sala."));
  }, [slug]);

  if (erro) return <p className="text-sm text-red-400">{erro}</p>;
  if (!cred) return <p className="text-sm text-neutral-500">Abrindo sala...</p>;

  return (
    <LiveKitRoom serverUrl={cred.url} token={cred.token} connect audio={false} video={false}>
      <Controles slug={slug} status={status} aoMudarStatus={setStatus} />
    </LiveKitRoom>
  );
}
