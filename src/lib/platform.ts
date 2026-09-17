import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/accounts";

/** É admin da plataforma (equipe Lyvis)? Verificado sempre no servidor. */
export async function ehAdminPlataforma(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  const db = createAdminClient();
  const { data } = await db
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data);
}
