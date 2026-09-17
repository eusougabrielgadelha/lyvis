"use client";

import { useEffect, useRef, useState } from "react";
import type { Bloco } from "./schemas";
import { adaptadorPara, type ContextoCheckout } from "@/checkout-adapters";

export function BlocoTexto({ props }: { props: { titulo?: string; texto: string } }) {
  return (
    <div>
      {props.titulo && (
        <h3 className="mb-1 text-lg font-semibold">{props.titulo}</h3>
      )}
      <p className="whitespace-pre-line text-sm text-neutral-300">{props.texto}</p>
    </div>
  );
}

export function BlocoBotao({
  props,
  aoClicar,
}: {
  props: { rotulo: string; url: string; novaAba: boolean };
  aoClicar?: () => void;
}) {
  return (
    <a
      href={props.url}
      target={props.novaAba ? "_blank" : undefined}
      rel="noreferrer"
      onClick={aoClicar}
      className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold"
    >
      {props.rotulo}
    </a>
  );
}

export function BlocoQuiz({
  props,
  respondido,
  aoResponder,
}: {
  props: { pergunta: string; opcoes: string[] };
  respondido?: string;
  aoResponder: (opcao: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-medium">{props.pergunta}</p>
      <div className="space-y-2">
        {props.opcoes.map((o) => (
          <button
            key={o}
            disabled={Boolean(respondido)}
            onClick={() => aoResponder(o)}
            className={`w-full rounded-lg border px-4 py-2 text-left text-sm ${
              respondido === o
                ? "border-blue-500 bg-blue-600/20"
                : "border-neutral-700 hover:border-neutral-500"
            } disabled:opacity-60`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BlocoTimer({
  props,
}: {
  props: { rotulo: string; segundos: number };
}) {
  const [restante, setRestante] = useState(props.segundos);

  useEffect(() => {
    setRestante(props.segundos);
    const t = setInterval(
      () => setRestante((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    return () => clearInterval(t);
  }, [props.segundos]);

  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");

  return (
    <div className="rounded-lg bg-neutral-800 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-neutral-400">
        {props.rotulo}
      </p>
      <p className="font-mono text-2xl font-semibold">
        {mm}:{ss}
      </p>
    </div>
  );
}

export function BlocoCheckout({
  props,
  ctx,
  aoAbrir,
}: {
  props: { provedor: string; referencia: string; rotulo: string };
  ctx: ContextoCheckout;
  aoAbrir?: () => void;
}) {
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    el.dataset.rotulo = props.rotulo;
    const adaptador = adaptadorPara(props.provedor);
    let vivo = true;

    adaptador.montar(el, props.referencia, ctx).then(() => {
      if (!vivo) return adaptador.desmontar();
      // o widget da Hotmart liga o clique uma vez só: revincula a cada montagem
      adaptador.revincular();
    });

    // fase de captura: o fancybox da Hotmart interrompe a propagação do
    // clique, e sem isso o evento checkout_opened nunca era registrado
    const clique = () => aoAbrir?.();
    el.addEventListener("click", clique, true);

    return () => {
      vivo = false;
      el.removeEventListener("click", clique, true);
      adaptador.desmontar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.provedor, props.referencia, props.rotulo]);

  return <div ref={alvo} />;
}

export function RenderizarBloco({
  bloco,
  ctx,
  resposta,
  aoResponder,
  aoEvento,
}: {
  bloco: Bloco;
  ctx: ContextoCheckout;
  resposta?: string;
  aoResponder: (blocoId: string, valor: string) => void;
  aoEvento: (blocoId: string, evento: string) => void;
}) {
  switch (bloco.tipo) {
    case "texto":
      return <BlocoTexto props={bloco.props} />;
    case "botao":
      return (
        <BlocoBotao
          props={bloco.props}
          aoClicar={() => aoEvento(bloco.id, "clicked")}
        />
      );
    case "quiz":
      return (
        <BlocoQuiz
          props={bloco.props}
          respondido={resposta}
          aoResponder={(o) => aoResponder(bloco.id, o)}
        />
      );
    case "timer":
      return <BlocoTimer props={bloco.props} />;
    case "checkout":
      return (
        <BlocoCheckout
          props={bloco.props}
          ctx={ctx}
          aoAbrir={() => aoEvento(bloco.id, "checkout_opened")}
        />
      );
  }
}
