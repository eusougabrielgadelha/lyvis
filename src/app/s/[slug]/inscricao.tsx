"use client";

import { useActionState } from "react";
import { inscrever, type EstadoInscricao } from "./actions";
import type { GateConfig } from "@/lib/rooms";

export function Inscricao({
  slug,
  gate,
  titulo,
}: {
  slug: string;
  gate: GateConfig;
  titulo: string;
}) {
  const [estado, formAction, pendente] = useActionState<
    EstadoInscricao,
    FormData
  >(inscrever, {});

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
    >
      <input type="hidden" name="slug" value={slug} />
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-neutral-400">
          {gate.when === "to_watch"
            ? "Preencha pra assistir."
            : "Preencha pra falar no chat."}
        </p>
      </div>

      <input
        name="nome"
        placeholder="Seu nome"
        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
      />
      {gate.fields.includes("email") && (
        <input
          name="email"
          type="email"
          placeholder="Seu e-mail"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
      )}
      {gate.fields.includes("phone") && (
        <input
          name="telefone"
          inputMode="tel"
          placeholder="Seu WhatsApp (DDD + número)"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
      )}

      {gate.consent?.required && (
        <label className="flex items-start gap-2 text-xs text-neutral-400">
          <input type="checkbox" name="consentimento" className="mt-0.5" />
          <span>
            {gate.consent.text ??
              "Aceito receber contato sobre este evento e conteúdos relacionados."}
          </span>
        </label>
      )}

      {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}

      <button
        disabled={pendente}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pendente ? "Entrando..." : "Entrar na sala"}
      </button>
    </form>
  );
}
