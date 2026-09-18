import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type GateConfig = {
  when: "never" | "to_watch" | "to_chat";
  fields: ("name" | "email" | "phone")[];
  consent?: { required: boolean; text?: string };
};

/** Aparece no lugar do vídeo quando a transmissão encerra. */
export type BannerFinal = {
  enabled: boolean;
  imagem_url?: string;
  titulo?: string;
  texto?: string;
};

export type RoomSettings = {
  gate?: GateConfig;
  banner_final?: BannerFinal;
  /** live agendada entra no ar sozinha no horário, se o pré-voo passar */
  auto_iniciar?: boolean;
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
  bannerFinal: BannerFinal;
  startsAt: string | null;
  autoIniciar: boolean;
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
    .select("id, account_id, slug, title, mode, status, starts_at, settings")
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
    bannerFinal: settings.banner_final ?? { enabled: false },
    startsAt: data.starts_at,
    autoIniciar: settings.auto_iniciar ?? true,
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
