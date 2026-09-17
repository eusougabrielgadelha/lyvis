"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enviarMensagem } from "./actions";

export type Mensagem = {
  id: number | string;
  display_name: string;
  body: string;
  created_at: string;
};

export function Chat({
  slug,
  roomId,
  inicial,
  podeFalar,
}: {
  slug: string;
  roomId: string;
  inicial: Mensagem[];
  podeFalar: boolean;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(inicial);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`sala:${roomId}`)
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setMensagens((atuais) =>
          atuais.some((m) => m.id === payload.id)
            ? atuais
            : [...atuais, payload as Mensagem],
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [roomId]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const corpo = texto.trim();
    if (!corpo) return;
    setTexto("");
    setErro(null);
    const r = await enviarMensagem(slug, corpo);
    if (r?.erro) setErro(r.erro);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 px-4 py-2 text-sm font-medium">
        Chat
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
        {mensagens.length === 0 && (
          <p className="text-neutral-500">Ninguém falou ainda.</p>
        )}
        {mensagens.map((m) => (
          <p key={m.id}>
            <span className="font-medium text-blue-400">{m.display_name}</span>{" "}
            <span className="text-neutral-200">{m.body}</span>
          </p>
        ))}
        <div ref={fim} />
      </div>

      <form onSubmit={enviar} className="border-t border-neutral-800 p-3">
        {erro && <p className="mb-2 text-xs text-red-400">{erro}</p>}
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              podeFalar ? "Escreva sua mensagem" : "Inscreva-se pra falar"
            }
            maxLength={500}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          />
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium">
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
