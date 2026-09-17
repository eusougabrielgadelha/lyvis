"use client";

import { useActionState } from "react";
import { criarSala, type EstadoSala } from "./actions";

export function NovaSala({ podeReuniao }: { podeReuniao: boolean }) {
  const [estado, formAction, pendente] = useActionState<EstadoSala, FormData>(
    criarSala,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="titulo"
        placeholder="Nome da sala"
        className="min-w-52 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
      />
      <select
        name="modo"
        className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
      >
        <option value="live">Live</option>
        <option value="meeting" disabled={!podeReuniao}>
          Sala de vídeo {podeReuniao ? "" : "(fora do plano)"}
        </option>
      </select>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pendente ? "Criando..." : "Criar sala"}
      </button>
      {estado.erro && (
        <p className="w-full text-sm text-red-400">{estado.erro}</p>
      )}
    </form>
  );
}
