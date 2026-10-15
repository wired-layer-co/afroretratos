import { and, asc, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { eventImages } from "@/lib/db/schema";

export type EventImageKind = "cover" | "gallery";

export type EventImageRef = {
  id: string;
  kind: EventImageKind;
  position: number;
};

export type EventImageData = {
  mime: string;
  data: string;
};

/** Fotos de galeria por evento (o carrossel da pagina publica). */
export const MAX_GALLERY_IMAGES = 3;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Fotos vivem no banco (Neon): o container de producao e read-only e a imagem
 * e reconstruida a cada deploy, entao arquivo em disco nao sobrevive.
 */
export async function listEventImages(eventId: string): Promise<EventImageRef[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: eventImages.id,
      kind: eventImages.kind,
      position: eventImages.position,
    })
    .from(eventImages)
    .where(eq(eventImages.eventId, eventId))
    .orderBy(asc(eventImages.kind), asc(eventImages.position));

  return rows;
}

export async function listGalleryImages(eventId: string): Promise<EventImageRef[]> {
  const images = await listEventImages(eventId);
  return images.filter((image) => image.kind === "gallery");
}

export async function findEventCover(eventId: string): Promise<EventImageRef | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ id: eventImages.id })
    .from(eventImages)
    .where(and(eq(eventImages.eventId, eventId), eq(eventImages.kind, "cover")))
    .limit(1);

  const row = rows[0];
  return row ? { id: row.id, kind: "cover", position: 0 } : null;
}

export async function getEventImageData(id: string): Promise<EventImageData | null> {
  // Id vem da URL publica: barra antes de chegar no cast de uuid do Postgres.
  if (!isUuid(id)) return null;

  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ mime: eventImages.mime, data: eventImages.data })
    .from(eventImages)
    .where(eq(eventImages.id, id))
    .limit(1);

  return rows[0] ?? null;
}

/** Substitui a capa do evento (uma por evento). */
export async function saveEventCover(
  eventId: string,
  image: { mime: string; base64: string },
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Banco de dados não configurado.");

  await db.transaction(async (tx) => {
    await tx
      .delete(eventImages)
      .where(and(eq(eventImages.eventId, eventId), eq(eventImages.kind, "cover")));
    await tx.insert(eventImages).values({
      eventId,
      kind: "cover",
      position: 0,
      mime: image.mime,
      data: image.base64,
    });
  });
}

export async function deleteEventCover(eventId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .delete(eventImages)
    .where(and(eq(eventImages.eventId, eventId), eq(eventImages.kind, "cover")));
}

/**
 * Acrescenta uma foto na galeria respeitando o teto de MAX_GALLERY_IMAGES.
 * A posicao segue a ordem de envio; a imagem sai pelo carrossel.
 */
export async function addGalleryImage(
  eventId: string,
  image: { mime: string; base64: string },
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Banco de dados não configurado.");

  await db.transaction(async (tx) => {
    const [{ total }] = await tx
      .select({ total: count() })
      .from(eventImages)
      .where(and(eq(eventImages.eventId, eventId), eq(eventImages.kind, "gallery")));

    if (total >= MAX_GALLERY_IMAGES) {
      throw new Error(`Limite de ${MAX_GALLERY_IMAGES} fotos por evento.`);
    }

    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${eventImages.position}), -1) + 1` })
      .from(eventImages)
      .where(and(eq(eventImages.eventId, eventId), eq(eventImages.kind, "gallery")));

    await tx.insert(eventImages).values({
      eventId,
      kind: "gallery",
      position: Number(next) || 0,
      mime: image.mime,
      data: image.base64,
    });
  });
}

export async function deleteEventImage(id: string, eventId: string): Promise<void> {
  if (!isUuid(id)) return;

  const db = getDb();
  if (!db) return;

  await db
    .delete(eventImages)
    .where(and(eq(eventImages.id, id), eq(eventImages.eventId, eventId)));
}
