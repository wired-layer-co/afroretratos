# AfroRetratos na VPS (Oracle + Cloudflare proxied)

Diferente do `docker-compose.server.yml` (homelab, com tunel e banco local),
aqui o Postgres fica no Supabase e o Redis no Upstash. A VPS roda so aplicacao,
vigia, proxy e automacao.

## Servicos na VPS

- `app` em `127.0.0.1:3100`
- `security-watch` (alerta de SSH, disco, memoria e carga no Telegram)
- `nginx` (do host) proxying `afroretratos.wired.rs` para `127.0.0.1:3100`
- Certificado: `/etc/ssl/cert.pem` (Cloudflare Origin CA, cobre `*.wired.rs`)

## Proteger as cotas (Supabase Free 500 MB, Upstash 10k comandos/dia)

Qualquer request que chega na origem pode acordar o banco e gastar comando no
Redis, entao a defesa e em camadas:

- **`/api/health` nao toca no banco.** O healthcheck roda a cada 30s; apontado
  para `/api/posts` (como estava) bateria no banco 24/7 sem necessidade.
- **Micro-cache no nginx** (`nginx-limits.conf`): 30s para paginas e 15s para
  `/api/`, com `proxy_cache_lock` e `use_stale updating`. Crawler e F5 batem no
  cache e nao chegam no banco.
- **`limit_req`** por IP real (o IP ja vem resolvido do `cf-connecting-ip`):
  10 r/s para paginas, 2 r/s para `/api/`.
- **Ruido descartado**: user agents de SEO/scraping levam `444` e caminhos de
  scanner (`wp-admin`, `.env`, `.git`...) tambem.
- **Redis so em escrita**: rate limit de POST posts/reports e login admin. As
  leituras nao gastam comando no Upstash.
- **Keepalive com janela** (`keepalive.sh`): acorda o compute a cada 4 min so
  entre 11h e 22h de Sao Paulo, o que custa ~90 CU-h/mes. Sem janela seriam
  180 CU-h e estouraria a cota.

Na borda (Cloudflare), configurado via API:

- **Cache Rule** "Cache do AfroRetratos (fora /admin)": cache no edge com
  `edge_ttl` de 30s (override do origin) e `browser_ttl` respeitando o origin.
- **Rate limiting rule** em `/api/*`: 15 requisicoes / 10s por `ip.src` +
  `cf.colo.id`, bloqueio de 10s. O plano free so aceita `period = 10s` e
  `mitigation_timeout = 10s`.
- **Always Use HTTPS** ligado; SSL em `strict` (certificado Origin CA).
- **Bot Fight Mode** ainda no painel (o token nao expoe esse setting):
  Security > Bots.

Detalhe que quase derrubou o site na virada: a allowlist da origem precisa
olhar `$realip_remote_addr` (o IP que conectou, do Cloudflare) e nao
`$remote_addr`, que o `real_ip_header` ja reescreveu para o visitante. Sem isso,
o `allow`/`deny` compara o IP do visitante com a faixa do Cloudflare e devolve
403 para todo mundo. Por isso a allowlist e um `geo` em
`/etc/nginx/cloudflare-geo.conf`, incluido pelo `nginx-limits.conf`.


## Docker rootless

O Docker desta VPS e rootless, entao **containers nao acessam
`/var/run/docker.sock`** e watchtower/autoheal nao funcionam (davam loop de
"permission denied"). A atualizacao e o restart de container unhealthy rodam no
host via systemd timers:

- `afroretratos-update.timer`: a cada 5 min, `update.sh` faz pull + up e
  reinicia container unhealthy.
- `afroretratos-keepalive.timer`: a cada 4 min, `keepalive.sh` aquece o banco
  dentro da janela (o Supabase Free pausa o projeto apos 7 dias sem atividade).

```sh
sudo cp systemd/*.service systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now afroretratos-update.timer afroretratos-keepalive.timer
```

## Hardening do host

`harden.sh` (roda com sudo, com failsafe que reverte o firewall em 180s):

- firewall: `INPUT DROP` liberando so 22/80/443, `lo`, established e ICMP
  (persistido com `netfilter-persistent`);
- `rpcbind` desabilitado (nao havia NFS montado, mas a 111 estava exposta);
- SSH: `MaxAuthTries 3`, `LoginGraceTime 20` (senha ja estava desabilitada);
- `fail2ban` com jail de `sshd` (backend systemd).

Com Cloudflare na frente, banir IP no fail2ban para 80/443 nao resolve nada: o
atacante nunca fala direto com a origem e a allowlist de IPs do Cloudflare ja
descarta o resto. Por isso o bloqueio web fica no nginx (`limit_req` + `444`) e
no Cloudflare (WAF/rate limit), e o fail2ban fica com o SSH, que e o unico alvo
direto.

## Passo a passo

1. Criar o projeto no Supabase (`sa-east-1`, Postgres 17) e o Redis no Upstash
   (`sa-east-1`).
2. Preencher `~/afroretratos/.env` (ver `.env.example`). Manter
   `ORIGIN_HASH_SECRET` e `ORIGIN_ENCRYPTION_KEY` iguais aos do servidor
   anterior, senao os e-mails criptografados e os hashes de IP mudam.
3. Restaurar o dump usando a URL direta (pooler sessao):
   `psql "$DIRECT_DATABASE_URL" -f afroretratos-dump.sql`. O dump traz
   `_afro_migrations`, entao o entrypoint nao reaplica o que ja existe.
4. Fechar o schema para a API REST do Supabase (o `public` e exposto por padrao
   com a chave `anon`):

   ```sql
   alter table public.events enable row level security;
   -- ...o mesmo para posts, event_images, blocked_origins, reports, _afro_migrations
   revoke all on all tables in schema public from anon, authenticated;
   alter default privileges in schema public revoke all on tables from anon, authenticated;
   ```

   O app conecta como dono (`postgres`), entao o RLS nao o afeta.
5. `docker compose up -d` (o entrypoint aplica migrations pendentes).
6. Instalar os timers (secao acima).
7. nginx:
   - `sudo install -m 644 nginx-limits.conf /etc/nginx/conf.d/afroretratos-limits.conf`
   - `sudo install -m 644 nginx-afroretratos.conf /etc/nginx/sites-available/afroretratos.wired.rs`
   - `sudo ln -sf /etc/nginx/sites-available/afroretratos.wired.rs /etc/nginx/sites-enabled/`
   - `sudo mkdir -p /var/cache/nginx && sudo chown -R www-data:www-data /var/cache/nginx`
   - `sudo install -m 755 refresh-cloudflare-ips.sh /usr/local/bin/refresh-cloudflare-ips.sh`
   - `sudo /usr/local/bin/refresh-cloudflare-ips.sh`
   - `sudo nginx -t && sudo systemctl reload nginx`

   Sugestao de cron semanal para manter a allowlist do Cloudflare em dia:
   `0 4 * * 1 /usr/local/bin/refresh-cloudflare-ips.sh >> /var/log/cloudflare-ips.log 2>&1`
7. Hardening: `sudo sh harden.sh`
8. Cloudflare: apontar `afroretratos.wired.rs` para o IP da VPS (registro A,
   nuvem laranja). O tunel do homelab fica como rollback por alguns dias.
9. Verificar: `curl -sI https://afroretratos.wired.rs/feed` e
   `journalctl -u afroretratos-update -n 20`.

## Trocar de banco (Neon, Supabase, homelab)

O banco e so uma `DATABASE_URL`, entao mudar de provedor e dump + restore:

1. Dump do banco atual (`pg_dump "$DIRECT_DATABASE_URL" --no-owner
   --no-privileges --schema=public`).
2. No banco novo, se for Supabase, remova a linha `CREATE SCHEMA public;` do
   dump (o schema ja existe) e restaure com
   `psql "$DIRECT_DATABASE_URL" -v ON_ERROR_STOP=1 -f dump.sql`.
3. Confira as contagens (`events`, `posts`, `event_images`, `blocked_origins`,
   `reports`, `_afro_migrations`).
4. Supabase: aplique o RLS + revoke do passo 4 acima.
5. Troque `DATABASE_URL` (pooler de transacao, porta 6543) e
   `DIRECT_DATABASE_URL` (pooler de sessao, porta 5432) no `.env` e suba o app.

O provedor antigo pode ficar de pe como rollback por alguns dias.

## Rollback (voltar pro homelab)

O stack do homelab fica no ar como rollback. Para voltar:

1. No Cloudflare, trocar o registro `afroretratos.wired.rs`
   (id `d9b9cf7fd59511506897661c99a8a0fb`) de A `163.176.208.60` para CNAME
   `92d31552-88be-48b1-b847-124299321739.cfargotunnel.com`, com proxy ligado.
2. **Sincronizar os dados**: o que foi gravado no banco gerenciado depois da
   virada nao existe no Postgres do homelab. Dump do banco atual
   (`pg_dump "$DIRECT_DATABASE_URL" --no-owner --no-privileges`) e restore no
   banco do homelab antes de reativar as escritas.
3. Desligar `afroretratos-update.timer` e `afroretratos-keepalive.timer` na VPS
   (`sudo systemctl disable --now ...`) para o container nao continuar subindo
   contra o banco gerenciado.

