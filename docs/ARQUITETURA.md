# Arquitetura da Lyvis

> Para quem chega agora: leia este arquivo antes de mexer em qualquer coisa.
> Ele explica **onde as coisas moram e por quê**. As decisões de produto estão
> em `docs/SPEC.md`; as regras que não se quebram, em `CLAUDE.md`.

## O problema que o código resolve

Na hora do pitch de uma live, o público sai da transmissão pra comprar e a
energia do momento morre. A Lyvis mantém tudo na mesma tela: a oferta aparece
**abaixo do vídeo** e o checkout acontece ali.

Isso define duas obsessões que explicam quase todas as decisões:

1. **Nada tira a pessoa da tela.** Nem pop-up, nem aba nova, enquanto existir
   alternativa. Ver `src/checkout-adapters/`.
2. **O estado da sala manda na mídia.** "Entrar no ar" não é um rótulo: é o
   que autoriza publicar e assistir. Ver `src/lib/room-lifecycle.ts`.

## Camadas

```
┌──────────────────────────────────────────────────────────────┐
│ src/app/                    rotas (Next.js App Router)        │
│   (s)/[slug]      espectador · (host)/[slug]   apresentador  │
│   app/            painel do cliente · admin/   plataforma    │
├──────────────────────────────────────────────────────────────┤
│ src/components/             peças reaproveitáveis de UI       │
│   contagem-regressiva · pre-voo                               │
├──────────────────────────────────────────────────────────────┤
│ src/blocks/                 blocos do pitch (schema + view)   │
│ src/checkout-adapters/      um adaptador por plataforma       │
├──────────────────────────────────────────────────────────────┤
│ src/lib/                    regra de negócio, sem React       │
│   room-lifecycle · pitch-engine · tempo · features · rooms    │
│   accounts · invites · viewer · livekit · platform            │
│   supabase/{client,server,admin}                              │
├──────────────────────────────────────────────────────────────┤
│ supabase/migrations/        schema versionado + rollback      │
└──────────────────────────────────────────────────────────────┘
```

**Regra de dependência:** `lib` não importa de `app` nem de `components`.
Quem tem regra pura (contagem, máquina de estados, motor do pitch) fica em
`lib` e pode ser testado sem navegador.

## Os três clientes do Supabase

Escolher o errado é como a maioria dos vazamentos acontece.

| Arquivo | Quem é | Respeita RLS? | Quando usar |
|---|---|---|---|
| `supabase/client.ts` | navegador | sim | componentes client |
| `supabase/server.ts` | sessão do usuário logado | sim | páginas e ações do painel |
| `supabase/admin.ts` | chave secreta | **não** | webhook, espectador anônimo, segredos |

`admin.ts` tem `import "server-only"`: importar num componente de navegador
quebra o build. É proposital.

## Ciclo de vida da sala

A máquina de estados vive em `src/lib/room-lifecycle.ts` e é a fonte única.
Nenhuma tela decide por conta própria o que pode ou não.

```
draft ──agendar──▶ scheduled ──entrar no ar──▶ live ──encerrar──▶ ended
  ▲                    │                         ▲                  │
  └────────────────────┴──────voltar ao ar───────┴──────────────────┘
```

| Estado | Host | Espectador |
|---|---|---|
| `draft` | prévia local | "ainda não começou" |
| `scheduled` | prévia + pré-voo + contagem | contagem regressiva |
| `live` | publicando | vídeo + pitch + chat |
| `ended` | pode voltar ao ar | banner final + pitch em destaque |

Funções que outras camadas consultam: `permiteTokenEspectador`,
`permitePublicar`, `permitePitch`, `estaAgendada`.

## Fronteiras de segurança

Toda regra é verificada **no servidor**. A interface só reflete.

| Fronteira | Onde | O que impede |
|---|---|---|
| Módulo do plano | `lib/features.ts` → `can()` | usar bloco que não pagou |
| Token de espectador | `app/s/[slug]/actions.ts` | assistir fora do ar |
| Token do host | `app/host/[slug]/actions.ts` | publicar sem ser da conta |
| Identidade do espectador | `lib/viewer.ts` (HMAC) | falar no chat como outra pessoa |
| Papel na conta | `lib/invites.ts` | moderador convidando gente |
| Admin da plataforma | `lib/platform.ts` | cliente abrindo `/admin` (responde 404) |

## Tempo real

Um canal por assunto — **nunca** os três no mesmo nome:

```
sala:{roomId}:room    status da sala (entrou no ar, encerrou)
sala:{roomId}:pitch   liberar e encerrar oferta
sala:{roomId}:chat    mensagens
```

Com os três no mesmo canal, o Supabase entrega o evento só pra um assinante.
Foi um bug real, custou uma sessão de depuração.

**O tempo real é o caminho rápido, não a verdade.** O espectador reconfere o
status a cada 20s, ao voltar pra aba, quando a internet volta e ao reassinar o
canal. Conexão cai em live — e a pessoa não pode ficar presa numa tela morta.

## Vídeo (LiveKit)

- O token decide quem publica: host recebe `canPublish`, espectador não.
- **Fora do ar nada é publicado.** A câmera do host é prévia local
  (`getUserMedia`), que não passa pelo LiveKit.
- O espectador tem **cão de guarda**: conectado e sem faixa de vídeo por 12
  segundos, refaz a conexão (até 3 vezes). Existe porque a primeira tentativa
  de WebRTC pode falhar, o LiveKit troca de região e as faixas caem na conexão
  morta — o espectador ficava "conectado" e sem imagem pra sempre.
- Sempre preferir faixa não mutada: publicação antiga mutada deixava a tela
  preta ao voltar ao ar.

## Pitch

- **Bloco** = peça. **Etapa** = blocos exibidos juntos. **Pitch** = sequência
  de etapas com regra de "próxima".
- Schema em `src/blocks/schemas.ts` (Zod) — o mesmo valida no editor, ao salvar
  e ao renderizar.
- Todo bloco declara o módulo que exige (`MODULO_DO_BLOCO`), então **bloco novo
  já nasce vendável por plano**.
- Motor em `src/lib/pitch-engine.ts`: puro, sem React.
- Progresso da pessoa fica em `sessionStorage` por ativação — a live pode
  encerrar no meio do checkout sem jogar ela de volta pro quiz.

## Checkout

Um adaptador por plataforma, todos com `montar`, `revincular` e `desmontar`.

| Provedor | Modo | Observação |
|---|---|---|
| Hotmart | `inline` | iframe próprio; o widget oficial abre pop-up e cobre o vídeo |
| Eduzz | `inline` | Checkout Elements |
| Kiwify | `window` | bloqueia iframe (`frame-ancestors`) |
| Xgrow | `window` | bloqueia iframe (`X-Frame-Options`) |

`revincular()` existe porque scripts de checkout foram feitos pra página
estática: ligam o clique uma vez só, e na sala o bloco aparece depois.

## Convenções

- **Português no domínio, inglês na infraestrutura.** Funções de negócio e
  variáveis em português (`liberarPitch`, `contagem`, `preVoo`); nomes de
  tabela, coluna e API em inglês (`pitch_activations`, `room_id`).
- **Comentário explica o porquê, não o quê.** Se um trecho existe por causa de
  um bug ou de um comportamento de terceiro, isso fica escrito ali.
- **Nada de `setState` síncrono dentro de efeito** — o lint barra. Prefira
  estado derivado ou `key` pra remontar.
- **Migration sempre com rollback** (`*_down.sql`).
- **Toda regra nova tem um lugar só.** Se dois arquivos precisam da mesma
  decisão, ela vira função em `lib`.

## Rodando

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # verificação de tipos + build
npx eslint src   # lint (barra setState em efeito, hooks etc.)
```

Variáveis em `.env.local` — modelo em `.env.example`. Scripts úteis:

```bash
node --env-file=.env.local scripts/convidar.mjs "Nome" email@cliente.com pro
node --env-file=.env.local scripts/promover-admin.mjs email@lyvis.com.br
```

## Onde mexer para...

| Tarefa | Arquivo |
|---|---|
| Criar bloco novo de pitch | `src/blocks/schemas.ts` + `src/blocks/views.tsx` |
| Suportar outra plataforma de checkout | `src/checkout-adapters/index.ts` |
| Mudar regra de quem vê o quê | `src/lib/room-lifecycle.ts` |
| Mudar plano, módulo ou limite | `supabase/migrations` (seed) + `src/lib/features.ts` |
| Mexer na contagem regressiva | `src/lib/tempo.ts` (regra) + `src/components/contagem-regressiva.tsx` (tela) |
| Mexer no pré-voo de câmera/microfone | `src/components/pre-voo.tsx` |
