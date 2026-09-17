import { z } from "zod";

/**
 * Cada bloco tem um schema. O mesmo schema valida no editor, na hora de
 * salvar no servidor e ao renderizar na sala — um lugar só pra mudar.
 */

export const textoSchema = z.object({
  titulo: z.string().max(140).optional(),
  texto: z.string().max(2000),
});

export const botaoSchema = z.object({
  rotulo: z.string().min(1).max(60),
  url: z.string().url(),
  novaAba: z.boolean().default(true),
});

export const quizSchema = z.object({
  pergunta: z.string().min(1).max(200),
  opcoes: z.array(z.string().min(1).max(80)).min(2).max(6),
});

export const timerSchema = z.object({
  rotulo: z.string().max(80).default("A oferta encerra em"),
  segundos: z.number().int().min(10).max(7200),
});

export const PROVEDORES = ["eduzz", "hotmart", "kiwify", "xgrow"] as const;

export const checkoutSchema = z.object({
  provedor: z.enum(PROVEDORES),
  /** Hotmart: código do produto. Eduzz: id do contrato. Kiwify/Xgrow: URL. */
  referencia: z.string().min(1).max(300),
  rotulo: z.string().max(60).default("Comprar agora"),
});

export const blocoSchema = z.discriminatedUnion("tipo", [
  z.object({ id: z.string(), tipo: z.literal("texto"), props: textoSchema }),
  z.object({ id: z.string(), tipo: z.literal("botao"), props: botaoSchema }),
  z.object({ id: z.string(), tipo: z.literal("quiz"), props: quizSchema }),
  z.object({ id: z.string(), tipo: z.literal("timer"), props: timerSchema }),
  z.object({ id: z.string(), tipo: z.literal("checkout"), props: checkoutSchema }),
]);

export const regraSchema = z.object({
  quando: z
    .object({ bloco: z.string(), igual: z.string() })
    .optional(),
  vaiPara: z.string(),
});

export const etapaSchema = z.object({
  blocos: z.array(blocoSchema).min(1),
  proxima: z.array(regraSchema).default([]),
});

export const pitchSchema = z.object({
  inicio: z.string(),
  etapas: z.record(z.string(), etapaSchema),
});

export type Bloco = z.infer<typeof blocoSchema>;
export type Etapa = z.infer<typeof etapaSchema>;
export type Pitch = z.infer<typeof pitchSchema>;
export type TipoBloco = Bloco["tipo"];

/** Módulo exigido por tipo de bloco — o gate de plano nasce junto com o bloco. */
export const MODULO_DO_BLOCO: Record<TipoBloco, string> = {
  texto: "block.text",
  botao: "block.button",
  quiz: "block.quiz",
  timer: "block.timer",
  checkout: "block.checkout",
};

/** Módulo exigido por provedor de checkout. */
export const MODULO_DO_PROVEDOR: Record<(typeof PROVEDORES)[number], string> = {
  eduzz: "checkout.eduzz",
  hotmart: "checkout.hotmart",
  kiwify: "checkout.kiwify",
  xgrow: "checkout.xgrow",
};

/** Todos os módulos que uma definição de pitch exige. */
export function modulosExigidos(pitch: Pitch): string[] {
  const exigidos = new Set<string>();
  for (const etapa of Object.values(pitch.etapas)) {
    for (const bloco of etapa.blocos) {
      exigidos.add(MODULO_DO_BLOCO[bloco.tipo]);
      if (bloco.tipo === "checkout") {
        exigidos.add(MODULO_DO_PROVEDOR[bloco.props.provedor]);
      }
    }
  }
  return [...exigidos];
}
