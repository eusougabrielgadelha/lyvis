"use client";

import Image from "next/image";
import type { BannerFinal } from "@/lib/rooms";

/**
 * O que ocupa o lugar do vídeo quando a transmissão encerra.
 *
 * Contexto: a pessoa passou uma hora na live. Sem vídeo, quem tem que
 * chamar a atenção é a oferta — não um retângulo preto escrito "encerrada".
 * Com banner, o cliente coloca a mensagem de fechamento dele. Sem banner,
 * mostramos uma faixa enxuta e o pitch cresce.
 */
export function Encerrada({ banner }: { banner: BannerFinal }) {
  if (banner.enabled && banner.imagem_url) {
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <Image
          src={banner.imagem_url}
          alt={banner.titulo ?? "Transmissão encerrada"}
          width={1280}
          height={720}
          unoptimized
          className="h-auto w-full"
        />
        {(banner.titulo || banner.texto) && (
          <div className="bg-neutral-900 px-5 py-4">
            {banner.titulo && (
              <p className="font-semibold">{banner.titulo}</p>
            )}
            {banner.texto && (
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-400">
                {banner.texto}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (banner.enabled && (banner.titulo || banner.texto)) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-8 text-center">
        {banner.titulo && (
          <p className="text-xl font-semibold">{banner.titulo}</p>
        )}
        {banner.texto && (
          <p className="mt-2 whitespace-pre-line text-sm text-neutral-400">
            {banner.texto}
          </p>
        )}
      </div>
    );
  }

  // sem banner: faixa enxuta, pra não roubar espaço da oferta
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-600" />
      <p className="text-sm text-neutral-400">
        <b className="text-neutral-200">Transmissão encerrada.</b> A oferta
        apresentada continua disponível abaixo.
      </p>
    </div>
  );
}
