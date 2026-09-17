import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Controle de acesso a módulos — REGRA 1 do projeto.
 *
 * Roda SEMPRE no servidor, antes de salvar pitch, abrir sala ou entregar a
 * definição pro navegador. Esconder botão na interface não é controle de
 * acesso.
 *
 * Precedência: account_features (exceção por conta, com prazo) vence
 * plan_features (o que vem no plano).
 */

type FeatureRow = { enabled: boolean; limit_value: number | null };

async function resolve(
  accountId: string,
  featureKey: string,
): Promise<FeatureRow | null> {
  const db = createAdminClient();

  const { data: override } = await db
    .from("account_features")
    .select("enabled, limit_value, expires_at")
    .eq("account_id", accountId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (override) {
    const vigente =
      !override.expires_at || new Date(override.expires_at) > new Date();
    if (vigente) {
      return { enabled: override.enabled, limit_value: override.limit_value };
    }
  }

  const { data: account } = await db
    .from("accounts")
    .select("plan_id")
    .eq("id", accountId)
    .maybeSingle();

  if (!account?.plan_id) return null;

  const { data: planFeature } = await db
    .from("plan_features")
    .select("enabled, limit_value")
    .eq("plan_id", account.plan_id)
    .eq("feature_key", featureKey)
    .maybeSingle();

  return planFeature ?? null;
}

/** A conta tem o módulo liberado? */
export async function can(
  accountId: string,
  featureKey: string,
): Promise<boolean> {
  const row = await resolve(accountId, featureKey);
  return row?.enabled ?? false;
}

/** Limite numérico do módulo. `null` = ilimitado ou não definido. */
export async function limitOf(
  accountId: string,
  featureKey: string,
): Promise<number | null> {
  const row = await resolve(accountId, featureKey);
  return row?.limit_value ?? null;
}

/** Igual a `can`, mas explode. Usar no começo de Server Actions. */
export async function requireFeature(accountId: string, featureKey: string) {
  if (!(await can(accountId, featureKey))) {
    throw new Error(`FEATURE_BLOQUEADA:${featureKey}`);
  }
}

/** Todos os módulos liberados da conta — pra montar a interface de uma vez. */
export async function featuresOf(accountId: string): Promise<Set<string>> {
  const db = createAdminClient();

  const { data: account } = await db
    .from("accounts")
    .select("plan_id")
    .eq("id", accountId)
    .maybeSingle();

  const liberadas = new Set<string>();

  if (account?.plan_id) {
    const { data: doPlano } = await db
      .from("plan_features")
      .select("feature_key, enabled")
      .eq("plan_id", account.plan_id);
    doPlano?.forEach((f) => f.enabled && liberadas.add(f.feature_key));
  }

  const { data: excecoes } = await db
    .from("account_features")
    .select("feature_key, enabled, expires_at")
    .eq("account_id", accountId);

  excecoes?.forEach((f) => {
    const vigente = !f.expires_at || new Date(f.expires_at) > new Date();
    if (!vigente) return;
    if (f.enabled) liberadas.add(f.feature_key);
    else liberadas.delete(f.feature_key);
  });

  return liberadas;
}
