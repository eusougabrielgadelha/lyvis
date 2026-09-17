import "server-only";
import { AccessToken } from "livekit-server-sdk";

/**
 * Token do LiveKit. Gerado SEMPRE no servidor — quem publica vídeo e quem
 * só assiste é decidido aqui, nunca pelo navegador.
 */
export async function criarTokenLiveKit(opcoes: {
  sala: string;
  identidade: string;
  nome: string;
  podePublicar: boolean;
}) {
  const { sala, identidade, nome, podePublicar } = opcoes;

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: identidade, name: nome, ttl: "4h" },
  );

  token.addGrant({
    room: sala,
    roomJoin: true,
    canPublish: podePublicar,
    canPublishData: podePublicar,
    canSubscribe: true,
  });

  return token.toJwt();
}

/** Nome da sala no LiveKit a partir do id no banco. */
export function nomeSalaLiveKit(roomId: string) {
  return `lyvis_${roomId}`;
}
