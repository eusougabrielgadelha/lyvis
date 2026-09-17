"use client";

import { useActionState } from "react";
import { convidar, type EstadoEquipe } from "./actions";

export function ConvidarForm({ podeConvidar }: { podeConvidar: boolean }) {
  const [estado, formAction, pendente] = useActionState<EstadoEquipe, FormData>(
    convidar,
    {},
  );

  if (!podeConvidar) {
    return (
      <p className="text-sm text-neutral-500">
        Só o dono ou um administrador da conta pode convidar pessoas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          placeholder="E-mail de quem vai entrar"
          className="min-w-56 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
        <select
          name="papel"
          defaultValue="host"
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="host">Apresentador</option>
          <option value="moderator">Moderador do chat</option>
          <option value="admin">Administrador</option>
        </select>
        <button
          disabled={pendente}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pendente ? "Gerando..." : "Gerar convite"}
        </button>
      </form>

      {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}

      {estado.link && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <p className="text-sm">
            Convite de <b>{estado.email}</b> pronto. Mande este link pra pessoa:
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={estado.link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs"
            />
            <button
              onClick={() => navigator.clipboard.writeText(estado.link!)}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-xs"
            >
              Copiar
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Vale por 14 dias. O link não fica salvo no banco — se perder, gere outro.
          </p>
        </div>
      )}
    </div>
  );
}
