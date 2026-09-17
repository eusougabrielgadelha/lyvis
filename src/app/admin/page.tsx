import { notFound } from "next/navigation";
import { ehAdminPlataforma } from "@/lib/platform";
import { createAdminClient } from "@/lib/supabase/admin";
import { NovaConta } from "./nova-conta";

export default async function AdminPage() {
  // não é redirect: quem não é admin nem descobre que a página existe
  if (!(await ehAdminPlataforma())) notFound();

  const db = createAdminClient();
  const { data: contas } = await db
    .from("accounts")
    .select("id, name, slug, plan_id, status, created_at")
    .order("created_at", { ascending: false });

  const { data: membros } = await db.from("account_members").select("account_id");
  const { data: salas } = await db.from("rooms").select("account_id");
  const { data: excecoes } = await db
    .from("account_features")
    .select("account_id, feature_key, enabled, expires_at");

  const contar = (lista: { account_id: string }[] | null, id: string) =>
    lista?.filter((x) => x.account_id === id).length ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-neutral-100">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Plataforma</h1>
        <p className="text-sm text-neutral-400">
          {contas?.length ?? 0} contas · painel interno da Lyvis
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">
          Nova conta de cliente
        </h2>
        <NovaConta />
      </section>

      <section className="space-y-2">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Contas</h2>
        {contas?.map((c) => {
          const ajustes = excecoes?.filter((e) => e.account_id === c.id) ?? [];
          return (
            <div
              key={c.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-neutral-500">
                    plano {c.plan_id} · {c.status} · {contar(membros, c.id)} pessoas ·{" "}
                    {contar(salas, c.id)} salas
                  </p>
                </div>
                <span className="text-xs text-neutral-600">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {ajustes.length > 0 && (
                <p className="mt-2 text-xs text-amber-500">
                  {ajustes.length} ajuste(s) manual(is) de módulo
                </p>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
