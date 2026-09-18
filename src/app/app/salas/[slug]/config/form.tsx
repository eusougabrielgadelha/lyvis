"use client";

import { useActionState } from "react";
import type { BannerFinal, GateConfig } from "@/lib/rooms";
import { salvarConfig, type EstadoConfig } from "./actions";

export function FormConfig({
  slug,
  gate,
  banner,
}: {
  slug: string;
  gate: GateConfig;
  banner: BannerFinal;
}) {
  const [estado, formAction, pendente] = useActionState<EstadoConfig, FormData>(
    salvarConfig,
    {},
  );

  const campo =
    "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm";

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-400">
          Inscrição do espectador
        </h2>
        <select name="gate_quando" defaultValue={gate.when} className={campo}>
          <option value="never">Não pedir nada</option>
          <option value="to_chat">Pedir só pra falar no chat</option>
          <option value="to_watch">Pedir pra assistir</option>
        </select>
        <div className="flex flex-wrap gap-4 text-sm">
          {(["name", "email", "phone"] as const).map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="gate_campos"
                value={c}
                defaultChecked={gate.fields.includes(c) || c === "name"}
                disabled={c === "name"}
              />
              {c === "name" ? "Nome" : c === "email" ? "E-mail" : "Telefone"}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="gate_consentimento"
              defaultChecked={gate.consent?.required ?? true}
            />
            Pedir aceite (LGPD)
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-neutral-400">
            Banner final
          </h2>
          <p className="text-xs text-neutral-500">
            Aparece no lugar do vídeo quando a transmissão encerra. Sem banner,
            mostramos uma faixa enxuta e a oferta ganha a tela.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="banner_ativo"
            defaultChecked={banner.enabled}
          />
          Usar banner final
        </label>

        <input
          name="imagem_url"
          defaultValue={banner.imagem_url ?? ""}
          placeholder="https://... (imagem 16:9)"
          className={campo}
        />
        <input
          name="banner_titulo"
          defaultValue={banner.titulo ?? ""}
          placeholder="Título (ex: As vagas fecham hoje às 23h59)"
          className={campo}
        />
        <textarea
          name="banner_texto"
          rows={3}
          defaultValue={banner.texto ?? ""}
          placeholder="Mensagem de encerramento, instrução ou CTA"
          className={campo}
        />
      </section>

      {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-400">Configuração salva.</p>}

      <button
        disabled={pendente}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
