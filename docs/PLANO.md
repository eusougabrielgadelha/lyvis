# Lyvis — Plano de Ação (escopo completo)

> Criado em 2026-09-17 · Revisado em 2026-09-17 (escopo completo, nada cortado)
> Execução: Gabriel + Claude Code · Primeira live de cliente: **2026-10-17** · Produto completo: **2026-11-21**

## Premissas

| Definição | Valor |
|---|---|
| Quem constrói | Gabriel + Claude Code |
| Escopo | **Completo.** Nenhum módulo sai do plano |
| Primeira live de cliente | 2026-10-17 (beta com cliente da Sylo) |
| Produto completo no ar | 2026-11-21 |
| Custo mensal | ~US$ 100 (Supabase Pro 25 + LiveKit Ship 50 + Vercel 20) + consumo |

## A conta do esforço

Estimativa por módulo, em dias de trabalho focado, já contando a aceleração do Claude Code:

| Módulo | Dias |
|---|---|
| Fundações + spikes de risco | 2 |
| Base SaaS (contas, membros, planos, módulos, `can()`) | 3 |
| Sala ao vivo + chat + gate de inscrição + leads | 5 |
| Motor do pitch + construtor + 4 adaptadores de checkout | 7 |
| Pixels, CAPI, webhooks de venda, espectadores exibidos | 3 |
| Cobrança (Stripe ou Asaas, assentos, limites) | 4 |
| Painel admin (contas, módulos, entrar como cliente, auditoria) | 4 |
| Modo sala (grade, mão levantada, permissões) | 4 |
| Analytics (sinais, agregação, retenção, funil) | 5 |
| Integrações (outbox, webhook assinado, API, Zapier, Make, ActiveCampaign) | 6 |
| Carga, celular, reconexão, runbook, onboarding | 5 |
| **Total** | **~48 dias úteis** |

48 dias úteis são **9 a 10 semanas** em ritmo integral. Conciliando com a operação da Sylo, 12 semanas.

**Como isso vira 9 semanas:** a primeira live de cliente continua em **17/10**, rodando com o que estiver pronto (que já é o produto inteiro do ponto de vista dele: live, chat, lead, pitch, checkout e rastreio). O resto entra com o beta já rodando, alimentado por uso real.

> [!tip] Três alavancas pra comprimir o prazo
> 1. **Paralelizar com agentes.** Painel admin, integrações e analytics quase não se cruzam com o resto — dá pra rodar em workflow multi-agente enquanto você toca o núcleo. Se quiser, é só pedir.
> 2. **Contratar um dev** só pros módulos independentes (admin e integrações) a partir da Fase 3.
> 3. **Blocos diários maiores.** A conta acima pressupõe 2 a 3 horas por dia. Dobrar isso corta o calendário quase pela metade.

## Regra que protege o beta

> [!danger] A live de cliente é precedida por duas outras.
> Ordem obrigatória: live interna (só eu) → live com a minha audiência → live de cliente.
> Toda transmissão do beta tem plano B na tela (card com link alternativo acionado pelo host), combinado por escrito com o cliente antes.

---

## Fase 0 — Fundações e prova de risco (18–19/09)

**Marca e contas**
- [x] Registrar `lyvis.com.br` no Registro.br (2026-09-17)
- [ ] Busca no INPI, classe 42
- [ ] Garantir `@lyvis` no Instagram e YouTube
- [ ] Projeto no Supabase + migrations aplicadas + advisors conferidos
- [ ] Projeto no LiveKit Cloud (Ship) com as chaves
- [ ] Scaffold Next.js + deploy na Vercel

**Spike 1 — Checkout dentro do React** ⚠️ *maior risco do projeto*
- [ ] Vídeo em cima, área de pitch embaixo
- [ ] Script da Eduzz (Checkout Elements) carregado **no momento** em que o bloco aparece
- [ ] Widget da Hotmart pelo botão, sem recarregar a página
- [ ] Celular: o vídeo continua tocando?
- [ ] Montar, desmontar e montar de novo

**Spike 2 — LiveKit**
- [ ] Host pelo navegador + espectador + entrada via OBS (RTMP)
- [ ] Medir latência real
- [ ] Queda de internet e reconexão

> [!warning] Ponto de decisão (19/09)
> Se o Spike 1 falhar nas duas plataformas, janela separada + player flutuante vira o modo padrão. Isso muda a tela da sala e precisa ser decidido antes.

## Fase 1 — Base SaaS + sala ao vivo (22/09 – 03/10)

**Base multi-cliente**
- [x] Login (Supabase Auth) + criação de conta e convite de membros
- [x] Papéis: dono, admin, apresentador, moderador
- [x] Planos, módulos e limites; `can(accountId, key)` verificado no servidor
- [x] Exceção por conta (`account_features`) com prazo
- [x] Limite de assentos aplicado no convite

**Sala ao vivo**
- [x] Criar sala: título, modo, horário, configurações
- [x] Token do LiveKit no servidor, por papel
- [x] Página do espectador (celular primeiro) + painel do host
- [ ] Entrada por navegador e por OBS
- [x] Gate de inscrição configurável (assistir ou só falar no chat)
- [x] Identificador assinado do espectador
- [x] Chat em tempo real · ⚠️ moderação (apagar, banir, modo lento) ainda não
- [x] `viewer_sessions` com entrada · ⚠️ saída e tempo assistido ainda não
- [x] Leads normalizados (e-mail minúsculo, telefone E.164) · ⚠️ exportação CSV ainda não
- [x] Consentimento LGPD datado

**Marco 26/09:** live interna de 20 min com 10 convidados e CSV baixado.

> [!success] 2026-09-17 — vídeo validado de ponta a ponta
> Host publica, espectador recebe e a imagem aparece na tela. Contador do host acusa o espectador real. Falta CSV, moderação do chat e OBS.

## Fase 2 — Pitch completo e rastreio (06/10 – 17/10)

- [ ] Registro de blocos + schema Zod por bloco + `feature` por bloco
- [ ] Blocos: texto, botão, quiz, timer, checkout
- [ ] Construtor com arrastar e soltar (dnd-kit): etapas, ordem, ramificação
- [ ] Motor do fluxo (XState): etapas, condição por resposta, quem entra depois
- [ ] Liberação por broadcast, com definição já baixada na entrada
- [ ] Adaptadores: Eduzz (inline), Hotmart (pop-up), Kiwify e Xgrow (janela + player flutuante)
- [ ] Contexto no checkout: respostas + UTM + room_id
- [ ] `pitch_events` e `quiz_responses`
- [ ] Webhooks das 4 plataformas → `orders`
- [ ] Aviso real de compra no chat
- [ ] Pixel Meta + CAPI com `event_id` compartilhado; GA4 + Google Ads
- [ ] Espectadores exibidos (mín/máx, curva, mesmo número pra todos, nunca gravado)
- [ ] Painel do host: "reais × exibido"
- [ ] Carga: 300 espectadores simulados (k6) no chat e na liberação
- [ ] Celular real: Android e iPhone, Chrome e Safari, 4G
- [ ] Runbook de incidente + card de plano B

**Marco 03/10:** `quiz → checkout` com compra real de R$ 1 ligada ao pitch.
**Marco 10/10:** ensaio geral com mais de 100 pessoas da minha lista.
**Marco 17/10:** 🎯 **primeira live de cliente da Sylo**, com monitoramento ao vivo.

## Fase 3 — Cobrança, admin e modo sala (20/10 – 31/10)

**Cobrança**
- [ ] Escolher Stripe ou Asaas
- [ ] Assinatura por plano, com Pix e cartão
- [ ] Webhook atualizando `accounts.plan_id` e status
- [ ] Limites aplicados (assentos, espectadores por sala, horas por mês)
- [ ] Tela de plano, upgrade e faturas pro cliente

**Painel admin**
- [ ] Lista de contas com consumo contra os limites
- [ ] Liberar e revogar módulo por conta, com prazo
- [ ] Entrar como cliente pra dar suporte, com registro em auditoria
- [ ] Faturamento, inadimplência e situação das integrações
- [ ] Registro de auditoria consultável

**Modo sala**
- [ ] Grade de câmeras, com destaque no host
- [ ] Mão levantada, silenciar, remover, permissão de fala
- [ ] Host libera o pitch pra todos da sala
- [ ] Limite de participantes por plano

## Fase 4 — Analytics e integrações (03/11 – 14/11)

**Analytics**
- [ ] Sinais em lote a cada 30s
- [ ] Agregação em blocos de 10s (pg_cron) + expurgo do bruto
- [ ] Curva de retenção, pico, tempo médio, entradas e saídas
- [ ] Mensagens por minuto
- [ ] Funil por pitch: viu → respondeu → abriu checkout → comprou
- [ ] Relatório por sala, exportável

**Integrações**
- [ ] Eventos canônicos gravados em `events`
- [ ] Entrega com reenvio (`event_deliveries`)
- [ ] Webhook assinado por HMAC (cobre Make e Zapier na marra)
- [ ] API pública com chave + documentação
- [ ] App oficial de Zapier e de Make
- [ ] ActiveCampaign e RD Station
- [ ] Tela de integrações no painel do cliente

## Fase 5 — Endurecimento e lançamento (17/11 – 21/11)

- [ ] Carga de 1.000 espectadores simultâneos
- [ ] Revisão de segurança (RLS, segredos, tokens de espectador)
- [ ] Onboarding automático (cliente cria conta e sala sozinho)
- [ ] Domínio próprio por cliente (CNAME)
- [ ] Central de ajuda e vídeos curtos
- [ ] Landing de vendas + página de planos
- [ ] Lançamento público

---

## Marcos

| Data | Marco |
|---|---|
| 19/09 | Spikes concluídos, decisão técnica tomada |
| 26/09 | Live interna com chat e captura de lead |
| 03/10 | Pitch `quiz → checkout` com venda real |
| 10/10 | Ensaio geral com mais de 100 pessoas |
| **17/10** | **Primeira live de cliente da Sylo** |
| 31/10 | Cobrança, painel admin e modo sala no ar |
| 14/11 | Analytics e integrações no ar |
| 21/11 | Produto completo e lançamento público |

## Ritmo

| Dia | Foco |
|---|---|
| Segunda a quinta | Blocos de 2 a 3 horas com Claude Code |
| Sexta | Teste de ponta a ponta da semana |
| Domingo | Revisão: o que atrasou e o que precisa de ajuda |

Toda semana termina com **uma coisa que funciona**, nunca com código pela metade.

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Script de checkout não monta dentro do React | Alto | Spike na Fase 0, antes de qualquer tela |
| Live de cliente cai no ar | Alto (relação) | Ordem eu → audiência → cliente, com plano B em toda live |
| Escopo completo esticar o calendário | Alto | Marcos quinzenais; se atrasar duas vezes seguidas, paralelizar com agentes ou contratar |
| Limite de conexões do Supabase Realtime | Médio | Medir na Fase 2; se apertar, chat vai pro LiveKit Data |
| Custo do LiveKit em live grande | Médio | ~US$ 165 por live de 90min com 1.000 pessoas. Medir consumo real |
| Operação da Sylo consumir o tempo | Alto | Blocos fixos na agenda; atraso empurra data, não corta teste |
| Eduzz exigir domínio validado por página | Médio | Confirmar com o suporte na Fase 0 |
