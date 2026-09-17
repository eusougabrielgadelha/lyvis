"use client";

import { useActionState } from "react";
import { aceitar, type EstadoConvite } from "./actions";

export function FormularioConvite({ token }: { token: string }) {
  const [estado, formAction, pendente] = useActionState<EstadoConvite, FormData>(
    aceitar,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      <input
        name="senha"
        type="password"
        autoComplete="new-password"
        placeholder="Crie uma senha (8+ caracteres)"
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
      />
      {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}
      <button
        disabled={pendente}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pendente ? "Criando acesso..." : "Aceitar convite"}
      </button>
    </form>
  );
}
