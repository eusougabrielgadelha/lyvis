"use client";

import { useActionState, useState } from "react";
import { autenticar, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = {};

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [estado, formAction, pendente] = useActionState(autenticar, inicial);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Lyvis</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {modo === "entrar"
            ? "Entre pra gerenciar suas salas."
            : "Crie sua conta e monte a primeira sala."}
        </p>

        <form action={formAction} key={modo} className="mt-6 space-y-3">
          <input type="hidden" name="modo" value={modo} />
          {modo === "criar" && (
            <input
              name="nome"
              placeholder="Seu nome ou da empresa"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
            />
          )}
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
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
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
            {pendente
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="mt-4 text-sm text-neutral-400 underline underline-offset-4"
        >
          {modo === "entrar"
            ? "Não tenho conta ainda"
            : "Já tenho conta, quero entrar"}
        </button>
      </div>
    </main>
  );
}
