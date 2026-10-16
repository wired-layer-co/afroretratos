import { apiJson } from "@/lib/api/respond";

/**
 * Healthcheck da aplicacao. Nao toca no banco nem no Redis de proposito: o
 * probe roda a cada 30s e, num Postgres gerenciado que dorme por inatividade,
 * cada consulta contaria como atividade e gastaria recurso do plano.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return apiJson({ ok: true });
}
