# Lyvis

Plataforma SaaS de lives e salas de vídeo com **pitch modular** — o apresentador libera texto, quiz, botão ou checkout logo abaixo do vídeo, sem a pessoa sair da transmissão.

- **Dono:** Gabriel Gadelha
- **Início:** 2026-09-17
- **Status:** especificação / pré-MVP
- **Domínio:** `lyvis.com.br` (registrado em 2026-09-17)
- **Spec completa:** `docs/SPEC.md`

## O que é

Dois modos na mesma estrutura de sala:

| Modo | Formato | Uso |
|---|---|---|
| `live` | 1 apresentador → N espectadores | Aula ao vivo, lançamento, webinário |
| `meeting` | grade de câmeras (estilo Zoom) | Mentoria, reunião de vendas |

Nos dois, o host libera o **pitch**: blocos que aparecem abaixo do vídeo (texto, quiz, botão, timer, checkout).

## Stack

| Camada | Escolha |
|---|---|
| Linguagem | TypeScript ponta a ponta |
| App | Next.js (App Router) |
| Interface | Tailwind + shadcn/ui |
| Validação | Zod (schema por bloco) |
| Construtor | dnd-kit |
| Fluxo do pitch | XState (reducer simples no MVP) |
| Estado | Zustand + TanStack Query |
| Vídeo | LiveKit (Cloud) — live e reunião no mesmo SDK |
| Banco + login | Supabase Postgres + Auth |
| Tempo real | Supabase Realtime (Broadcast) |
| Webhooks | Supabase Edge Functions |
| Cobrança | Stripe ou Asaas (a decidir) |
| Hospedagem | Vercel + LiveKit Cloud |
| Testes | Playwright |

**Por que não PHP:** vídeo, blocos do pitch, scripts de checkout e tempo real rodam no navegador, ou seja, em JavaScript. Com PHP o schema de cada bloco existiria duas vezes (TS e PHP). Decisão de 2026-09-17.

## Regras inquebráveis

1. **Módulo é verificado no servidor.** `can(accountId, featureKey)` roda antes de salvar pitch, abrir sala e entregar definição pro navegador. Esconder botão na interface não é controle de acesso.
2. **Número fictício de espectadores nunca é gravado.** É calculado na hora de desenhar a tela. Não entra em `viewer_sessions`, `room_retention_buckets`, `pitch_events` nem em exportação.
3. **Aviso de compra é sempre real**, vindo de webhook. Nada de nome inventado.
4. **Cliente informa só IDs de pixel**, nunca script solto. Script de terceiro na página é buraco de segurança.
5. **Purchase sai pela CAPI**, a partir do webhook, com `event_id` igual ao do navegador pra não duplicar.
6. **Lead é por conta, não por sala.** Normalizar e-mail (minúsculas) e telefone (E.164) antes de salvar.
7. **LGPD:** gravar data e texto do consentimento. O cliente é controlador, a Lyvis é operadora.
8. **Segredos** (token da CAPI, API secret do GA4) ficam criptografados e nunca vão pro navegador.
9. **Pitch é baixado na entrada da sala**, não no momento da liberação. Milhares de requisições no mesmo segundo derrubam o banco.
10. **Todo bloco novo declara `feature`** no registro — já nasce vendável por plano.

## Estrutura

```
/app
  /(room)/[roomId]       sala (vídeo + chat + pitch)
  /(host)/[roomId]       painel do host
  /(builder)/pitches     construtor de pitch
  /(app)                 painel do cliente (contas, salas, leads)
  /(admin)               painel da plataforma
/blocks                  registro + um diretório por bloco
/checkout-adapters       eduzz | hotmart | kiwify | xgrow
/lib/pitch-engine        fluxo entre etapas
/supabase
  /migrations
  /functions/webhooks-*
```

## Checkout por plataforma

| Plataforma | Como | Observação |
|---|---|---|
| Eduzz | inline (Checkout Elements) | Melhor experiência. Mínimo de 700px no desktop |
| Hotmart | pop-up (Widget) | No celular, manter vídeo em player flutuante |
| Kiwify | janela separada | Bloqueia iframe (`frame-ancestors`) |
| Xgrow | janela separada | Bloqueia iframe (`X-Frame-Options`) |

Os scripts foram feitos pra página estática: precisam ser carregados e iniciados no momento em que o host libera o bloco.
