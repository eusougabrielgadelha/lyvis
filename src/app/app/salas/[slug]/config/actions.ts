"use server";

import { revalidatePath } from "next/cache";
import { currentAccount } from "@/lib/accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { salaPorSlug, type RoomSettings } from "@/lib/rooms";

export type EstadoConfig = { erro?: string; ok?: boolean };

export async function salvarConfig(
  _estado: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  const conta = await currentAccount();
  if (!conta) return { erro: "Sessão expirada." };

  const slug = String(formData.get("slug") ?? "");
  const sala = await salaPorSlug(slug);
  if (!sala || sala.accountId !== conta.accountId) {
    return { erro: "Sala não encontrada." };
  }

  const imagem = String(formData.get("imagem_url") ?? "").trim();
  if (imagem && !/^https:\/\/\S+$/.test(imagem)) {
    return { erro: "A imagem precisa de um endereço https." };
  }

  const settings: RoomSettings = {
    ...sala.settings,
    gate: {
      when: String(formData.get("gate_quando") ?? "to_chat") as
        | "never"
        | "to_watch"
        | "to_chat",
      fields: formData.getAll("gate_campos").map(String) as (
        | "name"
        | "email"
        | "phone"
      )[],
      consent: { required: formData.get("gate_consentimento") === "on" },
    },
    banner_final: {
      enabled: formData.get("banner_ativo") === "on",
      imagem_url: imagem || undefined,
      titulo: String(formData.get("banner_titulo") ?? "").trim() || undefined,
      texto: String(formData.get("banner_texto") ?? "").trim() || undefined,
    },
  };

  const db = createAdminClient();
  const { error } = await db
    .from("rooms")
    .update({ settings })
    .eq("id", sala.id);

  if (error) return { erro: error.message };

  revalidatePath(`/app/salas/${slug}/config`);
  revalidatePath(`/s/${slug}`);
  return { ok: true };
}
