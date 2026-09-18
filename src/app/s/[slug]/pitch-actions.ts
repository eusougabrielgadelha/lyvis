"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { viewerIdAtual } from "@/lib/viewer";
import { salaPorSlug } from "@/lib/rooms";
import { pitchSchema } from "@/blocks/schemas";
import { permitePitch } from "@/lib/room-lifecycle";

/** Pitch que já está no ar — pra quem entra depois da liberação. */
export async function pitchAtivo(slug: string) {
  const sala = await salaPorSlug(slug);
  if (!sala) return null;

  // Vale durante a live e DEPOIS dela (oferta pós-live). Rascunho e
  // agendada nunca mostram — é o que evita a oferta da live passada
  // aparecer antes da próxima começar.
  if (!permitePitch(sala.status)) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("pitch_activations")
    .select("id, pitch_id, pitches(definition)")
    .eq("room_id", sala.id)
    .is("ended_at", null)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const pitch = data.pitches as unknown as { definition: unknown } | null;
  const definicao = pitchSchema.safeParse(pitch?.definition);
  if (!definicao.success) return null;

  return {
    activationId: data.id,
    pitchId: data.pitch_id,
    definicao: definicao.data,
  };
}

/** Registra o que a pessoa fez no pitch. Alimenta o funil. */
export async function registrarEvento(entrada: {
  slug: string;
  activationId: string;
  blocoId?: string;
  etapaId?: string;
  evento: "viewed" | "answered" | "clicked" | "checkout_opened";
  resposta?: string;
}) {
  const sala = await salaPorSlug(entrada.slug);
  if (!sala) return { erro: "Sala não encontrada." };

  const anonId = await viewerIdAtual();
  if (!anonId) return { erro: "Sem identificação." };

  const db = createAdminClient();

  await db.from("pitch_events").insert({
    activation_id: entrada.activationId,
    viewer_ref: anonId,
    step_id: entrada.etapaId ?? null,
    block_id: entrada.blocoId ?? null,
    event: entrada.evento,
    payload: entrada.resposta ? { resposta: entrada.resposta } : {},
  });

  if (entrada.evento === "answered" && entrada.blocoId && entrada.resposta) {
    const { data: sessao } = await db
      .from("viewer_sessions")
      .select("lead_id")
      .eq("room_id", sala.id)
      .eq("anon_id", anonId)
      .not("lead_id", "is", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await db.from("quiz_responses").insert({
      activation_id: entrada.activationId,
      viewer_ref: anonId,
      lead_id: sessao?.lead_id ?? null,
      block_id: entrada.blocoId,
      answer: entrada.resposta,
    });
  }

  return { ok: true };
}

/** Identificação do espectador, pra ligar a venda do webhook a esta pessoa. */
export async function meuViewerRef() {
  return (await viewerIdAtual()) ?? undefined;
}
