import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta: IGNORA RLS.
 *
 * Usar só onde o servidor precisa agir por cima das policies:
 * - webhooks das plataformas de checkout
 * - espectador anônimo (entrar na sala, chat, heartbeat)
 * - leitura de room_secrets (tokens de CAPI e GA4)
 *
 * NUNCA importar em componente client. O `server-only` acima quebra o build
 * se alguém tentar.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY não configurada");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
