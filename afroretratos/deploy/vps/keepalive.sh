#!/bin/sh
# Mantem o Postgres acordado na janela de maior trafego, para o primeiro
# visitante nao pagar o cold start de um banco que dorme por inatividade.
#
# Supabase Free: o projeto pausa depois de 7 dias sem atividade. Uma consulta a
# cada 4 minutos dentro da janela (11h-22h de Sao Paulo) mantem o banco ativo e
# cobre o horario real de uso, sem precisar de batida fora de hora.
#
# A janela fica aqui (e nao no agendador) para o timer poder rodar o dia inteiro.
set -eu

# A VPS roda em UTC; a janela aqui e no horario de Sao Paulo.
HOUR=$(TZ=America/Sao_Paulo date +%H)
if [ "$HOUR" -lt 11 ] || [ "$HOUR" -gt 22 ]; then
  exit 0
fi

# /api/posts faz uma consulta real no Postgres (acorda o compute) e nao passa
# pelo rate limit do Redis. /api/health nao serve aqui: ele nao toca o banco.
curl -fsS -m 10 -o /dev/null "http://127.0.0.1:3100/api/posts?limit=1"
