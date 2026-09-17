"use server";

import { revalidatePath } from "next/cache";
import { currentAccount, currentUser } from "@/lib/accounts";
import { criarConvite, podeAdministrar, type Papel } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoEquipe = { erro?: string; link?: string; email?: string };

export async function convidar(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const conta = await currentAccount();
  const user = await currentUser();
  if (!conta || !user) return { erro: "Sessão expirada." };

  // papel decide quem pode convidar — não é a interface que decide
  if (!podeAdministrar(conta.role)) {
    return { erro: "Só o dono ou um administrador pode convidar." };
  }

  const r = await criarConvite({
    accountId: conta.accountId,
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("papel") ?? "host") as Papel,
    convidadoPor: user.id,
  });

  if (!r.ok) return { erro: r.erro };

  revalidatePath("/app/equipe");
  return { link: r.link, email: r.email };
}

export async function remover(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const conta = await currentAccount();
  if (!conta) return { erro: "Sessão expirada." };
  if (!podeAdministrar(conta.role)) return { erro: "Sem permissão." };

  const db = createAdminClient();
  const conviteId = formData.get("convite_id");
  const userId = formData.get("user_id");

  if (conviteId) {
    await db.from("invites").delete().eq("id", String(conviteId)).eq("account_id", conta.accountId);
  } else if (userId) {
    if (String(userId) === conta.accountId) return { erro: "Não dá pra remover o dono." };
    await db
      .from("account_members")
      .delete()
      .eq("account_id", conta.accountId)
      .eq("user_id", String(userId))
      .neq("role", "owner");
  }

  revalidatePath("/app/equipe");
  return {};
}
