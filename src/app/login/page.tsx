"use client";

import { useActionState } from "react";
import { autenticar, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = {};

export default function LoginPage() {
  const [estado, formAction, pendente] = useActionState(autenticar, inicial);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Lyvis</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Entre pra gerenciar suas salas.
        </p>

        <form action={formAction} className="mt-6 space-y-3">
          <input type="hidden" name="modo" value="entrar" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          />
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          />

          {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}
          {estado.aviso && (
            <p className="text-sm text-amber-400">{estado.aviso}</p>
          )}

          <button
            type="submit"
            disabled={pendente}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pendente ? "Aguarde..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-500">
          Acesso só por convite. Recebeu um link? Abra ele pra criar sua senha.
        </p>
      </div>
    </main>
  );
}
