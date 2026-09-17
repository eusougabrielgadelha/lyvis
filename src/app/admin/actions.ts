"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/accounts";
import { ehAdminPlataforma } from "@/lib/platform";
import { criarConvite } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoAdmin = { erro?: string; link?: string; email?: string };

function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Cria a conta do cliente e já gera o convite do dono. */
export async function criarContaCliente(
  _estado: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  if (!(await ehAdminPlataforma())) return { erro: "Sem permissão." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plano = String(formData.get("plano") ?? "pro");
  if (!nome || !email) return { erro: "Nome da conta e e-mail do dono." };

  const db = createAdminClient();
  const user = await currentUser();

  const { data: conta, error } = await db
    .from("accounts")
    .insert({
      name: nome,
      slug: `${slugify(nome) || "conta"}-${Math.random().toString(36).slice(2, 6)}`,
      plan_id: plano,
      status: "trialing",
    })
    .select("id")
    .single();

  if (error || !conta) return { erro: error?.message ?? "Falha ao criar a conta." };

  const convite = await criarConvite({
    accountId: conta.id,
    email,
    role: "owner",
    convidadoPor: user?.id,
    ignorarLimite: true,
  });

  if (!convite.ok) return { erro: convite.erro };

  revalidatePath("/admin");
  return { link: convite.link, email: convite.email };
}

/** Libera ou revoga um módulo pra uma conta, com prazo opcional. */
export async function ajustarModulo(
  _estado: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  if (!(await ehAdminPlataforma())) return { erro: "Sem permissão." };

  const accountId = String(formData.get("account_id") ?? "");
  const featureKey = String(formData.get("feature_key") ?? "");
  const liberar = String(formData.get("acao")) === "liberar";
  const dias = Number(formData.get("dias") ?? 0);

  const db = createAdminClient();
  const { error } = await db.from("account_features").upsert(
    {
      account_id: accountId,
      feature_key: featureKey,
      enabled: liberar,
      expires_at: dias > 0 ? new Date(Date.now() + dias * 864e5).toISOString() : null,
      note: "ajuste manual pelo admin",
    },
    { onConflict: "account_id,feature_key" },
  );

  if (error) return { erro: error.message };
  revalidatePath("/admin");
  return {};
}
