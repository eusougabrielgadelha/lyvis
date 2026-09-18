"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { tokenEspectador } from "./actions";
import { ContagemRegressiva } from "@/components/contagem-regressiva";
import { estaAgendada, type StatusSala } from "@/lib/room-lifecycle";

/** Tempo sem receber vídeo, já conectado, antes de refazer a conexão. */
const ESPERA_ANTES_DE_TENTAR_DE_NOVO = 12000;

function Video({ aoFicarSemVideo }: { aoFicarSemVideo: () => void }) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });
  const conexao = useConnectionState();
  // prefere uma faixa realmente ativa: depois de encerrar e voltar ao ar, o
  // host pode ficar com uma publicação antiga mutada, e escolher essa deixa a
  // tela preta com o apresentador falando
  const principal =
    tracks.find((t) => t.publication && !t.publication.isMuted) ?? tracks[0];

  /**
   * Cão de guarda. Quando a primeira tentativa de WebRTC falha, o LiveKit
   * reconecta em outra região — e as faixas que já estavam a caminho caem na
   * conexão morta ("skipping incoming track after Room disconnected"). O
   * resultado é um espectador conectado e sem imagem, pra sempre. Aqui a
   * gente detecta e refaz a conexão em vez de esperar o F5 que nunca vem.
   */
  useEffect(() => {
    if (principal || conexao !== ConnectionState.Connected) return;
    const id = setTimeout(aoFicarSemVideo, ESPERA_ANTES_DE_TENTAR_DE_NOVO);
    return () => clearTimeout(id);
  }, [principal, conexao, aoFicarSemVideo]);

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
  status,
  startsAt,
}: {
  slug: string;
  status: StatusSala;
  startsAt: string | null;
}) {
  const [cred, setCred] = useState<{ url: string; token: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const pedindo = useRef(false);

  const MAX_TENTATIVAS = 3;

  const refazerConexao = useCallback(() => {
    setTentativa((n) => (n < MAX_TENTATIVAS ? n + 1 : n));
  }, []);

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
      ) : tentativa >= MAX_TENTATIVAS ? (
        <Aviso texto="Não consegui receber o vídeo. Recarregue a página." />
      ) : status === "ended" ? (
        <Aviso texto="Esta transmissão foi encerrada." />
      ) : estaAgendada(status, startsAt) ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6">
          <ContagemRegressiva alvoIso={startsAt} />
          <p className="text-xs text-neutral-500">
            Deixe esta página aberta — ela começa sozinha.
          </p>
        </div>
      ) : status !== "live" ? (
        <Aviso texto="A transmissão ainda não começou. Deixe esta página aberta." />
      ) : !credAtiva ? (
        <Aviso texto="Entrando na transmissão..." />
      ) : (
        <LiveKitRoom
          key={tentativa} // mudar a chave refaz a conexão do zero
          serverUrl={credAtiva.url}
          token={credAtiva.token}
          connect
          video={false}
          audio={false}
          className="h-full"
        >
          <Video aoFicarSemVideo={refazerConexao} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}
    </div>
  );
}
