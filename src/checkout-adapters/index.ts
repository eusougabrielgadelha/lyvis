/**
 * Adaptadores de checkout.
 *
 * Os scripts das plataformas foram feitos pra página estática. Na sala o
 * bloco aparece e some no meio da transmissão, então todo adaptador tem
 * `rebind()` além de `mount()` e `unmount()` — ver spikes/checkout/RESULTADO.md.
 */

export type ModoCheckout = "inline" | "modal" | "window";

export type ContextoCheckout = {
  roomId: string;
  activationId?: string;
  viewerRef?: string;
  respostas?: Record<string, string>;
};

export type Adaptador = {
  modo: ModoCheckout;
  montar(el: HTMLElement, referencia: string, ctx: ContextoCheckout): Promise<void>;
  revincular(): void;
  desmontar(): void;
};

function carregarScript(src: string, id: string) {
  return new Promise<"novo" | "cache">((resolve, reject) => {
    if (document.getElementById(id)) return resolve("cache");
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.onload = () => resolve("novo");
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function carregarCss(href: string, id: string) {
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

/** Parâmetros que ligam a venda à live, ao pitch e às respostas do quiz. */
export function paramsDeOrigem(ctx: ContextoCheckout) {
  const p = new URLSearchParams();
  p.set("src", `lyvis_${ctx.roomId}`);
  if (ctx.activationId) p.set("sck", ctx.activationId);
  if (ctx.viewerRef) p.set("xcod", ctx.viewerRef);
  return p;
}

/**
 * Hotmart — pop-up pelo widget.
 * O widget roda jQuery('.hotmart-fb').fancybox() uma vez só, no load. Bloco
 * montado depois fica com botão morto; daí o revincular().
 */
export function adaptadorHotmart(): Adaptador {
  return {
    modo: "modal",
    async montar(el, referencia, ctx) {
      carregarCss("https://static.hotmart.com/css/hotmart-fb.min.css", "hotmart-css");
      const url = new URL(`https://pay.hotmart.com/${referencia}`);
      url.searchParams.set("checkoutMode", "2");
      paramsDeOrigem(ctx).forEach((v, k) => url.searchParams.set(k, v));

      const a = document.createElement("a");
      a.className = "hotmart-fb hotmart__button-checkout";
      a.href = url.toString();
      a.onclick = () => false;
      a.textContent = el.dataset.rotulo || "Comprar agora";
      a.style.cssText =
        "display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer";
      el.replaceChildren(a);

      await carregarScript(
        "https://static.hotmart.com/checkout/widget.min.js",
        "hotmart-widget",
      );
      this.revincular();
    },
    revincular() {
      const w = window as unknown as { loadFancyBoxCheckout?: () => void; jQuery?: unknown };
      let tentativas = 0;
      const tentar = () => {
        if (typeof w.loadFancyBoxCheckout === "function" && w.jQuery) {
          w.loadFancyBoxCheckout();
          return;
        }
        if (tentativas++ > 40) return;
        setTimeout(tentar, 100);
      };
      tentar();
    },
    desmontar() {},
  };
}

/** Eduzz — Checkout Elements, embutido na própria página. */
export function adaptadorEduzz(): Adaptador {
  let alvo: HTMLElement | null = null;
  let referenciaAtual = "";

  return {
    modo: "inline",
    async montar(el, referencia, ctx) {
      alvo = el;
      referenciaAtual = referencia;
      el.replaceChildren();

      const div = document.createElement("div");
      div.id = `eduzz-checkout-${referencia}`;
      div.dataset.origem = paramsDeOrigem(ctx).toString();
      el.appendChild(div);

      // o Checkout Elements procura o container no momento em que carrega
      await carregarScript(
        `https://cdn.eduzzcdn.com/sun/bridge/bridge.js`,
        "eduzz-bridge",
      );
      this.revincular();
    },
    revincular() {
      const w = window as unknown as {
        EduzzCheckout?: { mount?: (id: string) => void };
      };
      if (alvo && w.EduzzCheckout?.mount) {
        w.EduzzCheckout.mount(`eduzz-checkout-${referenciaAtual}`);
      }
    },
    desmontar() {
      alvo?.replaceChildren();
      alvo = null;
    },
  };
}

/**
 * Kiwify e Xgrow — bloqueiam iframe (frame-ancestors / X-Frame-Options).
 * Abre em janela separada e a live continua num player flutuante.
 */
export function adaptadorJanela(provedor: "kiwify" | "xgrow"): Adaptador {
  return {
    modo: "window",
    async montar(el, referencia, ctx) {
      const url = new URL(
        referencia.startsWith("http") ? referencia : `https://${referencia}`,
      );
      paramsDeOrigem(ctx).forEach((v, k) => url.searchParams.set(k, v));

      const botao = document.createElement("button");
      botao.textContent = el.dataset.rotulo || "Comprar agora";
      botao.style.cssText =
        "background:#16a34a;color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer;border:0";
      botao.onclick = async () => {
        // mantém a live visível enquanto a pessoa compra
        const video = document.querySelector("video");
        if (video && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
          try {
            await video.requestPictureInPicture();
          } catch {
            // navegador pode recusar; a compra continua
          }
        }
        window.open(url.toString(), `checkout_${provedor}`, "noopener,width=520,height=760");
      };

      el.replaceChildren(botao);
    },
    revincular() {},
    desmontar() {},
  };
}

export function adaptadorPara(provedor: string): Adaptador {
  switch (provedor) {
    case "hotmart":
      return adaptadorHotmart();
    case "eduzz":
      return adaptadorEduzz();
    case "kiwify":
      return adaptadorJanela("kiwify");
    case "xgrow":
      return adaptadorJanela("xgrow");
    default:
      throw new Error(`provedor de checkout desconhecido: ${provedor}`);
  }
}
