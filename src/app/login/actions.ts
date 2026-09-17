"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureAccount } from "@/lib/accounts";

export type EstadoLogin = { erro?: string; aviso?: string };

/**
 * Uma ação só pros dois modos. Com duas ações separadas, o useActionState
 * ficava preso na ação do primeiro render ao alternar entrar/criar.
 */
export async function autenticar(
  estado: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  // cadastro aberto foi desligado: a entrada é só por convite (/convite/[token])
  return entrar(estado, formData);
}

async function entrar(
  _estado: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) return { erro: "E-mail ou senha inválidos." };

  await ensureAccount(data.user.id, email.split("@")[0]);
  revalidatePath("/app");
  redirect("/app");
}


export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
