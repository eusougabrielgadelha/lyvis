import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitOf } from "@/lib/features";

export type Papel = "owner" | "admin" | "host" | "moderator";

/** O banco guarda só o hash: quem tem acesso ao banco não consegue usar o link. */
function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type ResultadoConvite =
  | { ok: true; link: string; email: string }
  | { ok: false; erro: string };

export async function criarConvite(opcoes: {
  accountId: string;
  email: string;
  role: Papel;
  convidadoPor?: string;
  ignorarLimite?: boolean; // admin da plataforma pode furar o limite
}): Promise<ResultadoConvite> {
  const email = opcoes.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, erro: "E-mail inválido." };
  }

  const db = createAdminClient();

  if (!opcoes.ignorarLimite) {
    const maxAssentos = await limitOf(opcoes.accountId, "limit.seats");
    if (maxAssentos !== null) {
      const { data: usados } = await db.rpc("assentos_usados", {
        p_account: opcoes.accountId,
      });
      // a função vive no schema private; se o RPC não estiver exposto, conta na mão
      const ocupados =
        typeof usados === "number" ? usados : await contarAssentos(opcoes.accountId);
      if (ocupados >= maxAssentos) {
        return {
          ok: false,
          erro: `Seu plano permite ${maxAssentos} pessoas. Remova alguém ou fale com a gente.`,
        };
      }
    }
  }

  const token = randomBytes(24).toString("base64url");

  const { error } = await db
    .from("invites")
    .upsert(
      {
        account_id: opcoes.accountId,
        email,
        role: opcoes.role,
        token_hash: hash(token),
        invited_by: opcoes.convidadoPor ?? null,
        expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
        accepted_at: null,
      },
      { onConflict: "token_hash" },
    );

  if (error) return { ok: false, erro: error.message };

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true, email, link: `${base}/convite/${token}` };
}

export async function contarAssentos(accountId: string) {
  const db = createAdminClient();
  const [{ count: membros }, { count: pendentes }] = await Promise.all([
    db
      .from("account_members")
      .select("user_id", { count: "exact", head: true })
      .eq("account_id", accountId),
    db
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  return (membros ?? 0) + (pendentes ?? 0);
}

export type ConviteValido = {
  id: string;
  accountId: string;
  accountName: string;
  email: string;
  role: Papel;
};

export async function lerConvite(token: string): Promise<ConviteValido | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("invites")
    .select("id, account_id, email, role, expires_at, accepted_at, accounts(name)")
    .eq("token_hash", hash(token))
    .maybeSingle();

  if (!data || data.accepted_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  const conta = data.accounts as unknown as { name: string };
  return {
    id: data.id,
    accountId: data.account_id,
    accountName: conta?.name ?? "Conta",
    email: data.email,
    role: data.role as Papel,
  };
}

/** Cria o usuário (ou reaproveita) e vincula à conta com o papel do convite. */
export async function aceitarConvite(token: string, senha: string) {
  const convite = await lerConvite(token);
  if (!convite) return { erro: "Convite inválido ou expirado." };
  if (senha.length < 8) return { erro: "A senha precisa de 8 caracteres ou mais." };

  const db = createAdminClient();

  const { data: lista } = await db.auth.admin.listUsers({ perPage: 200 });
  const existente = lista?.users.find(
    (u) => u.email?.toLowerCase() === convite.email,
  );

  let userId = existente?.id;

  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: convite.email,
      password: senha,
      email_confirm: true,
    });
    if (error || !data.user) return { erro: error?.message ?? "Falha ao criar usuário." };
    userId = data.user.id;
  } else {
    await db.auth.admin.updateUserById(userId, { password: senha });
  }

  await db
    .from("account_members")
    .upsert(
      { account_id: convite.accountId, user_id: userId, role: convite.role },
      { onConflict: "account_id,user_id" },
    );

  await db
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", convite.id);

  return { ok: true, email: convite.email };
}

/** Papéis que podem administrar a conta (criar sala, convidar, configurar). */
export function podeAdministrar(papel: Papel) {
  return papel === "owner" || papel === "admin";
}

/** Papéis que podem apresentar (publicar vídeo). */
export function podeApresentar(papel: Papel) {
  return papel === "owner" || papel === "admin" || papel === "host";
}
