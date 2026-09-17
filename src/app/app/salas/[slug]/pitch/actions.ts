"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { currentAccount } from "@/lib/accounts";
import { can } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { salaPorSlug } from "@/lib/rooms";
import {
  modulosExigidos,
  pitchSchema,
  type Bloco,
  type Pitch,
} from "@/blocks/schemas";

export type EstadoBuilder = { erro?: string; ok?: boolean };

/**
 * Monta a definição a partir do formulário. Os modelos cobrem as combinações
 * que o CEO pediu: texto+quiz, texto+checkout, quiz→checkout, quiz e checkout.
 */
function montarDefinicao(f: FormData): Pitch {
  const modelo = String(f.get("modelo") ?? "texto_checkout");
  const titulo = String(f.get("titulo") ?? "").trim();
  const texto = String(f.get("texto") ?? "").trim();
  const pergunta = String(f.get("pergunta") ?? "").trim();
  const opcoes = String(f.get("opcoes") ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  const provedor = String(f.get("provedor") ?? "hotmart") as "hotmart";
  const referencia = String(f.get("referencia") ?? "").trim();
  const rotulo = String(f.get("rotulo") ?? "Comprar agora").trim();

  const blocoTexto: Bloco = {
    id: randomUUID(),
    tipo: "texto",
    props: { titulo: titulo || undefined, texto },
  };
  const blocoQuiz: Bloco = {
    id: randomUUID(),
    tipo: "quiz",
    props: { pergunta, opcoes },
  };
  const blocoCheckout: Bloco = {
    id: randomUUID(),
    tipo: "checkout",
    props: { provedor, referencia, rotulo },
  };

  switch (modelo) {
    case "texto_quiz":
      return { inicio: "s1", etapas: { s1: { blocos: [blocoTexto, blocoQuiz], proxima: [] } } };
    case "quiz":
      return { inicio: "s1", etapas: { s1: { blocos: [blocoQuiz], proxima: [] } } };
    case "checkout":
      return { inicio: "s1", etapas: { s1: { blocos: [blocoCheckout], proxima: [] } } };
    case "quiz_checkout":
      return {
        inicio: "s1",
        etapas: {
          s1: {
            blocos: [blocoTexto, blocoQuiz],
            proxima: [{ vaiPara: "s2" }],
          },
          s2: { blocos: [blocoCheckout], proxima: [] },
        },
      };
    default: // texto_checkout
      return {
        inicio: "s1",
        etapas: { s1: { blocos: [blocoTexto, blocoCheckout], proxima: [] } },
      };
  }
}

export async function salvarPitch(
  _estado: EstadoBuilder,
  formData: FormData,
): Promise<EstadoBuilder> {
  const conta = await currentAccount();
  if (!conta) return { erro: "Sessão expirada." };

  const slug = String(formData.get("slug") ?? "");
  const sala = await salaPorSlug(slug);
  if (!sala || sala.accountId !== conta.accountId) return { erro: "Sala não encontrada." };

  const nome = String(formData.get("nome") ?? "").trim() || "Pitch";
  const definicao = montarDefinicao(formData);

  const valido = pitchSchema.safeParse(definicao);
  if (!valido.success) {
    return { erro: "Preencha os campos do modelo escolhido." };
  }

  // gate de plano na hora de salvar (e de novo na hora de liberar)
  for (const modulo of modulosExigidos(valido.data)) {
    if (!(await can(conta.accountId, modulo))) {
      return { erro: `Bloco fora do seu plano: ${modulo}` };
    }
  }

  const db = createAdminClient();
  const { error } = await db.from("pitches").insert({
    room_id: sala.id,
    name: nome,
    definition: valido.data,
    version: 1,
  });

  if (error) return { erro: error.message };

  revalidatePath(`/app/salas/${slug}/pitch`);
  return { ok: true };
}

export async function apagarPitch(slug: string, pitchId: string) {
  const conta = await currentAccount();
  if (!conta) return { erro: "Sessão expirada." };
  const sala = await salaPorSlug(slug);
  if (!sala || sala.accountId !== conta.accountId) return { erro: "Sala não encontrada." };

  const db = createAdminClient();
  await db.from("pitches").delete().eq("id", pitchId).eq("room_id", sala.id);
  revalidatePath(`/app/salas/${slug}/pitch`);
  return { ok: true };
}
