# Lyvis — Especificação

> Versão 0.1 · 2026-09-17 · consolidada a partir da sessão de concepção com o CEO.

## 1. Problema

Na hora do pitch de uma live, o apresentador manda o link no chat e a pessoa **sai da transmissão** pra comprar. Perde-se a energia do momento, o áudio, a prova social e boa parte da conversão.

A Lyvis mantém tudo na mesma tela: o pitch aparece **abaixo do vídeo** e o checkout acontece ali.

## 2. Pesquisa de mercado (2026-09-17)

| Categoria | Exemplos | Lacuna |
|---|---|---|
| Webinar de vendas (EUA) | WebinarJam (Active Offer), EasyWebinar (pagamento no webinar) | Inglês, dólar, Stripe/PayPal — não usam Hotmart/Kiwify/Eduzz |
| Webinar (Brasil) | Hotwebinar, ePlaces | Botão leva pra fora; sem modo sala |
| Live commerce (Brasil) | StreamShop, Mimo, Stream Store, Alive | Feitas pra e-commerce físico |
| Demio | — | Sem checkout no webinar |

**Posição da Lyvis:** live **e** sala estilo Zoom + pitch modular + checkout das plataformas brasileiras de infoproduto. Não foi encontrado concorrente com as três coisas.

## 3. Checkout das plataformas

Verificado nos cabeçalhos HTTP e na documentação oficial em 2026-09-17:

| Plataforma | Script oficial | Como aparece | Modo na Lyvis |
|---|---|---|---|
| **Eduzz** | ✅ Checkout Elements | Inline na página | `inline` |
| **Hotmart** | ✅ Widget de Checkout | Pop-up sobre a página | `modal` |
| **Kiwify** | ❌ | `frame-ancestors` só domínios próprios | `window` |
| **Xgrow** | ❌ | `X-Frame-Options: SAMEORIGIN` | `window` |

No modo `window`, a live continua num player flutuante (Picture-in-Picture) e o chat segue visível.

```ts
interface CheckoutAdapter {
  mode: "inline" | "modal" | "window";
  mount(el: HTMLElement, props: CheckoutProps, ctx: Ctx): Promise<void>;
  unmount(): void;
}
```

O adaptador leva sempre `room_id`, respostas do quiz e UTMs pro checkout — é o que liga a venda do webhook à live e ao pitch.

**Pendente:** perguntar a Kiwify e Xgrow se existe checkout incorporado pra parceiros; confirmar se a Eduzz valida o domínio da página de vendas (importante num SaaS com vários clientes).

## 4. Modelo do pitch

**Bloco** = peça (texto, quiz, checkout, botão, timer). **Etapa** = conjunto de blocos exibidos juntos. **Pitch** = sequência de etapas com regras de "próximo".

| Combinação | Representação |
|---|---|
| texto + quiz | 1 etapa `[text, quiz]` |
| texto + checkout | 1 etapa `[text, checkout]` |
| quiz → checkout | 2 etapas |
| quiz → checkout A ou B | 3 etapas, decidido pela resposta |

```json
{
  "id": "pitch_01",
  "start": "s1",
  "steps": {
    "s1": {
      "blocks": [
        { "type": "text", "props": { "html": "<h2>Descubra seu plano</h2>" } },
        { "type": "quiz", "id": "q1", "props": { "question": "Você já vende?", "options": ["sim", "nao"] } }
      ],
      "next": [
        { "when": { "block": "q1", "equals": "sim" }, "goto": "s_pro" },
        { "goto": "s_basic" }
      ]
    },
    "s_pro":   { "blocks": [{ "type": "checkout", "props": { "provider": "eduzz", "productId": "123" } }] },
    "s_basic": { "blocks": [{ "type": "checkout", "props": { "provider": "hotmart", "offer": "abc" } }] }
  }
}
```

Registro de blocos — cada bloco declara o módulo que exige:

```ts
export const blockRegistry = {
  text:     { feature: "block.text",     schema, View, Editor },
  quiz:     { feature: "block.quiz",     schema, View, Editor },
  checkout: { feature: "block.checkout", schema, View, Editor },
  button:   { feature: "block.button",   schema, View, Editor },
  timer:    { feature: "block.timer",    schema, View, Editor },
};
```

### Fluxo de liberação

```
1. Pessoa entra    → baixa a definição de todos os pitches da sala
2. Host libera     → grava pitch_activations + broadcast {pitch_id, version}
3. Navegadores     → abrem a etapa inicial na hora, sem consultar o servidor
4. Pessoa avança   → navegador decide a próxima etapa e grava pitch_events
5. Checkout monta  → adaptador recebe respostas + UTM + room_id
6. Venda aprovada  → webhook → orders → aviso no chat + CAPI
```

## 5. Hierarquia SaaS

```
PLATAFORMA (admin Lyvis)
   └── CONTA (cliente)  ── plano, limites, módulos
         ├── MEMBROS (assentos): owner | admin | host | moderator
         ├── SALAS (live | meeting) → pitches
         ├── LEADS (espectadores inscritos)
         └── INTEGRAÇÕES (webhook, Zapier, Make, ActiveCampaign)
```

Painéis: `/admin` (plataforma), `/app` (cliente), `/host/[sala]` (apresentador), `/[sala]` (espectador).

## 6. Módulos e planos

```
features         (key, name, type: module|limit)
plans            (id, name, price_brl, interval)
plan_features    (plan_id, feature_key, enabled, limit_value)
account_features (account_id, feature_key, enabled, limit_value, expires_at, note)
```

`account_features` é a exceção por conta — libera módulo em teste com prazo, sem criar plano novo.

Itens vendáveis previstos: `room.live`, `room.meeting`, `room.display_viewers`, `block.quiz`, `block.checkout`, `block.timer`, `checkout.eduzz`, `checkout.hotmart`, `tracking.meta`, `tracking.google`, `integration.webhook`, `analytics.retention`, `limit.seats`, `limit.viewers_per_room`, `limit.hours_per_month`.

> ⚠️ Verificação sempre no servidor: `can(accountId, key)` antes de salvar pitch, abrir sala e servir a definição.

## 7. Entrada na sala e captura de lead

```json
{
  "gate": {
    "when": "to_watch",            // to_watch | to_chat | never
    "fields": ["name", "email"],   // name sempre; email e/ou phone
    "consent": { "required": true, "text": "Aceito receber contato..." }
  }
}
```

Espectador recebe identificador assinado no navegador. Anônimo assiste; ao preencher o formulário vira **lead** da conta e o nome passa a identificá-lo no chat.

**Normalização:** e-mail em minúsculas, telefone em E.164. Sem isso a base duplica e o cruzamento com a base do cliente falha.

**Exportação CSV:** nome, e-mail, telefone, inscrito em, entrou, tempo assistido, % assistido, mensagens no chat, respondeu quiz, abriu checkout, comprou.

**LGPD:** consentimento datado, política de privacidade, exportação e exclusão por titular. Cliente = controlador; Lyvis = operadora.

## 8. Rastreamento (pixels)

| Momento | Meta | Google |
|---|---|---|
| Entrou | `ViewContent` | GA4 `join_room` |
| Lead | `Lead` | conversão Google Ads |
| Pitch visto | `ViewContent` custom | evento GA4 |
| Abriu checkout | `InitiateCheckout` | `begin_checkout` |
| Compra (webhook) | `Purchase` via **CAPI** | conversão offline |

- `event_id` compartilhado entre navegador e servidor evita contagem dupla.
- Domínio próprio por cliente (`live.cliente.com.br`) melhora atribuição (cookie de primeira parte).
- **Só IDs, nunca script solto.** GTM só depois, em iframe isolado.

## 9. Espectadores exibidos (número configurável)

```json
{
  "display_viewers": {
    "enabled": true,
    "mode": "replace",              // replace | add (soma ao real)
    "min": 180, "max": 640,
    "curve": "ramp_plateau_decay",
    "jitter": 0.04,
    "seed": "auto"
  }
}
```

Calculado a partir de `seed` + tempo decorrido, de forma que **todos veem o mesmo número**:

```ts
export function displayViewers(cfg: DisplayViewersConfig, elapsedS: number, durationS: number) {
  const t = clamp(elapsedS / durationS, 0, 1);
  const shape =
    t < 0.15 ? t / 0.15
    : t < 0.80 ? 1
    : 1 - ((t - 0.80) / 0.20) * 0.35;
  const base = cfg.min + (cfg.max - cfg.min) * shape;
  const noise = valueNoise(cfg.seed, Math.floor(elapsedS / 20)); // -1..1
  return Math.round(clamp(base * (1 + noise * cfg.jitter), cfg.min, cfg.max));
}
```

Atualizar a cada 15–25s, variando poucos por cento. No modo `add`, nunca fica abaixo do real.

**Nunca persistido.** Painel do host mostra os dois: "Ao vivo: 312 reais · 540 exibido". Configuração registrada em `audit_log`. Módulo próprio: `room.display_viewers`.

## 10. Analytics

Sinal do navegador a cada **30s** (em lote) → tabela bruta → agregação em blocos de 10s.

```
viewer_heartbeats      (bruto, expurgo após N dias)
room_retention_buckets (agregado, alimenta o gráfico)
pitch_events           (funil do pitch)
```

Relatórios: curva de audiência, pico, tempo médio, entradas e saídas, mensagens por minuto, funil por pitch (viu → respondeu → abriu checkout → comprou).

## 11. Integrações

Eventos canônicos definidos desde já (evita retrabalho):

```
lead.registered · viewer.joined · viewer.left · chat.message
pitch.activated · pitch.viewed · quiz.answered · checkout.opened · order.paid
```

Gravados em `events` e entregues por processo separado (permite reenvio).
Ordem: **webhook assinado** (cobre Make e Zapier) → API pública com chave → apps oficiais Zapier/Make → ActiveCampaign e RD Station.

## 12. Cobrança

Assinatura com assentos e limites não cabe em Hotmart/Kiwify. Opções: **Stripe** (cartão + Pix, API forte de assinatura) ou **Asaas/Iugu/Pagar.me** (boleto e Pix, mais brasileiras). Webhook da assinatura atualiza `accounts.plan_id`.

## 13. Roadmap

1. Base do SaaS: contas, membros, planos, módulos, `can()`
2. Sala + chat + gate de inscrição (lead + exportação CSV)
3. Construtor de pitch: texto, quiz, checkout, botão
4. Cobrança + painel admin
5. Analytics (retenção + funil)
6. Integrações (webhook → API → Zapier/Make)

## 14. Decisões registradas

| Data | Decisão | Razão |
|---|---|---|
| 2026-09-17 | Nome **Lyvis** | Palavra inventada = marca registrável no INPI (GoLive e LivePlay seriam descritivos). O nome anterior, Lyvo, caiu porque o domínio estava tomado em `.com.br`, `.com`, `.io`, `.app` e `.live` |
| 2026-09-17 | TypeScript, não PHP | Vídeo, blocos, checkout e tempo real rodam no navegador; PHP duplicaria o schema dos blocos |
| 2026-09-17 | LiveKit | Mesmo SDK cobre live e reunião, ~250ms de latência, aceita OBS via RTMP, grava replay |
| 2026-09-17 | Supabase | Já em uso na operação: Postgres, Auth, Realtime e Edge Functions num lugar só |
| 2026-09-17 | Módulos por plano desde o início | Cada bloco novo já nasce vendável; teste com cliente = 1 linha em `account_features` |

## 15. Pendências

- [x] Registrar `lyvis.com.br` (2026-09-17)
- [ ] Busca no INPI (classe 42) por marcas parecidas
- [ ] Conferir `@lyvis` no Instagram e YouTube
- [ ] Teste prático: página com vídeo + scripts Eduzz e Hotmart carregados na liberação do pitch
- [ ] Perguntar a Kiwify e Xgrow sobre checkout incorporado pra parceiros
- [ ] Confirmar limites de conexões simultâneas do Supabase Realtime no plano atual
- [ ] Estimar custo LiveKit (base: ~US$ 165 por live de 90min com 1.000 pessoas)
- [ ] Escolher Stripe ou Asaas
