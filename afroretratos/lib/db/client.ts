import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type Cache = { db: Database | null };

const globalForDb = globalThis as typeof globalThis & {
  __afroretratosDb?: Cache;
};

function create(): Cache {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { db: null };
  }
  const client = postgres(url, {
    max: 5,
    prepare: false,
    // Provedores gerenciados (Supabase, Neon) exigem sslmode na URL.
  });
  return { db: drizzle(client, { schema }) };
}

/**
 * Retorna a conexao Drizzle ou null quando DATABASE_URL nao esta configurada.
 * O restante da aplicacao usa os repositorios em memoria como fallback
 * explicito (ver lib/db/mock-store.ts), para rodar sem banco em dev.
 */
export function getDb(): Database | null {
  if (!globalForDb.__afroretratosDb) {
    globalForDb.__afroretratosDb = create();
  }
  return globalForDb.__afroretratosDb.db;
}

export function hasDatabase(): boolean {
  return getDb() !== null;
}
