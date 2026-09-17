// Promove um e-mail a admin da plataforma Lyvis.
// uso: node --env-file=.env.local scripts/promover-admin.mjs email@exemplo.com
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("informe o e-mail");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data } = await db.auth.admin.listUsers({ perPage: 200 });
const user = data?.users.find((u) => u.email?.toLowerCase() === email);

if (!user) {
  console.error(`usuário ${email} ainda não existe — aceite o convite primeiro`);
  process.exit(1);
}

const { error } = await db
  .from("platform_admins")
  .upsert({ user_id: user.id, note: email }, { onConflict: "user_id" });

console.log(error ? "ERRO: " + error.message : `${email} agora é admin da plataforma`);
