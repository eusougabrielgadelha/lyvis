import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { salaPorSlug } from "@/lib/rooms";
import { viewerIdAtual } from "@/lib/viewer";
import { Palco } from "./palco";
import { Chat, type Mensagem } from "./chat";
import { Inscricao } from "./inscricao";
import { AreaDoPitch } from "./pitch";
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
      <h1 className="mb-4 text-xl font-semibold">{sala.title}</h1>

      {precisaInscreverPraAssistir ? (
        <div className="mx-auto max-w-md">
          <Inscricao slug={slug} gate={sala.gate} titulo={sala.title} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Palco slug={slug} />
            <AreaDoPitch
              slug={slug}
              roomId={sala.id}
              viewerRef={anonId ?? undefined}
              inicial={
                ativo
                  ? { activationId: ativo.activationId, definicao: ativo.definicao }
                  : null
              }
            />
          </div>

          <div className="flex flex-col gap-3 md:h-[560px]">
            {!inscrito && sala.gate.when === "to_chat" && (
              <Inscricao slug={slug} gate={sala.gate} titulo="Quer falar?" />
            )}
            <div className="min-h-64 flex-1">
              <Chat
                slug={slug}
                roomId={sala.id}
                inicial={(mensagens ?? []) as Mensagem[]}
                podeFalar={inscrito || sala.gate.when === "never"}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
