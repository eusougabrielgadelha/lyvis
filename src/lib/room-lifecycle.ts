/**
 * Ciclo de vida da sala — a regra mora aqui, não espalhada pelas telas.
 *
 *   draft ──agendar──▶ scheduled ──entrar no ar──▶ live ──encerrar──▶ ended
 *     ▲                    │                        ▲                   │
 *     └────────────────────┴────────voltar ao ar────┴───────────────────┘
 *
 * O que cada estado significa na prática:
 *
 * | Estado      | Host                        | Espectador                        |
 * |-------------|-----------------------------|-----------------------------------|
 * | `draft`     | prévia local, nada publicado | "ainda não começou"              |
 * | `scheduled` | prévia + pré-voo + contagem  | contagem regressiva               |
 * | `live`      | publicando                   | vídeo + pitch + chat              |
 * | `ended`     | pode voltar ao ar            | banner final + pitch em destaque  |
 *
 * Regras invioláveis:
 * 1. Só `live` emite token de espectador. A fronteira é o servidor.
 * 2. Só `live` publica mídia. Fora dele a câmera do host é prévia local.
 * 3. `live` e `ended` mostram pitch; `draft` e `scheduled` nunca.
 * 4. Entrar no ar encerra as ativações de pitch anteriores.
 */

export type StatusSala = "draft" | "scheduled" | "live" | "ended";

export const TRANSICOES: Record<StatusSala, StatusSala[]> = {
  draft: ["scheduled", "live"],
  scheduled: ["live", "draft"],
  live: ["ended"],
  ended: ["live", "scheduled"],
};

export function podeTransicionar(de: StatusSala, para: StatusSala): boolean {
  return TRANSICOES[de]?.includes(para) ?? false;
}

/** Espectador só recebe token de vídeo com a sala no ar. */
export function permiteTokenEspectador(status: StatusSala): boolean {
  return status === "live";
}

/** Pitch aparece durante a live e continua depois dela (oferta pós-live). */
export function permitePitch(status: StatusSala): boolean {
  return status === "live" || status === "ended";
}

/** Host publica mídia só no ar. */
export function permitePublicar(status: StatusSala): boolean {
  return status === "live";
}

/** A sala tem horário marcado que ainda não chegou? */
export function estaAgendada(
  status: StatusSala,
  startsAt: string | null,
): startsAt is string {
  return status === "scheduled" && Boolean(startsAt);
}

export const ROTULO_STATUS: Record<StatusSala, string> = {
  draft: "rascunho",
  scheduled: "agendada",
  live: "no ar",
  ended: "encerrada",
};
