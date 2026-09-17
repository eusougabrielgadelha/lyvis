// Cria conta de cliente + convite de dono, direto pelo terminal.
// uso: node --env-file=.env.local scripts/convidar.mjs "Nome do Cliente" email@cliente.com [plano]
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

const [nome, email, plano = "pro"] = process.argv.slice(2);
if (!nome || !email) {
  console.error('uso: node scripts/convidar.mjs "Nome" email@cliente.com [plano]');
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const slug =
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);

const { data: conta, error } = await db
  .from("accounts")
  .insert({ name: nome, slug, plan_id: plano, status: "trialing" })
  .select("id")
  .single();

if (error) {
  console.error("ERRO ao criar conta:", error.message);
  process.exit(1);
}

const token = randomBytes(24).toString("base64url");
const { error: e2 } = await db.from("invites").insert({
  account_id: conta.id,
  email: email.toLowerCase(),
  role: "owner",
  token_hash: createHash("sha256").update(token).digest("hex"),
});

if (e2) {
  console.error("ERRO ao criar convite:", e2.message);
  process.exit(1);
}

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
console.log(`conta "${nome}" criada no plano ${plano}`);
console.log(`convite pra ${email}:`);
console.log(`${base}/convite/${token}`);
