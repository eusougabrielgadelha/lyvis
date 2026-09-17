import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Identidade do espectador.
 *
 * Quem entra na sala recebe um identificador assinado no navegador. Assinado
 * porque ele vira chave de tudo que o espectador faz (chat, heartbeat,
 * eventos de pitch) e não pode ser forjado pra se passar por outro.
 *
 * Formato do cookie: <anonId>.<assinatura>
 */

const COOKIE = "lyvis_viewer";

function assinar(valor: string) {
  const segredo = process.env.VIEWER_TOKEN_SECRET;
  if (!segredo) throw new Error("VIEWER_TOKEN_SECRET não configurada");
  return createHmac("sha256", segredo).update(valor).digest("base64url");
}

export function novoViewerId() {
  const id = randomBytes(16).toString("base64url");
  return `${id}.${assinar(id)}`;
}

/** Devolve o anonId se a assinatura confere, senão null. */
export function verificarViewerId(token: string | undefined): string | null {
  if (!token) return null;
  const [id, assinatura] = token.split(".");
  if (!id || !assinatura) return null;

  const esperada = Buffer.from(assinar(id));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length) return null;
  return timingSafeEqual(esperada, recebida) ? id : null;
}

export async function viewerIdAtual(): Promise<string | null> {
  const store = await cookies();
  return verificarViewerId(store.get(COOKIE)?.value);
}

/** Cria o cookie se ainda não existir e devolve o anonId. */
export async function garantirViewerId(): Promise<string> {
  const store = await cookies();
  const existente = verificarViewerId(store.get(COOKIE)?.value);
  if (existente) return existente;

  const token = novoViewerId();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return token.split(".")[0];
}
