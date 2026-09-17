import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentAccount } from "@/lib/accounts";
import { featuresOf } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { salaPorSlug } from "@/lib/rooms";
import { pitchSchema } from "@/blocks/schemas";
import { resumo } from "@/lib/pitch-engine";
import { Builder } from "./builder";

export default async function PitchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const conta = await currentAccount();
  if (!conta) redirect("/login");

  const sala = await salaPorSlug(slug);
  if (!sala || sala.accountId !== conta.accountId) notFound();

  const db = createAdminClient();
  const { data: pitches } = await db
    .from("pitches")
    .select("id, name, definition, created_at")
    .eq("room_id", sala.id)
    .order("created_at", { ascending: false });

  const modulos = [...(await featuresOf(conta.accountId))];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-neutral-100">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pitches</h1>
          <p className="text-sm text-neutral-400">{sala.title}</p>
        </div>
        <Link href="/app" className="text-sm text-blue-400 underline underline-offset-4">
          Voltar
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Novo pitch</h2>
        <Builder slug={slug} modulos={modulos} />
      </section>

      <section className="space-y-2">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Salvos</h2>
        {!pitches?.length && (
          <p className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-500">
            Nenhum pitch ainda.
          </p>
        )}
        {pitches?.map((p) => {
          const d = pitchSchema.safeParse(p.definition);
          const r = d.success ? resumo(d.data) : null;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {r
                    ? `${r.etapas} etapa(s) · ${r.blocos} bloco(s)${r.temCheckout ? " · com checkout" : ""}`
                    : "definição inválida"}
                </p>
              </div>
              <span className="text-xs text-neutral-600">
                {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
