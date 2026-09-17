import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Membership = {
  accountId: string;
  accountName: string;
  slug: string;
  planId: string | null;
  role: "owner" | "admin" | "host" | "moderator";
};

/** Usuário logado, ou null. */
export async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Conta do usuário logado. Por ora, a primeira (troca de conta vem depois). */
export async function currentAccount(): Promise<Membership | null> {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("account_members")
    .select("role, account_id, accounts(id, name, slug, plan_id)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data?.accounts) return null;
  const conta = data.accounts as unknown as {
    id: string;
    name: string;
    slug: string;
    plan_id: string | null;
  };

  return {
    accountId: conta.id,
    accountName: conta.name,
    slug: conta.slug,
    planId: conta.plan_id,
    role: data.role as Membership["role"],
  };
}

function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/**
 * Cria a conta do usuário no primeiro login e o coloca como dono.
 * Usa a chave secreta porque as policies exigem que o vínculo já exista.
 */
export async function ensureAccount(
  userId: string,
  nomeSugerido: string,
): Promise<Membership> {
  const db = createAdminClient();

  const { data: jaTem } = await db
    .from("account_members")
    .select("role, accounts(id, name, slug, plan_id)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (jaTem?.accounts) {
    const c = jaTem.accounts as unknown as {
      id: string;
      name: string;
      slug: string;
      plan_id: string | null;
    };
    return {
      accountId: c.id,
      accountName: c.name,
      slug: c.slug,
      planId: c.plan_id,
      role: jaTem.role as Membership["role"],
    };
  }

  const base = slugify(nomeSugerido) || "conta";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: conta, error } = await db
    .from("accounts")
    .insert({
      name: nomeSugerido,
      slug,
      plan_id: "pro", // beta: todo mundo entra no Pro
      status: "trialing",
    })
    .select("id, name, slug, plan_id")
    .single();

  if (error || !conta) throw new Error(error?.message ?? "falha ao criar conta");

  await db
    .from("account_members")
    .insert({ account_id: conta.id, user_id: userId, role: "owner" });

  return {
    accountId: conta.id,
    accountName: conta.name,
    slug: conta.slug,
    planId: conta.plan_id,
    role: "owner",
  };
}
