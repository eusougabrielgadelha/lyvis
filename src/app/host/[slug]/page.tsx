import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentAccount } from "@/lib/accounts";
import { salaPorSlug } from "@/lib/rooms";
import { HostClient } from "./host-client";

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-neutral-100">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{sala.title}</h1>
          <p className="text-sm text-neutral-400">
            Painel do apresentador · {sala.status}
          </p>
        </div>
        <Link
          href={`/s/${sala.slug}`}
          target="_blank"
          className="text-sm text-blue-400 underline underline-offset-4"
        >
          Ver como espectador
        </Link>
      </header>

      <HostClient slug={slug} status={sala.status} />
    </main>
  );
}
