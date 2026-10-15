# AfroRetratos

Plataforma cultural com três áreas: **AfroRetrato** (início + manifesto),
**Eventos** (agenda e detalhe por slug) e **Feed** (relatos anônimos da
comunidade, opcionalmente ligados a um evento). A identidade visual oficial
está em `Id. Visual Afroretratos.pdf`; o sistema visual está documentado em
[DESIGN.md](./DESIGN.md).

> Textos institucionais ainda não existem: o manifesto está em Lorem Ipsum e
> os eventos do seed são placeholders explícitos. Nada foi inventado como
> conteúdo oficial.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript estrito
- Tailwind CSS v4 (tokens em `app/globals.css` via `@theme`)
- PostgreSQL + Drizzle ORM (migrations em `drizzle/`)
- Redis para rate limiting (fallback em memória por processo)
- Zod para validação no servidor
- Testes com `bun test`

Frontend e backend no mesmo projeto. Sem microserviços, sem autenticação de
usuário público.

## Rodando localmente

Pré-requisitos: Bun, Docker.

```bash
bun install
docker compose up -d        # Postgres em :5437 e Redis em :6377
cp .env.example .env.local  # preencha os segredos (veja abaixo)
bun run db:migrate
bun run db:seed             # eventos e relatos de exemplo
bun run dev
```

Acesse `http://localhost:3000` (ou a porta que o Next indicar).

Sem `DATABASE_URL`, o app roda com um store em memória
(`lib/db/mock-store.ts`) e os eventos/relatos de exemplo — útil para olhar a
interface sem banco. Sem `REDIS_URL`, o rate limit cai para memória do
processo (não compartilha entre instâncias).

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | produção | Postgres (Neon: `postgres://...?sslmode=require`). |
| `REDIS_URL` | recomendada | Redis (Upstash TCP: `rediss://default:...@host:6379`). |
| `ORIGIN_HASH_SECRET` | produção | Segredo do HMAC que gera o `ip_hash` (≥16 caracteres). Em produção o app **falha** sem ele. |
| `ORIGIN_ENCRYPTION_KEY` | opcional | AES-256-GCM (32 bytes em base64) para guardar o IP original; sem ela, nenhum IP é armazenado. |
| `TRUSTED_PROXY_HOPS` | produção | Nº de proxies confiáveis à direita do `X-Forwarded-For`. **Vercel = 1.** Sem isso (0), a origem fica desconhecida e rate limit/bloqueio valem para todos juntos. |
| `TRUST_CLOUDFLARE_HEADER` | opcional | `true` quando a origem só é acessível via Cloudflare (usa `cf-connecting-ip`). |
| `RATE_LIMIT_POSTS_PER_MINUTE` / `..._PER_HOUR` | opcional | Padrão 5 e 20. |
| `RATE_LIMIT_REPORTS_PER_HOUR` | opcional | Padrão 10. |
| `ADMIN_SECRET` | moderação | Senha do painel `/admin` (mínimo 8 caracteres). |
| `NEXT_PUBLIC_SITE_URL` | produção | URL pública para canonical, sitemap e Open Graph. |

### Scripts

```bash
bun run dev            # desenvolvimento
bun run build          # build de produção
bun run start          # servir o build
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
bun test               # testes unitários (validação, IP, rate limit)
bun run db:generate    # gerar migration a partir do schema
bun run db:migrate     # aplicar migrations
bun run db:seed        # popular dados de exemplo
bun run db:studio      # Drizzle Studio
```

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Home: hero, manifesto provisório, blocos editoriais, próximos eventos, chamada do Feed. |
| `/eventos` | Agenda: "Em cartaz" (futuros + cancelados futuros) e "Anteriores". |
| `/eventos/[slug]` | Detalhe do evento, fatos, descrição, CTA de relato e relatos vinculados. |
| `/feed` | Feed anônimo: formulário de publicação e lista paginada. |
| `/feed?evento=slug` | Feed com o evento pré-selecionado no formulário. |
| `/api/posts` | `GET` lista pública (cursor); `POST` publica (rate limit + validação). |
| `/api/reports` | `POST` denúncia anônima (rate limit próprio). |
| `/admin` | Moderação (gate `ADMIN_SECRET`): visão geral, posts, origens, denúncias. |
| `/robots.txt`, `/sitemap.xml` | SEO; `/admin` e `/api` fora do índice. |

## Feed: relatos, e-mail opcional e moderação

- Publicação sem cadastro e sempre pública como "Anônimo" (não existe
  assinatura pública: evita alguém se passar por outra pessoa).
- Campo opcional de **e-mail para a moderação**, guardado criptografado
  (AES-256-GCM) e visível apenas no detalhe do post no painel.
- Contador de relatos no topo do Feed e **RSS** em `/feed/rss.xml`.
- Painel: busca por conteúdo, filtro por situação, por origem e por evento,
  botão "Detalhes" em cada post.

## Eventos: calendário e compartilhamento

- Cada evento tem **arquivo de calendário** em
  `/eventos/<slug>/evento.ics` (dia inteiro ou com horário, fuso de São
  Paulo), com link "Adicionar ao calendário" na página do evento.
- Botão "Compartilhar" usa a folha nativa do sistema e cai para cópia do
  link quando não existe.

## Fotos do evento (capa e carrossel)

O painel do evento tem duas abas: **Dados** e **Imagens**. Na aba Imagens, cada
envio é salvo na hora (sem depender do botão do formulário):

- **Capa:** uma foto enviada pelo painel. O envio abre uma moldura 2:1 com
  arraste e zoom; o recorte e a redução acontecem no navegador, então o servidor
  não precisa de biblioteca de imagem. Sem capa, o evento usa a composição
  gerada com as cores da marca (o painel mostra essa composição como prévia, na
  largura do site reduzida).
- **Carrossel:** até 3 fotos por evento, exibidas antes dos relatos na página
  pública, em campo oliva, com setas, teclado, arraste e miniaturas.

Decisões por trás disso:

- **A imagem vive no banco** (tabela `event_images`, coluna `data` em base64);
  o container de produção é `read_only` e é reconstruído a cada deploy, então
  arquivo em disco não sobrevive. O Neon é a fonte de verdade.
- **A imagem é servida por `/api/event-images/[id]`**, na mesma origem, o que
  mantém o CSP restrito (`img-src 'self' data: blob:`) sem liberar host externo.
- **Não há capa por URL externa:** o site não carrega imagem de terceiros
  (CSP), então a única entrada é o arquivo enviado pelo painel.
- O teto é 2,5 MB por imagem (`lib/validation/images.ts`) e 3 fotos por evento
  (`services/event-images.ts`), reforçado no servidor.

## Privacidade e segurança

- **IP nunca é público.** A API pública devolve apenas `id`, `content`,
  `createdAt` e o evento (`slug`, `title`). `ip_hash`, `ip_encrypted` e
  `user_agent` ficam só no banco e no painel de moderação.
- **Correlação sem IP puro.** `lib/security/hash.ts` gera um HMAC-SHA256
  determinístico do IP (`ip_hash`), com segredo exclusivo do servidor. O IP
  original, quando guardado, é criptografado com AES-256-GCM
  (`lib/security/crypto.ts`) e só aparece descriptografado no painel.
- **Origem confiável.** `lib/security/origin.ts` centraliza a leitura de
  headers: `X-Forwarded-For` só vale com `TRUSTED_PROXY_HOPS > 0` e apenas a
  entrada a N hops confiáveis da direita; Cloudflare só com a flag explícita.
- **Ordem do POST:** origem → `ip_hash` → bloqueio → rate limit → validação →
  persistência → resposta pública.
- **Rate limit no servidor** (Redis/Upstash via script Lua atômico; fallback
  em memória): 5 posts/minuto e 20/hora por origem, com HTTP 429 e mensagem
  amigável. Denúncias têm limite próprio; login admin também.
- **Validação Zod** (3–1200 caracteres), normalização de texto, teto de bytes
  lido antes do parse, honeypot, limite de links e `event_id` validado contra
  o banco. HTML é sempre tratado como texto (React escapa).
- **Bloqueio de origem** (`blocked_origins`) com motivo, prazo opcional e
  verificação antes de aceitar publicações e denúncias.

### Retenção de dados

A arquitetura já separa o que é efêmero (`ip_hash`, `ip_encrypted`,
`user_agent`) do que é público. A política de retenção ainda não foi decidida;
o caminho natural é limpar `ip_encrypted`/`user_agent` por idade e manter o
`ip_hash` apenas enquanto o bloqueio estiver ativo.

## Moderação

`/admin` usa um gate mínimo: `ADMIN_SECRET` + cookie httpOnly assinado com
HMAC (8 horas), `noindex`, verificação no proxy (`proxy.ts`) e em cada server
action. Funcionalidades: listar/filtrar posts, ocultar, reativar, remover,
ver todos os posts da mesma origem, remover em lote, bloquear/desbloquear
origem com motivo e duração, ler denúncias e o **CRUD completo de eventos**
(criar, editar, excluir, com slug único, datas e horários opcionais e
revalidação das páginas públicas). Trocar o `ADMIN_SECRET`
invalida todas as sessões.

Para produção, o próximo passo é substituir o gate por um provedor real
(ex.: Auth.js com allowlist) mantendo as mesmas camadas de autorização.

## Fontes da marca

Hero Kawig e Ethna são proprietárias e ainda não têm arquivos no projeto. O
site usa fallbacks **declarados** (Archivo Black e Bodoni Moda, via
`next/font/google`). Para ativar as oficiais, coloque
`public/fonts/hero-kawig.woff2` e `public/fonts/ethna.woff2` e descomente os
`@font-face` em `app/globals.css` — detalhes em
[`public/fonts/README.md`](./public/fonts/README.md). Ubuntu vem do Google
Fonts. A origem dos logotipos está em
[`public/brand/SOURCES.md`](./public/brand/SOURCES.md).

## Deploy (Vercel + Neon + Upstash)

1. Crie o banco no Neon e copie a connection string para `DATABASE_URL`.
2. Crie o Redis no Upstash e use a URL TCP (`rediss://...`) em `REDIS_URL`.
3. Na Vercel, defina as variáveis da tabela acima, incluindo
   **`TRUSTED_PROXY_HOPS=1`** (a Vercel anexa o IP do cliente ao
   `X-Forwarded-For`) e `NEXT_PUBLIC_SITE_URL`.
4. Rode `bun run db:migrate` apontando para o Neon e, se quiser, `db:seed`.

## Monitoramento de segurança (Telegram)

O serviço `security-watch` roda em container, **só lê** os logs do host e
avisa no Telegram:

- força bruta de SSH (5 falhas do mesmo IP em 10 minutos, com cooldown para
  não virar spam);
- disco acima de 85%, memória disponível abaixo de 80 MB e carga acima de 8;
- resumo diário às 9h (horário de São Paulo).

Para ativar:

1. Crie um bot no Telegram com o `@BotFather` e copie o token.
2. Descubra o chat id: mande `/start` para o bot e abra
   `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`, ou use o
   `@userinfobot`.
3. No servidor, preencha `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` em
   `~/afroretratos/.env` e rode `docker compose up -d security-watch`.
4. Teste: `docker compose exec security-watch python3 /app/watch.py --test-telegram`.

Sem token configurado o vigia continua rodando e registrando em log, sem
enviar mensagens. Ele não bloqueia nada: para bloqueio automático de brute
force, o passo seguinte é `sshguard` (precisa de root) ou uma regra no
roteador.

## CI/CD e atualização automática

- Repositório público: https://github.com/wired-layer-co/afroretratos
- Cada push na `main` dispara `.github/workflows/ci-cd.yml`: typecheck, lint,
  testes e build da imagem Docker publicada em
  `ghcr.io/wired-layer-co/afroretratos:latest` (também tagueada com o SHA do commit).
- No servidor, o serviço `watchtower` do `docker-compose.server.yml` verifica a
  cada 3 minutos se a imagem mudou (label
  `com.centurylinklabs.watchtower.enable`) e recria o container da app sozinho.
- Verificação imediata, sem esperar o ciclo:

  ```bash
  ssh <seu-servidor> 'docker exec afroretratos-watchtower-1 /watchtower --run-once --label-enable --cleanup'
  ```

- Rollback: fixe uma tag por SHA no compose
  (`ghcr.io/wired-layer-co/afroretratos:<sha>`) e rode `docker compose up -d app`.

## Decisões e pendências

- **Status de evento** é derivado da data na leitura (`displayStatus`),
  exceto `cancelled`, que sempre vence — evita "upcoming" vencido.
- **Capas de evento** são composições geradas com as cores oficiais e o
  ícone da marca (nenhuma fotografia simulada) quando o evento não tem capa
  enviada. A capa real vem do painel, como arquivo ou URL externa (ver
  "Fotos do evento" acima).
- **Mock sem banco:** eventos/relatos de exemplo vivem em
  `lib/db/mock-data.ts` e são placeholders explícitos.
- **Pendências:** copy institucional definitiva, arquivos oficiais de Hero
  Kawig/Ethna, fotografia dos eventos, política de retenção de IP, interface
  pública de denúncia no frontend (a API já existe) e evolução do gate de
  moderação para um provedor de autenticação.
