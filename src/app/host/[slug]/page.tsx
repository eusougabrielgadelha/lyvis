import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentAccount } from "@/lib/accounts";
import { salaPorSlug } from "@/lib/rooms";
import { createAdminClient } from "@/lib/supabase/admin";
import { HostClient } from "./host-client";
import { PainelPitch } from "./painel-pitch";

export default async function HostPage({
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
    .select("id, name")
    .eq("room_id", sala.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-neutral-100">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{sala.title}</h1>
          <p className="text-sm text-neutral-400">
            Painel do apresentador · {sala.status}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={`/app/salas/${sala.slug}/pitch`}
            className="text-blue-400 underline underline-offset-4"
          >
            Pitches
          </Link>
          <Link
            href={`/s/${sala.slug}`}
            target="_blank"
            className="text-blue-400 underline underline-offset-4"
          >
            Ver como espectador
          </Link>
        </div>
      </header>

      <HostClient
        slug={slug}
        status={sala.status}
        startsAt={sala.startsAt}
        autoIniciar={sala.autoIniciar}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Pitch</h2>
        <PainelPitch slug={slug} pitches={pitches ?? []} />
      </section>
    </main>
  );
}
