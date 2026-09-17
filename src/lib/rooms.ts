import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type GateConfig = {
  when: "never" | "to_watch" | "to_chat";
  fields: ("name" | "email" | "phone")[];
  consent?: { required: boolean; text?: string };
};

export type RoomSettings = {
  gate?: GateConfig;
  display_viewers?: {
    enabled: boolean;
    mode?: "replace" | "add";
    min?: number;
    max?: number;
    jitter?: number;
  };
};

export type SalaPublica = {
  id: string;
  accountId: string;
  slug: string;
  title: string;
  mode: "live" | "meeting";
  status: "draft" | "scheduled" | "live" | "ended";
  gate: GateConfig;
  settings: RoomSettings;
};

const GATE_PADRAO: GateConfig = {
  when: "to_chat",
  fields: ["name", "email"],
  consent: { required: true },
};

/**
 * Dados da sala pro espectador. Usa a chave secreta porque o espectador é
 * anônimo (não passa por RLS) — por isso devolve só o que pode ser público.
 * Nada de settings.tracking nem de room_secrets aqui.
 */
export async function salaPorSlug(slug: string): Promise<SalaPublica | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("rooms")
    .select("id, account_id, slug, title, mode, status, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;

  const settings = (data.settings ?? {}) as RoomSettings;
  return {
    id: data.id,
    accountId: data.account_id,
    slug: data.slug,
    title: data.title,
    mode: data.mode,
    status: data.status,
    gate: settings.gate ?? GATE_PADRAO,
    settings,
  };
}

/** e-mail em minúsculas, telefone em E.164 (Brasil por padrão). */
export function normalizarEmail(email: string) {
  return email.trim().toLowerCase() || null;
}

export function normalizarTelefone(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  if (telefone.trim().startsWith("+")) return `+${digitos}`;
  if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`;
  if (digitos.length === 12 || digitos.length === 13) return `+${digitos}`;
  return `+${digitos}`;
}
