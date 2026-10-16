# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmada pelo usuário: Next.js 16 (App Router) + TypeScript + Tailwind CSS, PostgreSQL + Drizzle ORM, Zod, Redis para rate limiting. Frontend e backend no mesmo projeto Next.js, sem microserviços. Deploy alvo: Vercel (app), Supabase (Postgres), Upstash (Redis); desenvolvimento local com Docker. Sem autenticação de usuário público.

## Users

- Pessoas da comunidade que querem ler ou publicar relatos anônimos sobre vivências, sem cadastro, conta, login ou username.
- Pessoas que acompanham os eventos organizados pelo AfroRetratos e querem divulgação, datas e locais.
- Equipe do AfroRetratos que modera o Feed (posts, origens abusivas, denúncias) e mantém os eventos.

## Product Purpose

Plataforma cultural com três áreas: AfroRetrato (início/manifesto), Eventos (divulgação dos eventos organizados pelo AfroRetratos) e Feed (relatos anônimos da comunidade, opcionalmente ligados a um evento). Também precisa permitir identificar tecnicamente abuso no Feed — postagens em massa vindas da mesma origem — sem expor o IP publicamente.

## Positioning

Um Feed anônimo sem contas nem identidades persistentes públicas ("Anônimo" é a única identidade do visitante), combinado com uma identidade editorial AfroRetratos — não um fórum genérico nem um painel de eventos.

## Operating Context

- Publicação: qualquer pessoa publica direto, sem cadastro; o relato pode ser geral ou vinculado a um evento.
- Moderação: feita pela equipe; precisa listar posts, ocultar, remover, ver posts da mesma origem, remover em lote, bloquear/desbloquear origem com motivo e prazo, e receber denúncias.
- Abuso: uma origem pode publicar centenas/milhares de mensagens; a correlação é técnica, por hash do IP.
- Conteúdo institucional definido no documento do projeto (Projeto IV: Somativa 01): objetivo, manifesto, ações, cronograma, parcerias e equipe são a fonte de verdade dos textos do site.

## Capabilities and Constraints

- Rotas públicas: `/`, `/eventos`, `/eventos/[slug]`, `/feed`.
- Eventos com id, slug, título, descrição, capa, data, horário, local, status (upcoming | finished | cancelled), created_at, updated_at. Listagem diferencia futuros e anteriores; eventos podem ser mockados enquanto o banco não está configurado.
- Posts com id, content, event_id (nullable), ip_hash, ip_encrypted (nullable), user_agent (nullable), status (active | hidden | removed), created_at, updated_at; relação com events. A API pública nunca retorna dados técnicos do usuário.
- Privacidade do IP: IP resolvido por função central, hash/HMAC determinístico com segredo só no servidor para correlação, IP original opcional e separadamente protegido/criptografado, nunca no frontend, HTML, data attributes, Server Components públicos, API pública ou logs.
- Rate limit no servidor com Redis quando disponível: 5 posts/minuto e 20 posts/hora por origem (valores configuráveis), HTTP 429 com mensagem amigável sem revelar detalhes internos; denúncias também têm rate limit.
- Validação de tudo no servidor com Zod: conteúdo obrigatório, mínimo/máximo, event_id válido, normalização, proteção contra spam, payloads gigantes, XSS e HTML arbitrário.
- Moderação não pública, com camadas de dados, services, autorização e rotas; autenticação administrativa mínima via ADMIN_SECRET (decisão do usuário), documentando a evolução para um provedor real.
- Ordem do fluxo de publicação: resolver origem → hash → consultar bloqueios → rate limit → validar → salvar → retornar versão pública.
- Acessibilidade obrigatória: HTML semântico, teclado, foco visível, labels, aria, contraste (a paleta é escura), alt em imagens.
- SEO: metadata e Open Graph para Home, Eventos, evento e Feed; admin com noindex.

## Brand Commitments

- Identidade oficial em `Id. Visual Afroretratos.pdf`: cores Vinho `#510000`, Verde oliva `#514D32`, Marrom `#452A21`, Bege `#CCB49A` — nenhuma cor principal nova, apenas variações técnicas.
- Tipografia oficial: Hero Kawig (títulos), Ethna (subtítulos), Ubuntu (texto). Arquivos das fontes ainda não estão no projeto: usar fallback temporário e documentar onde colocar os originais, sem substituição silenciosa.
- Logotipo oficial fornecido; não recriar com texto/CSS/outra fonte.
- Direção editorial, cultural, expressiva, orgânica, contemporânea; tipografia de impacto, composição assimétrica, blocos grandes de cor, espaço negativo, fotografia com protagonismo.
- Evitar SaaS/dashboard, gradientes genéricos, glassmorphism, excesso de sombras/cards/arredondamento, azul/roxo de startup, componentes genéricos, animações exageradas. Animar com discrição e respeitar `prefers-reduced-motion`.
- Mobile-first em celular, tablet, notebook e desktop, preservando a identidade editorial.

## Evidence on Hand

- `Id. Visual Afroretratos.pdf` — manual de identidade (paleta, tipografia, lockups, mockups de camiseta/boné).
- Assets derivados extraídos do PDF em `public/brand/` (logotipo bege, logotipo marrom, ícone).
- Documento oficial do projeto em `Projeto IV _ Somativa 01.md` (tema, objetivo, ações, cronograma, parceiros, equipe).
- Sem fotografia de eventos e sem relatos reais da comunidade: nada disso pode ser inventado como se fosse real (o Feed abre vazio de propósito).

## Product Principles

1. A identidade AfroRetratos vem antes de qualquer componente: nada de aparência de template ou SaaS.
2. Anonimato público é absoluto e simples: sem contas, sem apelidos rastreáveis, sem IP exposto.
3. Abuso é tratado tecnicamente nos bastidores, com correlação por hash e moderação eficaz.
4. Conteúdo pendente fica explicitamente marcado como placeholder, nunca disfarçado de texto oficial.
5. Simplicidade de arquitetura e manutenção; sem overengineering, sem microserviços, sem dependências desnecessárias.

## Accessibility & Inclusion

Requisito do usuário: não sacrificar acessibilidade pela estética. HTML semântico, navegação por teclado, foco visível, labels, aria quando necessário, contraste adequado (validar especialmente sobre vinho/oliva/marrom), alt em imagens, botões e links semanticamente corretos.
