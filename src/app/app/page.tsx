import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentAccount } from "@/lib/accounts";
import { featuresOf } from "@/lib/features";
import { sair } from "@/app/login/actions";
import Link from "next/link";
import { NovaSala } from "./nova-sala";

export default async function AppPage() {
  const conta = await currentAccount();
  if (!conta) redirect("/login");

  const supabase = await createClient();
  const { data: salas } = await supabase
    .from("rooms")
    .select("id, title, slug, mode, status, created_at")
    .eq("account_id", conta.accountId)
    .order("created_at", { ascending: false });

  const modulos = await featuresOf(conta.accountId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-neutral-100">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{conta.accountName}</h1>
          <p className="text-sm text-neutral-400">
            Plano {conta.planId ?? "sem plano"} · {modulos.size} módulos
            liberados
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/app/equipe" className="text-sm text-blue-400 underline underline-offset-4">
            Equipe
          </Link>
          <form action={sair}>
          <button className="text-sm text-neutral-400 underline underline-offset-4">
            Sair
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Nova sala</h2>
        <NovaSala podeReuniao={modulos.has("room.meeting")} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">
          Suas salas
        </h2>
        {!salas?.length ? (
          <p className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-500">
            Nenhuma sala ainda. Crie a primeira acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {salas.map((sala) => (
              <li
                key={sala.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{sala.title}</p>
                  <p className="text-xs text-neutral-500">
                    {sala.mode === "live" ? "Live" : "Sala de vídeo"} ·{" "}
                    {sala.status} · /{sala.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Link
                    href={`/host/${sala.slug}`}
                    className="rounded-lg bg-neutral-800 px-3 py-1.5 font-medium text-neutral-100"
                  >
                    Apresentar
                  </Link>
                  <Link
                    href={`/s/${sala.slug}`}
                    className="text-blue-400 underline underline-offset-4"
                  >
                    Abrir sala
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
