"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  useRoomContext,
  useLocalParticipant,
  useParticipants,
  useConnectionState,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { mudarStatus, tokenHost } from "./actions";

type Status = "draft" | "scheduled" | "live" | "ended";

/**
 * Regra central: o host só PUBLICA quando a sala está no ar.
 *
 * Antes, ligar a câmera publicava na hora — o espectador via tudo antes de
 * "Entrar no ar" e continuava vendo depois de encerrar. Fora do ar, a câmera
 * agora é só prévia local (getUserMedia), que não passa pelo LiveKit.
 */
function Controles({
  slug,
  status,
  aoMudarStatus,
}: {
  slug: string;
  status: Status;
  aoMudarStatus: (s: Status) => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participantes = useParticipants();
  const estado = useConnectionState();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const minhaTrack = tracks.find(
    (t) => t.participant.identity === localParticipant.identity,
  );

  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStream = useRef<MediaStream | null>(null);

  const noAr = status === "live";

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __lyvisRoom?: unknown }).__lyvisRoom = room;
    }
  }, [room]);

  const pararPreview = useCallback(() => {
    previewStream.current?.getTracks().forEach((t) => t.stop());
    previewStream.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  // prévia local enquanto a sala não está no ar
  useEffect(() => {
    if (noAr || !camera) {
      pararPreview();
      return;
    }
    let cancelado = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelado) return stream.getTracks().forEach((t) => t.stop());
        previewStream.current = stream;
        if (previewRef.current) previewRef.current.srcObject = stream;
      })
      .catch(() => setCamera(false));

    return () => {
      cancelado = true;
    };
  }, [noAr, camera, pararPreview]);

  // no ar: publica o que estiver ligado. Fora do ar: não publica nada.
  useEffect(() => {
    if (estado !== ConnectionState.Connected) return;

    if (noAr) {
      pararPreview(); // libera a câmera antes de o LiveKit abrir a dele
      localParticipant.setCameraEnabled(camera).catch(() => {});
      localParticipant.setMicrophoneEnabled(mic).catch(() => {});
    } else {
      localParticipant.setCameraEnabled(false).catch(() => {});
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
  }, [noAr, camera, mic, estado, localParticipant, pararPreview]);

  useEffect(() => () => pararPreview(), [pararPreview]);

  const espectadores = Math.max(participantes.length - 1, 0);

  async function alternarStatus(novo: Status) {
    setOcupado(true);
    aoMudarStatus(novo);
    await mudarStatus(slug, novo as "live" | "ended");
    setOcupado(false);
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {noAr && minhaTrack ? (
          <VideoTrack trackRef={minhaTrack} className="h-full w-full object-cover" />
        ) : camera ? (
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Câmera desligada
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
            noAr ? "bg-red-600" : "bg-neutral-700"
          }`}
        >
          {noAr ? "● NO AR" : "PRÉVIA — ninguém está vendo"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCamera((c) => !c)}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
        >
          {camera ? "Desligar câmera" : "Ligar câmera"}
        </button>
        <button
          onClick={() => setMic((m) => !m)}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
        >
          {mic ? "Desligar microfone" : "Ligar microfone"}
        </button>

        {!noAr ? (
          <button
            disabled={ocupado}
            onClick={() => alternarStatus("live")}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Entrar no ar
          </button>
        ) : (
          <button
            disabled={ocupado}
            onClick={() => alternarStatus("ended")}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm disabled:opacity-50"
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
  const [status, setStatus] = useState<Status>(statusInicial as Status);
  const pediuToken = useRef(false);

  useEffect(() => {
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
