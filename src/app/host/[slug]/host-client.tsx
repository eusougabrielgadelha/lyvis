"use client";

import { useEffect, useRef, useState } from "react";
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
import { permitePublicar, type StatusSala } from "@/lib/room-lifecycle";
import { ChecklistPreVoo, usePreVoo } from "@/components/pre-voo";
import { ContagemRegressiva, useContagem } from "@/components/contagem-regressiva";

/**
 * Painel do apresentador.
 *
 * Duas regras que valem mais que qualquer conveniência de interface:
 *
 * 1. Fora do ar nada é publicado. A câmera vira prévia local (getUserMedia),
 *    que não passa pelo LiveKit — ninguém do outro lado vê nada.
 * 2. O início automático da live agendada só dispara com o pré-voo aprovado.
 *    Entrar no ar com microfone mudo é pior do que começar dois minutos
 *    atrasado.
 */
function Controles({
  slug,
  status,
  aoMudarStatus,
  startsAt,
  autoIniciar,
}: {
  slug: string;
  status: StatusSala;
  aoMudarStatus: (s: StatusSala) => void;
  startsAt: string | null;
  autoIniciar: boolean;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participantes = useParticipants();
  const estadoConexao = useConnectionState();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const minhaTrack = tracks.find(
    (t) => t.participant.identity === localParticipant.identity,
  );

  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const jaAutoiniciou = useRef(false);

  const noAr = permitePublicar(status);
  const conectado = estadoConexao === ConnectionState.Connected;

  const preVoo = usePreVoo({ camera, microfone: mic, ativo: !noAr });
  const contagem = useContagem(status === "scheduled" ? startsAt : null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __lyvisRoom?: unknown }).__lyvisRoom = room;
    }
  }, [room]);

  // prévia local aparece no lugar do vídeo enquanto não está no ar
  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = preVoo.stream;
  }, [preVoo.stream]);

  // no ar: publica o que estiver ligado. Fora do ar: não publica nada.
  useEffect(() => {
    if (!conectado) return;
    if (noAr) {
      localParticipant.setCameraEnabled(camera).catch(() => {});
      localParticipant.setMicrophoneEnabled(mic).catch(() => {});
    } else {
      localParticipant.setCameraEnabled(false).catch(() => {});
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
  }, [noAr, camera, mic, conectado, localParticipant]);

  const entrarNoAr = async () => {
    setOcupado(true);
    aoMudarStatus("live");
    await mudarStatus(slug, "live");
    setOcupado(false);
  };

  // início automático da live agendada — só com o pré-voo aprovado
  useEffect(() => {
    if (jaAutoiniciou.current) return;
    if (!autoIniciar || status !== "scheduled") return;
    if (!contagem || contagem.fase !== "passou") return;
    if (!conectado || !preVoo.pronto) return;

    jaAutoiniciou.current = true;
    // fora do corpo do efeito: mudar estado aqui dentro dispara render em cascata
    const id = setTimeout(() => entrarNoAr(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoIniciar, status, contagem, conectado, preVoo.pronto]);

  const espectadores = Math.max(participantes.length - 1, 0);
  const horaChegou = contagem?.fase === "passou";
  const seguraPorPreVoo = horaChegou && autoIniciar && !preVoo.pronto;

  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {noAr && minhaTrack ? (
          <VideoTrack trackRef={minhaTrack} className="h-full w-full object-cover" />
        ) : preVoo.stream ? (
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

      {status === "scheduled" && startsAt && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <ContagemRegressiva
            alvoIso={startsAt}
            titulo={
              autoIniciar
                ? "Entra no ar sozinho em"
                : "Horário marcado — você entra no ar em"
            }
          />
          {seguraPorPreVoo && (
            <p className="mt-3 text-center text-sm text-amber-400">
              Chegou a hora, mas o pré-voo não passou. Ligue câmera e
              microfone — a entrada automática está segurada.
            </p>
          )}
        </div>
      )}

      {!noAr && <ChecklistPreVoo preVoo={preVoo} exigeMicrofone={mic} />}

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
            onClick={() => entrarNoAr()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {status === "ended" ? "Voltar ao ar" : "Entrar no ar"}
          </button>
        ) : (
          <button
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              aoMudarStatus("ended");
              await mudarStatus(slug, "ended");
              setOcupado(false);
            }}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm disabled:opacity-50"
          >
            Encerrar transmissão
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-neutral-400">
        <span>
          Conexão:{" "}
          <b className="text-neutral-200">
            {conectado ? "conectado" : estadoConexao}
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
  startsAt,
  autoIniciar,
}: {
  slug: string;
  status: string;
  startsAt: string | null;
  autoIniciar: boolean;
}) {
  const [cred, setCred] = useState<{ url: string; token: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusSala>(statusInicial as StatusSala);
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
      <Controles
        slug={slug}
        status={status}
        aoMudarStatus={setStatus}
        startsAt={startsAt}
        autoIniciar={autoIniciar}
      />
    </LiveKitRoom>
  );
}
