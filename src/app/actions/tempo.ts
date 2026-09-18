"use server";

/**
 * Hora do servidor. É a referência única da contagem regressiva — o relógio
 * do visitante pode estar errado e faria a live "começar" na hora errada
 * só pra ele.
 */
export async function horaDoServidor(): Promise<number> {
  return Date.now();
}
