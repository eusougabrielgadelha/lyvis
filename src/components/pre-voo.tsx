"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pré-voo: checagem de câmera e microfone antes de entrar no ar.
 *
 * Existe por um motivo específico: numa live agendada a transmissão começa
 * sozinha no horário. Se o microfone estiver mudo ou a câmera negada, o
 * apresentador fala dez minutos pra uma sala que não ouve nada. O pré-voo
 * mede sinal de verdade — não "a permissão foi concedida", e sim "está
 * entrando áudio" e "está chegando imagem".
 */

export type EstadoDispositivo = "desligado" | "testando" | "ok" | "erro";

export type PreVoo = {
  stream: MediaStream | null;
  camera: EstadoDispositivo;
  microfone: EstadoDispositivo;
  /** 0..1 — volume captado agora. Sem sinal por alguns segundos = mudo. */
  nivelAudio: number;
  erro: string | null;
  pronto: boolean;
  parar: () => void;
};

export function usePreVoo({
  camera: querCamera,
  microfone: querMicrofone,
  ativo,
}: {
  camera: boolean;
  microfone: boolean;
  /** desliga tudo quando o LiveKit assume os dispositivos */
  ativo: boolean;
}): PreVoo {
  // Um resultado só, gravado quando a captura resolve. Os estados de câmera
  // e microfone são DERIVADOS dele — sem isso o efeito precisaria chamar
  // setState de forma síncrona, gerando render em cascata.
  const [resultado, setResultado] = useState<{
    stream: MediaStream | null;
    temVideo: boolean;
    temAudio: boolean;
    erro: string | null;
  } | null>(null);
  const [nivelAudio, setNivelAudio] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);

  /**
   * Solta os dispositivos. Mexe só em refs, sem tocar em estado: é chamada
   * de dentro de efeito, e setState síncrono ali gera render em cascata.
   * O que a interface mostra vem do estado derivado mais abaixo.
   */
  const parar = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!ativo || (!querCamera && !querMicrofone)) {
      parar();
      return;
    }

    let cancelado = false;

    navigator.mediaDevices
      .getUserMedia({ video: querCamera, audio: querMicrofone })
      .then((s) => {
        if (cancelado) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        setResultado({
          stream: s,
          temVideo: s.getVideoTracks().length > 0,
          temAudio: s.getAudioTracks().length > 0,
          erro: null,
        });

        if (!querMicrofone || !s.getAudioTracks().length) return;

        // medidor de volume: prova que está entrando som, não só permissão
        const ctx = new AudioContext();
        audioCtx.current = ctx;
        const fonte = ctx.createMediaStreamSource(s);
        const analisador = ctx.createAnalyser();
        analisador.fftSize = 512;
        fonte.connect(analisador);
        const dados = new Uint8Array(analisador.frequencyBinCount);

        const medir = () => {
          analisador.getByteTimeDomainData(dados);
          let pico = 0;
          for (const v of dados) pico = Math.max(pico, Math.abs(v - 128) / 128);
          setNivelAudio(pico);
          raf.current = requestAnimationFrame(medir);
        };
        medir();
      })
      .catch((e: DOMException) => {
        if (cancelado) return;
        setResultado({
          stream: null,
          temVideo: false,
          temAudio: false,
          erro:
            e.name === "NotAllowedError"
              ? "Permissão negada. Libere câmera e microfone no navegador."
              : e.name === "NotFoundError"
                ? "Nenhum dispositivo encontrado."
                : "Não consegui acessar câmera ou microfone.",
        });
      });

    return () => {
      cancelado = true;
    };
  }, [ativo, querCamera, querMicrofone, parar]);

  useEffect(() => parar, [parar]);

  const derivar = (quer: boolean, tem: boolean): EstadoDispositivo => {
    if (!quer || !ativo) return "desligado";
    if (!resultado) return "testando";
    return tem ? "ok" : "erro";
  };

  const camera = derivar(querCamera, resultado?.temVideo ?? false);
  const microfone = derivar(querMicrofone, resultado?.temAudio ?? false);
  const pronto =
    (!querCamera || camera === "ok") && (!querMicrofone || microfone === "ok");

  return {
    // com o pré-voo desligado, nada de stream ou nível antigos vazando
    stream: ativo ? (resultado?.stream ?? null) : null,
    camera,
    microfone,
    nivelAudio: ativo ? nivelAudio : 0,
    erro: ativo ? (resultado?.erro ?? null) : null,
    pronto,
    parar,
  };
}

function Indicador({ estado, rotulo }: { estado: EstadoDispositivo; rotulo: string }) {
  const cor =
    estado === "ok"
      ? "bg-green-500"
      : estado === "erro"
        ? "bg-red-500"
        : estado === "testando"
          ? "bg-amber-500"
          : "bg-neutral-600";

  const texto =
    estado === "ok"
      ? "pronto"
      : estado === "erro"
        ? "com problema"
        : estado === "testando"
          ? "testando..."
          : "desligado";

  return (
    <span className="flex items-center gap-2 text-sm text-neutral-400">
      <span className={`h-2 w-2 rounded-full ${cor}`} />
      {rotulo}: <b className="text-neutral-200">{texto}</b>
    </span>
  );
}

export function ChecklistPreVoo({
  preVoo,
  exigeMicrofone,
}: {
  preVoo: PreVoo;
  exigeMicrofone: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-sm font-medium">Pré-voo</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Indicador estado={preVoo.camera} rotulo="Câmera" />
        <Indicador estado={preVoo.microfone} rotulo="Microfone" />
      </div>

      {exigeMicrofone && preVoo.microfone === "ok" && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-green-500 transition-[width] duration-100"
              style={{ width: `${Math.min(preVoo.nivelAudio * 180, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Fale alguma coisa — a barra tem que se mexer.
          </p>
        </div>
      )}

      {preVoo.erro && <p className="text-sm text-red-400">{preVoo.erro}</p>}
    </div>
  );
}
