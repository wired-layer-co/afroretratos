import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

// Migrations rodam melhor na conexao direta (sem pgbouncer). Supabase, por
// exemplo, expoe o pooler de sessao (5432) separado do de transacao (6543).
const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL ausente.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const client = postgres(url, { max: 1, prepare: false });
      await client`select 1`;
      return client;
    } catch {
      console.log(`[migrate] aguardando o banco (${attempt}/30)...`);
      await sleep(2000);
    }
  }
  throw new Error("[migrate] banco indisponível.");
}

const sql = await connect();

try {
  await sql`
    create table if not exists _afro_migrations (
      file text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const folder = join(import.meta.dirname, "..", "drizzle");
  const files = readdirSync(folder)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [applied] = await sql`
      select 1 from _afro_migrations where file = ${file}
    `;
    if (applied) {
      console.log(`[migrate] já aplicada: ${file}`);
      continue;
    }
    const content = readFileSync(join(folder, file), "utf8");
    console.log(`[migrate] aplicando: ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into _afro_migrations (file) values (${file})`;
    });
  }

  console.log("[migrate] ok");
} finally {
  await sql.end();
}
