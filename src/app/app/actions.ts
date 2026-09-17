"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentAccount } from "@/lib/accounts";
import { can, limitOf } from "@/lib/features";

export type EstadoSala = { erro?: string };

function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function criarSala(
  _estado: EstadoSala,
  formData: FormData,
): Promise<EstadoSala> {
  const conta = await currentAccount();
  if (!conta) return { erro: "Sessão expirada. Entre de novo." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const modo = String(formData.get("modo") ?? "live") as "live" | "meeting";
  if (!titulo) return { erro: "Dê um nome pra sala." };

  // REGRA 1: módulo verificado no servidor, nunca só na interface
  const modulo = modo === "meeting" ? "room.meeting" : "room.live";
  if (!(await can(conta.accountId, modulo))) {
    return {
      erro:
        modo === "meeting"
          ? "Sala de vídeo não está no seu plano."
          : "Live não está no seu plano.",
    };
  }

  const supabase = await createClient();

  // limite de salas por conta, quando existir
  const maxSalas = await limitOf(conta.accountId, "limit.rooms");
  if (maxSalas !== null) {
    const { count } = await supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("account_id", conta.accountId);
    if ((count ?? 0) >= maxSalas) {
      return { erro: `Seu plano permite ${maxSalas} salas.` };
    }
  }

  const slug = `${slugify(titulo) || "sala"}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("rooms").insert({
    account_id: conta.accountId,
    title: titulo,
    slug,
    mode: modo,
    status: "draft",
    settings: {
      gate: { when: "to_chat", fields: ["name", "email"], consent: { required: true } },
      display_viewers: { enabled: false },
    },
  });

  if (error) return { erro: error.message };

  revalidatePath("/app");
  return {};
}
