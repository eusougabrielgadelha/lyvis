"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentAccount } from "@/lib/accounts";
import { can } from "@/lib/features";
import { criarTokenLiveKit, nomeSalaLiveKit } from "@/lib/livekit";
import { salaPorSlug } from "@/lib/rooms";

/** Garante que o usuário logado é membro da conta dona da sala. */
async function salaDoHost(slug: string) {
  const conta = await currentAccount();
  if (!conta) throw new Error("Não autenticado");

  const sala = await salaPorSlug(slug);
  if (!sala || sala.accountId !== conta.accountId) {
    throw new Error("Sala não encontrada");
  }
  return { conta, sala };
}

export async function tokenHost(slug: string) {
  const { conta, sala } = await salaDoHost(slug);

  // REGRA 1: módulo verificado no servidor antes de abrir a sala
  const modulo = sala.mode === "meeting" ? "room.meeting" : "room.live";
  if (!(await can(conta.accountId, modulo))) {
    throw new Error("Módulo fora do plano");
  }

  return {
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    token: await criarTokenLiveKit({
      sala: nomeSalaLiveKit(sala.id),
      identidade: `host_${conta.accountId}`,
      nome: conta.accountName,
      podePublicar: true,
    }),
  };
}

export async function mudarStatus(slug: string, status: "live" | "ended") {
  const { sala } = await salaDoHost(slug);
  const supabase = await createClient();

  await supabase
    .from("rooms")
    .update({
      status,
      ended_at: status === "ended" ? new Date().toISOString() : null,
    })
    .eq("id", sala.id);

  // NÃO revalidar /host aqui: o refresh remonta o LiveKitRoom e derruba a
  // transmissão no meio. O painel atualiza o status no próprio estado.
  revalidatePath(`/s/${slug}`);
  revalidatePath("/app");
  return { ok: true, status };
}
