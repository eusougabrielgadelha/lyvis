import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { salaPorSlug } from "@/lib/rooms";
import { viewerIdAtual } from "@/lib/viewer";
import { Chat as _Chat, type Mensagem } from "./chat";
import { Inscricao } from "./inscricao";
import { SalaView } from "./sala-view";
import { pitchAtivo } from "./pitch-actions";

export default async function SalaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sala = await salaPorSlug(slug);
  if (!sala) notFound();

  const db = createAdminClient();
  const anonId = await viewerIdAtual();

  // já se inscreveu nesta sala?
  let inscrito = false;
  if (anonId) {
    const { data } = await db
      .from("viewer_sessions")
      .select("lead_id")
      .eq("room_id", sala.id)
      .eq("anon_id", anonId)
      .not("lead_id", "is", null)
      .limit(1)
      .maybeSingle();
    inscrito = Boolean(data?.lead_id);
  }

  const precisaInscreverPraAssistir = sala.gate.when === "to_watch" && !inscrito;

  const ativo = await pitchAtivo(slug);

  const { data: mensagens } = await db
    .from("chat_messages")
    .select("id, display_name, body, created_at")
    .eq("room_id", sala.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 text-neutral-100">
      {precisaInscreverPraAssistir ? (
        <>
          <h1 className="mb-4 text-xl font-semibold">{sala.title}</h1>
          <div className="mx-auto max-w-md">
            <Inscricao slug={slug} gate={sala.gate} titulo={sala.title} />
          </div>
        </>
      ) : (
        <SalaView
          slug={slug}
          roomId={sala.id}
          titulo={sala.title}
          statusInicial={sala.status}
          bannerFinal={sala.bannerFinal}
          gate={sala.gate}
          inscrito={inscrito}
          viewerRef={anonId ?? undefined}
          mensagens={(mensagens ?? []) as Mensagem[]}
          pitchInicial={
            ativo
              ? { activationId: ativo.activationId, definicao: ativo.definicao }
              : null
          }
        />
      )}
    </main>
  );
}
