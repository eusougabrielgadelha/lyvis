"use server";

import { currentAccount, currentUser } from "@/lib/accounts";
import { can } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { salaPorSlug } from "@/lib/rooms";
import { modulosExigidos, pitchSchema } from "@/blocks/schemas";

async function salaDoHost(slug: string) {
  const conta = await currentAccount();
  if (!conta) throw new Error("Não autenticado");
  const sala = await salaPorSlug(slug);
  if (!sala || sala.accountId !== conta.accountId) throw new Error("Sala não encontrada");
  return { conta, sala };
}

export type EstadoPitch = { erro?: string; ok?: boolean };

/**
 * Libera o pitch pra todo mundo na sala.
 *
 * Os módulos são conferidos AQUI, não só no construtor: um pitch salvo antes
 * de um downgrade não pode subir no ar com bloco que a conta perdeu.
 */
export async function liberarPitch(
  slug: string,
  pitchId: string,
): Promise<EstadoPitch> {
  const { conta, sala } = await salaDoHost(slug);
  const user = await currentUser();
  const db = createAdminClient();

  const { data: pitch } = await db
    .from("pitches")
    .select("id, room_id, version, definition")
    .eq("id", pitchId)
    .eq("room_id", sala.id)
    .maybeSingle();

  if (!pitch) return { erro: "Pitch não encontrado." };

  // sala fora do ar: o broadcast mostraria a oferta, mas quem recarregasse
  // não veria nada. Melhor recusar com motivo claro.
  if (sala.status !== "live") {
    return { erro: "Entre no ar antes de liberar o pitch." };
  }

  const definicao = pitchSchema.safeParse(pitch.definition);
  if (!definicao.success) return { erro: "A definição do pitch está inválida." };

  for (const modulo of modulosExigidos(definicao.data)) {
    if (!(await can(conta.accountId, modulo))) {
      return { erro: `Este pitch usa um módulo fora do seu plano (${modulo}).` };
    }
  }

  await db
    .from("pitch_activations")
    .update({ ended_at: new Date().toISOString() })
    .eq("room_id", sala.id)
    .is("ended_at", null);

  const { data: ativacao, error } = await db
    .from("pitch_activations")
    .insert({
      room_id: sala.id,
      pitch_id: pitch.id,
      version: pitch.version,
      activated_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !ativacao) return { erro: "Não consegui liberar o pitch." };

  await db.channel(`sala:${sala.id}:pitch`).send({
    type: "broadcast",
    event: "pitch",
    payload: {
      acao: "liberar",
      activationId: ativacao.id,
      pitchId: pitch.id,
      definicao: definicao.data,
    },
  });

  await db.from("events").insert({
    account_id: conta.accountId,
    room_id: sala.id,
    type: "pitch.activated",
    payload: { activation_id: ativacao.id, pitch_id: pitch.id },
  });

  return { ok: true };
}

export async function encerrarPitch(slug: string): Promise<EstadoPitch> {
  const { sala } = await salaDoHost(slug);
  const db = createAdminClient();

  await db
    .from("pitch_activations")
    .update({ ended_at: new Date().toISOString() })
    .eq("room_id", sala.id)
    .is("ended_at", null);

  await db.channel(`sala:${sala.id}`).send({
    type: "broadcast",
    event: "pitch",
    payload: { acao: "encerrar" },
  });

  return { ok: true };
}

/** Números do pitch no ar, pro painel do host. */
export async function metricasDoPitch(slug: string) {
  const { sala } = await salaDoHost(slug);
  const db = createAdminClient();

  const { data: ativa } = await db
    .from("pitch_activations")
    .select("id, activated_at")
    .eq("room_id", sala.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!ativa) return null;

  const contar = async (evento: string) => {
    const { count } = await db
      .from("pitch_events")
      .select("id", { count: "exact", head: true })
      .eq("activation_id", ativa.id)
      .eq("event", evento);
    return count ?? 0;
  };

  const [viu, respondeu, abriuCheckout] = await Promise.all([
    contar("viewed"),
    contar("answered"),
    contar("checkout_opened"),
  ]);

  return { activationId: ativa.id, viu, respondeu, abriuCheckout };
}
