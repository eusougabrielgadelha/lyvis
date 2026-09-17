# Spike 1 — Checkout dentro do React

> Executado em 2026-09-17 · Produto de teste: Hotmart `K69209007X` (GTBOX — O Kit do Gestor de Tráfego)
> Como rodar: `cd spikes/checkout && python3 -m http.server 4567` e abrir `http://localhost:4567`

## Veredito: ✅ funciona, com uma correção obrigatória

| Pergunta do spike | Resultado |
|---|---|
| O script monta quando o bloco aparece **depois** do carregamento da página? | ✅ Sim |
| O pop-up abre com o checkout real? | ✅ Sim — produto, preço e formulário corretos |
| Sobrevive a desmontar e remontar o bloco? | ⚠️ **Não, sem correção.** Com a correção, sim |
| O vídeo continua tocando com o checkout aberto? | ✅ Sim — tempo do vídeo avançou de 9s para 17s com o pop-up aberto |
| O checkout aceita ser aberto em iframe? | ✅ `pay.hotmart.com` não manda `X-Frame-Options` nem `frame-ancestors` |

## O problema encontrado

O `widget.min.js` da Hotmart faz a ligação **uma única vez**, no momento em que carrega:

```js
function loadFancyBoxCheckout() {
  if (!detectmob()) {
    jQuery('.hotmart-fb').fancybox({ ... })
  } else {
    jQuery('.hotmart-fb').attr("onclick", "return true")
  }
}
```

`jQuery('.hotmart-fb')` pega só as âncoras que existem **naquele instante**. Numa página estática isso basta. Numa sala ao vivo, o bloco de checkout aparece quando o host libera o pitch — muito depois — e some quando o pitch é encerrado.

**Comportamento medido:** na primeira montagem funciona, porque o script é carregado junto com o bloco. Depois de desmontar e remontar, a âncora existe no DOM mas **o clique não abre nada** — o script está em cache e não refaz a ligação.

## A correção

Chamar `loadFancyBoxCheckout()` a cada montagem do bloco:

```js
function rebindHotmart(tries = 0) {
  if (typeof window.loadFancyBoxCheckout === 'function' && window.jQuery) {
    window.loadFancyBoxCheckout();
    return;
  }
  if (tries > 40) return;                        // ~4s de espera
  setTimeout(() => rebindHotmart(tries + 1), 100);
}

React.useEffect(() => {
  loadHotmartOnce().then(() => rebindHotmart());
}, [product]);
```

Validado: com a correção, o pop-up abre na primeira vez **e** depois de desmontar/remontar.

## Consequências pro produto

1. **O adaptador de checkout precisa de um passo `rebind`**, além de `mount` e `unmount`. Vale assumir que todo script de checkout de terceiro tem esse comportamento até prova em contrário — o mesmo teste tem que ser feito com a Eduzz.

```ts
interface CheckoutAdapter {
  mode: "inline" | "modal" | "window";
  mount(el, props, ctx): Promise<void>;
  rebind(): void;      // ← necessário por causa do widget da Hotmart
  unmount(): void;
}
```

2. **Celular vai por outro caminho.** O widget chama `detectmob()` e, no celular, troca o pop-up por navegação normal (`onclick = "return true"`), ou seja, sai da página. No celular a Hotmart precisa do mesmo tratamento de Kiwify e Xgrow: janela separada + player flutuante.

3. **jQuery e fancybox entram na página.** O widget carrega os dois por conta própria (3 scripts no total). Isso pode conflitar com o app. Avaliar carregar o bloco de checkout dentro de um iframe isolado do mesmo domínio.

4. **O pop-up não bloqueia o vídeo.** Confirmado: o vídeo seguiu rodando com o checkout aberto por cima. No desktop não é preciso player flutuante.

## Ainda por testar

- [ ] Eduzz (Checkout Elements, inline) — falta produto de teste
- [ ] Comportamento em celular real (Safari iOS e Chrome Android)
- [ ] Dois blocos de checkout na mesma sala em sequência
- [ ] Kiwify e Xgrow no modo janela + player flutuante
