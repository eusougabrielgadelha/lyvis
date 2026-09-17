import { notFound } from "next/navigation";
import { lerConvite } from "@/lib/invites";
import { FormularioConvite } from "./formulario";

const PAPEL: Record<string, string> = {
  owner: "dono da conta",
  admin: "administrador",
  host: "apresentador",
  moderator: "moderador do chat",
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const convite = await lerConvite(token);
  if (!convite) notFound();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Lyvis</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Você foi convidado para <b>{convite.accountName}</b> como{" "}
          {PAPEL[convite.role] ?? convite.role}.
        </p>
        <p className="mt-1 text-sm text-neutral-500">{convite.email}</p>
        <FormularioConvite token={token} />
      </div>
    </main>
  );
}
