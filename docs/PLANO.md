# Lyvo — Plano de Ação (30 dias)

> Criado em 2026-09-17 · Execução: Gabriel + Claude Code · Alvo: beta com cliente da Sylo · Primeira live real até **2026-10-17**

## Premissas

| Definição | Valor |
|---|---|
| Quem constrói | Gabriel + Claude Code |
| Alvo do MVP | Beta com cliente da Sylo (Henrique, Leonardo, Paulo ou Criis) |
| Prazo | 30 dias até a primeira live real |
| Custo mensal previsto | ~US$ 100 (Supabase Pro 25 + LiveKit Ship 50 + Vercel 20) + consumo |

## Regra que protege o prazo

> [!danger] A live de cliente é a **última** etapa, não a primeira.
> Ordem obrigatória: live interna (só eu) → live com a minha audiência → live de cliente.
> Toda transmissão do beta tem plano B pronto (link de Zoom ou YouTube num card na tela), e o cliente sabe disso antes.

## Fora do escopo dos 30 dias

Sai agora, entra depois. Escopo que cresce mata o prazo:

- ❌ Modo sala (Zoom) — só live
- ❌ Cobrança e assinatura — conta criada na mão
- ❌ Painel admin — gerencio direto pelo Supabase
- ❌ Curva de retenção e relatórios — só exportação de leads em CSV
- ❌ Integrações (Zapier, Make, ActiveCampaign)
- ❌ Construtor com arrastar e soltar — formulário simples resolve
- ❌ Múltiplos planos — todo mundo com tudo liberado no beta
- ❌ Domínio próprio por cliente

## Semana 0 — Fundações e prova de risco (2 dias)

O objetivo aqui é **descobrir cedo se algo não funciona**, antes de construir por cima.

**Marca e contas**
- [ ] Registrar `lyvo.com.br` no Registro.br
- [ ] Busca no INPI, classe 42, por marcas parecidas
- [ ] Garantir `@lyvo` no Instagram e YouTube
- [ ] Criar projeto no Supabase, aplicar as migrations, conferir advisors
- [ ] Criar projeto no LiveKit Cloud (plano Ship) e pegar as chaves
- [ ] Scaffold Next.js no repo + deploy na Vercel (página vazia já no ar)

**Spike 1 — Checkout dentro do React** ⚠️ *maior risco do projeto*
- [ ] Página com vídeo em cima e área de pitch embaixo
- [ ] Carregar o script da Eduzz (Checkout Elements) **no momento** em que o bloco aparece
- [ ] Carregar o widget da Hotmart pelo botão, sem recarregar a página
- [ ] Testar no celular: o vídeo continua tocando?
- [ ] Testar montar, desmontar e montar de novo (host libera, encerra, libera)

**Spike 2 — LiveKit**
- [ ] Sala com host pelo navegador + 1 espectador
- [ ] Entrada via OBS (RTMP) na mesma sala
- [ ] Medir latência real entre host e espectador
- [ ] Testar queda de internet e reconexão

> [!warning] Ponto de decisão, fim da Semana 0
> Se o Spike 1 falhar com Eduzz e Hotmart, o modo padrão passa a ser janela separada + player flutuante, e isso precisa ser decidido **antes** de escrever a tela da sala.

## Semana 1 — Sala ao vivo funcionando

**Objetivo:** fazer uma live de 20 minutos com 10 convidados, com chat, e baixar a lista de quem entrou.

- [ ] Login do cliente (Supabase Auth) + conta criada na mão
- [ ] Criar sala: título, modo live, horário
- [ ] Token do LiveKit gerado no servidor, com papel de host ou espectador
- [ ] Página do espectador: vídeo + chat, no celular primeiro
- [ ] Painel do host: entrar no ar, encerrar, ver quantos estão online
- [ ] Gate de inscrição: nome + e-mail e/ou telefone, configurável por sala
- [ ] Identificador assinado do espectador no navegador
- [ ] Chat em tempo real com nome do inscrito + moderação básica (apagar, banir, modo lento)
- [ ] Gravar `viewer_sessions` com entrada, saída e tempo assistido
- [ ] Exportar leads em CSV

**Pronto quando:** live de 20 min com 10 pessoas, chat funcionando, CSV baixado com os dados certos.

## Semana 2 — Motor do pitch

**Objetivo:** o coração do produto. `quiz → checkout` funcionando com compra real.

- [ ] Registro de blocos + schema Zod por bloco
- [ ] Blocos: texto, botão, quiz, checkout (timer fica pra depois)
- [ ] Editor simples de pitch (formulário, sem arrastar e soltar)
- [ ] Motor do fluxo: etapas, regra de "próximo", ramificação por resposta do quiz
- [ ] Liberação: grava ativação + broadcast; navegador já tem a definição baixada
- [ ] Quem entra depois do pitch também vê a oferta
- [ ] Adaptadores de checkout: Eduzz (inline), Hotmart (pop-up), Kiwify e Xgrow (janela + player flutuante)
- [ ] Contexto no checkout: respostas do quiz + UTM + room_id
- [ ] Gravar `pitch_events` e `quiz_responses`

**Pronto quando:** live de teste em que eu libero `quiz → checkout` e alguém compra de verdade um produto de R$ 1, com a venda aparecendo ligada ao pitch.

## Semana 3 — Confiança, rastreio e ensaio geral

**Objetivo:** aguentar gente de verdade sem cair.

- [ ] Webhooks das 4 plataformas → `orders`
- [ ] Aviso real de compra no chat, vindo do webhook
- [ ] Pixel da Meta + CAPI com `event_id` compartilhado; GA4 e Google Ads
- [ ] Espectadores exibidos (mín/máx, curva, mesmo número pra todos)
- [ ] Painel do host mostrando "reais × exibido"
- [ ] Teste de carga: 300 espectadores simulados (k6) no chat e na liberação do pitch
- [ ] Reconexão: queda de rede do host e do espectador
- [ ] Teste em celular de verdade: Android e iPhone, Chrome e Safari, 4G
- [ ] Runbook de incidente: o que fazer se o vídeo cair, se o chat travar, se o checkout não abrir
- [ ] Página de plano B (card com link alternativo acionado pelo host)

**Pronto quando:** ensaio geral com mais de 100 pessoas da minha lista, live de 45 min, com pitch liberado e venda real.

## Semana 4 — Beta com cliente da Sylo

- [ ] Escolher **um** cliente e uma live de menor risco (não pode ser o pico de um lançamento)
- [ ] Alinhar por escrito: é beta, existe plano B, e eu estarei acompanhando ao vivo
- [ ] Criar a conta e a sala, configurar checkout, pixel e gate
- [ ] Ensaio com o cliente 48h antes, na mesma sala
- [ ] Rodar a live real com monitoramento ao vivo (eu assistindo os logs)
- [ ] Coletar: o que quebrou, o que confundiu, o que ele pediu
- [ ] Corrigir em 48h e rodar a segunda live

**Pronto quando:** cliente da Sylo fez uma live real, vendeu pela Lyvo e quer repetir.

## Ritmo de trabalho

| Dia | Foco |
|---|---|
| Segunda a quinta | Blocos de 2 a 3 horas de construção com Claude Code |
| Sexta | Teste de ponta a ponta do que foi feito na semana |
| Domingo | Revisão do plano: o que atrasou e o que sai do escopo |

Toda semana termina com **uma coisa que funciona de verdade**, não com código pela metade.

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Script de checkout não monta dentro do React | Alto | Spike na Semana 0, antes de tudo |
| Live de cliente cai no ar | Alto (relação) | Ordem: eu → minha audiência → cliente. Plano B em toda live |
| Limite de conexões do Supabase Realtime | Médio | Medir na Semana 3; se apertar, chat vai pro LiveKit Data |
| Custo do LiveKit em live grande | Médio | ~US$ 165 por live de 90min com 1.000 pessoas. Medir consumo real na Semana 3 |
| Operação da Sylo consumir o tempo | Alto | Blocos fixos na agenda; se atrasar, corta escopo, não o teste |
| Eduzz exigir domínio validado por página | Médio | Confirmar com o suporte na Semana 0 |

## Marcos

| Data | Marco |
|---|---|
| 2026-09-19 | Spikes concluídos, decisão técnica tomada |
| 2026-09-26 | Live interna com chat e captura de lead |
| 2026-10-03 | Pitch `quiz → checkout` com venda real |
| 2026-10-10 | Ensaio geral com mais de 100 pessoas |
| 2026-10-17 | Primeira live de cliente da Sylo |

## Depois dos 30 dias

Na ordem: cobrança (Stripe ou Asaas) → painel admin → curva de retenção → modo sala → integrações (webhook primeiro) → domínio próprio por cliente.
