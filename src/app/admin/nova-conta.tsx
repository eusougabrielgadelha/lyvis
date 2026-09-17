"use client";

import { useActionState } from "react";
import { criarContaCliente, type EstadoAdmin } from "./actions";

export function NovaConta() {
  const [estado, formAction, pendente] = useActionState<EstadoAdmin, FormData>(
    criarContaCliente,
    {},
  );

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          name="nome"
          placeholder="Nome do cliente (ex: Henrique Toledo)"
          className="min-w-52 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
        <input
          name="email"
          type="email"
          placeholder="E-mail do dono"
          className="min-w-52 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
        <select
          name="plano"
          defaultValue="pro"
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="scale">Scale</option>
        </select>
        <button
          disabled={pendente}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pendente ? "Criando..." : "Criar conta"}
        </button>
      </form>

      {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}

      {estado.link && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <p className="text-sm">
            Conta criada. Mande este link pra <b>{estado.email}</b>:
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
        </div>
      )}
    </div>
  );
}
