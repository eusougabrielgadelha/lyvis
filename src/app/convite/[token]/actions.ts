"use server";

import { redirect } from "next/navigation";
import { aceitarConvite } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

export type EstadoConvite = { erro?: string };

export async function aceitar(
  _estado: EstadoConvite,
  formData: FormData,
): Promise<EstadoConvite> {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const r = await aceitarConvite(token, senha);
  if ("erro" in r && r.erro) return { erro: r.erro };

  // já entra logado
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: (r as { email: string }).email,
    password: senha,
  });
  if (error) return { erro: "Conta criada. Entre com seu e-mail e senha." };

  redirect("/app");
}
