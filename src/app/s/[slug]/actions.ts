"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { garantirViewerId, viewerIdAtual } from "@/lib/viewer";
import { criarTokenLiveKit, nomeSalaLiveKit } from "@/lib/livekit";
import {
  normalizarEmail,
  normalizarTelefone,
  salaPorSlug,
} from "@/lib/rooms";

export type EstadoInscricao = { erro?: string };

/**
 * Inscrição do espectador. Vira lead da CONTA (não da sala) e o nome passa a
 * identificar a pessoa no chat.
 */
export async function inscrever(
  _estado: EstadoInscricao,
  formData: FormData,
): Promise<EstadoInscricao> {
  const slug = String(formData.get("slug") ?? "");
  const sala = await salaPorSlug(slug);
  if (!sala) return { erro: "Sala não encontrada." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const consentiu = formData.get("consentimento") === "on";

  if (!nome) return { erro: "Diga seu nome." };

  const campos = sala.gate.fields;
  if (campos.includes("email") && !email) return { erro: "Informe seu e-mail." };
  if (campos.includes("phone") && !telefone)
    return { erro: "Informe seu telefone." };
  if (sala.gate.consent?.required && !consentiu)
    return { erro: "Marque o aceite pra continuar." };

  const db = createAdminClient();
  const anonId = await garantirViewerId();

  // lead é único por conta: se já existe com o mesmo e-mail ou telefone, atualiza
  const { data: existente } = await db
    .from("leads")
    .select("id")
    .eq("account_id", sala.accountId)
    .or(
      [
        email ? `email.eq.${email}` : null,
        telefone ? `phone.eq.${telefone}` : null,
      ]
        .filter(Boolean)
        .join(","),
    )
    .maybeSingle();

  let leadId = existente?.id as string | undefined;

  if (leadId) {
    await db
      .from("leads")
      .update({ name: nome, last_seen_at: new Date().toISOString() })
      .eq("id", leadId);
  } else {
    const { data: novo, error } = await db
      .from("leads")
      .insert({
        account_id: sala.accountId,
        name: nome,
        email,
        phone: telefone,
        consent_at: consentiu ? new Date().toISOString() : null,
        consent_text: consentiu ? (sala.gate.consent?.text ?? "Aceito receber contato") : null,
        source_room_id: sala.id,
      })
      .select("id")
      .single();

    if (error) return { erro: "Não consegui salvar sua inscrição." };
    leadId = novo.id;
  }

  await db
    .from("room_registrations")
    .upsert(
      { room_id: sala.id, lead_id: leadId },
      { onConflict: "room_id,lead_id" },
    );

  await db.from("viewer_sessions").insert({
    room_id: sala.id,
    lead_id: leadId,
    anon_id: anonId,
  });

  await db.from("events").insert({
    account_id: sala.accountId,
    room_id: sala.id,
    type: "lead.registered",
    payload: { lead_id: leadId, anon_id: anonId },
  });

  revalidatePath(`/s/${slug}`);
  return {};
}

/** Token do LiveKit pro espectador: só assiste, nunca publica. */
export async function tokenEspectador(slug: string) {
  const sala = await salaPorSlug(slug);
  if (!sala) throw new Error("Sala não encontrada");

  // sem isso, bastava forjar o cliente pra assistir antes de o host entrar
  // no ar (ou depois de encerrar). O token é a fronteira de verdade.
  if (sala.status !== "live") throw new Error("A transmissão não está no ar");

  const anonId = await garantirViewerId();
  const db = createAdminClient();

  const { data: sessao } = await db
    .from("viewer_sessions")
    .select("lead_id, leads(name)")
    .eq("room_id", sala.id)
    .eq("anon_id", anonId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lead = sessao?.leads as unknown as { name: string } | null;

  return {
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    token: await criarTokenLiveKit({
      sala: nomeSalaLiveKit(sala.id),
      identidade: anonId,
      nome: lead?.name ?? "Espectador",
      podePublicar: false,
    }),
  };
}

/**
 * Envia mensagem no chat. Passa pelo servidor pra gravar e pra garantir que
 * o nome exibido é o do lead — o navegador não escolhe quem ele é.
 */
export async function enviarMensagem(slug: string, texto: string) {
  const corpo = texto.trim().slice(0, 500);
  if (!corpo) return { erro: "Mensagem vazia." };

  const sala = await salaPorSlug(slug);
  if (!sala) return { erro: "Sala não encontrada." };

  const anonId = await viewerIdAtual();
  if (!anonId) return { erro: "Entre na sala primeiro." };

  const db = createAdminClient();
  const { data: sessao } = await db
    .from("viewer_sessions")
    .select("lead_id, leads(name)")
    .eq("room_id", sala.id)
    .eq("anon_id", anonId)
    .not("lead_id", "is", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lead = sessao?.leads as unknown as { name: string } | null;

  // gate "to_chat": sem inscrição, assiste mas não fala
  if (sala.gate.when !== "never" && !lead) {
    return { erro: "Faça sua inscrição pra falar no chat." };
  }

  const { data: msg, error } = await db
    .from("chat_messages")
    .insert({
      room_id: sala.id,
      lead_id: sessao?.lead_id ?? null,
      display_name: lead?.name ?? "Espectador",
      body: corpo,
    })
    .select("id, display_name, body, created_at")
    .single();

  if (error) return { erro: "Não consegui enviar." };

  await db.channel(`sala:${sala.id}`).send({
    type: "broadcast",
    event: "chat",
    payload: msg,
  });

  return { ok: true };
}
