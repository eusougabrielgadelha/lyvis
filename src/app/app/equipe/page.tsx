import { redirect } from "next/navigation";
import Link from "next/link";
import { currentAccount } from "@/lib/accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitOf } from "@/lib/features";
import { contarAssentos, podeAdministrar } from "@/lib/invites";
import { ConvidarForm } from "./convidar-form";

const PAPEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  host: "Apresentador",
  moderator: "Moderador",
};

export default async function EquipePage() {
  const conta = await currentAccount();
  if (!conta) redirect("/login");

  const db = createAdminClient();
  const [{ data: membros }, { data: pendentes }, assentos, usados] =
    await Promise.all([
      db.from("account_members").select("user_id, role, created_at").eq("account_id", conta.accountId),
      db
        .from("invites")
        .select("id, email, role, expires_at")
        .eq("account_id", conta.accountId)
        .is("accepted_at", null),
      limitOf(conta.accountId, "limit.seats"),
      contarAssentos(conta.accountId),
    ]);

  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
  const emailDe = (id: string) =>
    usuarios?.users.find((u) => u.id === id)?.email ?? id.slice(0, 8);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-neutral-100">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-neutral-400">
            {usados} de {assentos ?? "∞"} assentos usados · {conta.accountName}
          </p>
        </div>
        <Link href="/app" className="text-sm text-blue-400 underline underline-offset-4">
          Voltar
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Convidar</h2>
        <ConvidarForm podeConvidar={podeAdministrar(conta.role)} />
      </section>

      <section className="space-y-2">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Pessoas</h2>
        {membros?.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm"
          >
            <span>{emailDe(m.user_id)}</span>
            <span className="text-xs text-neutral-500">{PAPEL[m.role] ?? m.role}</span>
          </div>
        ))}
        {pendentes?.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-dashed border-neutral-800 px-4 py-3 text-sm"
          >
            <span className="text-neutral-400">{c.email}</span>
            <span className="text-xs text-amber-500">
              convite pendente · {PAPEL[c.role] ?? c.role}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
