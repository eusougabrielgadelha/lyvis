/**
 * Contagem regressiva — funções puras, sem React e sem acesso a rede.
 *
 * Por que separado: a mesma contagem aparece pro espectador ("faltam 2 dias"),
 * pro host (com o pré-voo) e um dia no e-mail de lembrete. Regra em um lugar
 * só, testável sem navegador.
 *
 * Relógio: nunca confie no relógio do visitante. O navegador pode estar
 * minutos (ou dias) fora, e aí a live "começa" na hora errada pra ele. Quem
 * manda é o servidor; o cliente guarda a diferença e corrige a partir dela.
 */

export type FaseContagem =
  | "distante" // mais de 1 hora
  | "proxima" // menos de 1 hora
  | "iminente" // menos de 1 minuto
  | "passou";

export type Contagem = {
  restanteMs: number;
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  fase: FaseContagem;
  /** "2 dias e 4 horas", "12 min 30 s", "agora" */
  texto: string;
};

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function faseDe(restanteMs: number): FaseContagem {
  if (restanteMs <= 0) return "passou";
  if (restanteMs < MINUTO) return "iminente";
  if (restanteMs < HORA) return "proxima";
  return "distante";
}

/**
 * Texto amigável. Mostra só as duas maiores unidades: "faltam 3 dias e 5
 * horas" é mais útil que "3d 5h 12min 8s", e a pessoa não fica hipnotizada
 * contando segundo a segundo quando ainda falta muito.
 */
export function textoDaContagem(c: Omit<Contagem, "texto" | "fase">): string {
  const { dias, horas, minutos, segundos, restanteMs } = c;
  if (restanteMs <= 0) return "agora";

  if (dias > 0) {
    return horas > 0
      ? `${dias} ${dias === 1 ? "dia" : "dias"} e ${horas}h`
      : `${dias} ${dias === 1 ? "dia" : "dias"}`;
  }
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, "0")}min`;
  if (minutos > 0)
    return `${minutos}min ${String(segundos).padStart(2, "0")}s`;
  return `${segundos}s`;
}

/** Quanto falta entre `agora` e `alvo`. Ambos em milissegundos. */
export function calcularContagem(alvoMs: number, agoraMs: number): Contagem {
  const restanteMs = Math.max(alvoMs - agoraMs, 0);

  const dias = Math.floor(restanteMs / DIA);
  const horas = Math.floor((restanteMs % DIA) / HORA);
  const minutos = Math.floor((restanteMs % HORA) / MINUTO);
  const segundos = Math.floor((restanteMs % MINUTO) / SEGUNDO);

  const base = { restanteMs, dias, horas, minutos, segundos };
  return {
    ...base,
    fase: faseDe(restanteMs),
    texto: textoDaContagem(base),
  };
}

/**
 * De quanto em quanto tempo vale redesenhar e reconferir o servidor.
 * Faltando dias, checar de minuto em minuto basta. No último minuto, de
 * segundo em segundo — é quando o atraso incomoda.
 */
export function intervaloDeAtualizacao(fase: FaseContagem): number {
  switch (fase) {
    case "distante":
      return 30 * SEGUNDO;
    case "proxima":
      return 5 * SEGUNDO;
    case "iminente":
    case "passou":
      return SEGUNDO;
  }
}

/** Formata data e hora no padrão brasileiro, com fuso do visitante. */
export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
