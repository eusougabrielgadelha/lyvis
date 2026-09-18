import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentAccount } from "@/lib/accounts";
import { salaPorSlug } from "@/lib/rooms";
import { FormConfig } from "./form";

export default async function ConfigPage({
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
    <main className="mx-auto max-w-2xl px-4 py-10 text-neutral-100">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <p className="text-sm text-neutral-400">{sala.title}</p>
        </div>
        <Link href="/app" className="text-sm text-blue-400 underline underline-offset-4">
          Voltar
        </Link>
      </header>

      <FormConfig slug={slug} gate={sala.gate} banner={sala.bannerFinal} />
    </main>
  );
}
