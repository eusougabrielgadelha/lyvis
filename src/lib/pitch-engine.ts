import type { Pitch } from "@/blocks/schemas";

/**
 * Motor do pitch: dada a etapa atual e uma resposta, diz qual é a próxima.
 * Roda no navegador (a tela precisa mudar na hora) e as respostas vão pro
 * servidor em paralelo, pra análise.
 */

export function etapaInicial(pitch: Pitch) {
  return pitch.etapas[pitch.inicio] ? pitch.inicio : Object.keys(pitch.etapas)[0];
}

export function proximaEtapa(
  pitch: Pitch,
  etapaAtual: string,
  resposta?: { blocoId: string; valor: string },
): string | null {
  const etapa = pitch.etapas[etapaAtual];
  if (!etapa) return null;

  for (const regra of etapa.proxima ?? []) {
    if (!regra.quando) return pitch.etapas[regra.vaiPara] ? regra.vaiPara : null;
    if (
      resposta &&
      regra.quando.bloco === resposta.blocoId &&
      regra.quando.igual === resposta.valor
    ) {
      return pitch.etapas[regra.vaiPara] ? regra.vaiPara : null;
    }
  }
  return null;
}

/** Só pra mostrar no construtor: quantos caminhos o pitch tem. */
export function resumo(pitch: Pitch) {
  const etapas = Object.keys(pitch.etapas).length;
  const blocos = Object.values(pitch.etapas).reduce(
    (n, e) => n + e.blocos.length,
    0,
  );
  const temCheckout = Object.values(pitch.etapas).some((e) =>
    e.blocos.some((b) => b.tipo === "checkout"),
  );
  return { etapas, blocos, temCheckout };
}
