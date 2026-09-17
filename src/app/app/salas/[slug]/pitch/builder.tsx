"use client";

import { useActionState, useState } from "react";
import { salvarPitch, type EstadoBuilder } from "./actions";

type Modelo = { id: string; nome: string; campos: string[] };

const MODELOS: Modelo[] = [
  { id: "texto_checkout", nome: "Texto + checkout", campos: ["texto", "checkout"] },
  { id: "texto_quiz", nome: "Texto + quiz", campos: ["texto", "quiz"] },
  { id: "quiz_checkout", nome: "Quiz → checkout", campos: ["texto", "quiz", "checkout"] },
  { id: "quiz", nome: "Só quiz", campos: ["quiz"] },
  { id: "checkout", nome: "Só checkout", campos: ["checkout"] },
];

export function Builder({ slug, modulos }: { slug: string; modulos: string[] }) {
  const [modelo, setModelo] = useState<string>("texto_checkout");
  const [estado, formAction, pendente] = useActionState<EstadoBuilder, FormData>(
    salvarPitch,
    {},
  );

  const campos: string[] = MODELOS.find((m) => m.id === modelo)?.campos ?? [];
  const temQuiz = modulos.includes("block.quiz");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      <div className="flex flex-wrap gap-2">
        {MODELOS.map((m) => {
          const bloqueado = m.campos.includes("quiz") && !temQuiz;
          return (
            <button
              key={m.id}
              type="button"
              disabled={bloqueado}
              onClick={() => setModelo(m.id)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                modelo === m.id
                  ? "border-blue-500 bg-blue-600/20"
                  : "border-neutral-700"
              } disabled:opacity-40`}
            >
              {m.nome}
              {bloqueado && " (fora do plano)"}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="modelo" value={modelo} />

      <input
        name="nome"
        placeholder="Nome do pitch (só você vê)"
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
      />

      {campos.includes("texto") && (
        <div className="space-y-2">
          <input
            name="titulo"
            placeholder="Título da oferta"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          />
          <textarea
            name="texto"
            rows={4}
            placeholder="Texto persuasivo que aparece abaixo do vídeo"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>
      )}

      {campos.includes("quiz") && (
        <div className="space-y-2">
          <input
            name="pergunta"
            placeholder="Pergunta do quiz"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          />
          <textarea
            name="opcoes"
            rows={3}
            placeholder={"Uma opção por linha\nSim, já vendo\nAinda não"}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>
      )}

      {campos.includes("checkout") && (
        <div className="flex flex-wrap gap-2">
          <select
            name="provedor"
            defaultValue="hotmart"
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          >
            <option value="hotmart">Hotmart (pop-up)</option>
            <option value="eduzz">Eduzz (na página)</option>
            <option value="kiwify">Kiwify (janela)</option>
            <option value="xgrow">Xgrow (janela)</option>
          </select>
          <input
            name="referencia"
            placeholder="Código do produto ou URL do checkout"
            className="min-w-56 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            name="rotulo"
            defaultValue="Comprar agora"
            className="w-44 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>
      )}

      {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-400">Pitch salvo.</p>}

      <button
        disabled={pendente}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Salvar pitch"}
      </button>
    </form>
  );
}
