import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mockDb, newId } from "@/lib/db/mock-store";
import { events } from "@/lib/db/schema";
import type { EventOption, EventStatus, PublicEvent } from "@/lib/types";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  startsAt: Date | string;
  endsAt: Date | string | null;
  venue: string;
  location: string;
  status: EventStatus;
};

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * O status exibido e derivado da data (evitando "upcoming" vencido), exceto
 * quando o evento foi cancelado: cancelamento sempre vence.
 */
export function displayStatus(event: {
  status: EventStatus;
  startsAt: string;
}): EventStatus {
  if (event.status === "cancelled") return "cancelled";
  return new Date(event.startsAt).getTime() < Date.now()
    ? "finished"
    : "upcoming";
}

export function toPublicEvent(row: EventRow): PublicEvent {
  const event: PublicEvent = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImage: row.coverImage,
    startsAt: asIso(row.startsAt),
    endsAt: row.endsAt ? asIso(row.endsAt) : null,
    venue: row.venue,
    location: row.location,
    status: displayStatus({ status: row.status, startsAt: asIso(row.startsAt) }),
  };
  return event;
}

export async function listEvents(): Promise<PublicEvent[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(events).orderBy(asc(events.startsAt));
    return rows.map(toPublicEvent);
  }
  return mockDb()
    .events.map((event) => toPublicEvent(event))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getEventBySlug(slug: string): Promise<PublicEvent | null> {
  const db = getDb();
  if (db) {
    const [row] = await db
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);
    return row ? toPublicEvent(row) : null;
  }
  const found = mockDb().events.find((event) => event.slug === slug);
  return found ? toPublicEvent(found) : null;
}

export async function getEventById(id: string): Promise<PublicEvent | null> {
  const db = getDb();
  if (db) {
    const [row] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    return row ? toPublicEvent(row) : null;
  }
  const found = mockDb().events.find((event) => event.id === id);
  return found ? toPublicEvent(found) : null;
}

export async function listEventOptions(): Promise<EventOption[]> {
  const all = await listEvents();
  return all.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    startsAt: event.startsAt,
    status: event.status,
  }));
}

export function splitEvents(events: PublicEvent[]): {
  upcoming: PublicEvent[];
  past: PublicEvent[];
} {
  const now = Date.now();
  const upcoming: PublicEvent[] = [];
  const past: PublicEvent[] = [];
  for (const event of events) {
    const isFuture = new Date(event.startsAt).getTime() >= now;
    if (event.status === "upcoming" || (event.status === "cancelled" && isFuture)) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, past };
}

// ---------------------------------------------------------------------------
// CRUD do painel de moderacao
// ---------------------------------------------------------------------------

export type EventWriteInput = {
  title: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  venue: string;
  location: string;
  status: EventStatus;
};

/**
 * A capa do evento tem duas origens alternativas: arquivo enviado pelo painel
 * (tabela event_images) ou URL externa (coluna cover_image). Esta funcao cuida
 * da URL; quem chama garante que a outra origem seja limpa.
 */
export async function setEventCoverUrl(
  id: string,
  url: string | null,
): Promise<boolean> {
  const db = getDb();
  if (db) {
    const [row] = await db
      .update(events)
      .set({ coverImage: url, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning({ id: events.id });
    return Boolean(row);
  }

  const event = mockDb().events.find((item) => item.id === id);
  if (!event) return false;
  event.coverImage = url;
  event.updatedAt = new Date().toISOString();
  return true;
}

export async function isSlugTaken(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);
    return rows.some((row) => row.id !== excludeId);
  }
  return mockDb().events.some(
    (event) => event.slug === slug && event.id !== excludeId,
  );
}

/** Resolve colisoes de slug acrescentando -2, -3, ... */
export async function uniqueSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || "evento";
  let candidate = root;
  let counter = 2;
  while (await isSlugTaken(candidate, excludeId)) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function toRow(input: EventWriteInput) {
  return {
    ...input,
    startsAt: new Date(input.startsAt),
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
}

export async function createEvent(input: EventWriteInput): Promise<PublicEvent> {
  const db = getDb();
  if (db) {
    const [row] = await db.insert(events).values(toRow(input)).returning();
    return toPublicEvent(row);
  }

  const store = mockDb();
  const now = new Date().toISOString();
  const row = {
    id: newId(),
    ...input,
    coverImage: null,
    createdAt: now,
    updatedAt: now,
  };
  store.events.push(row);
  return toPublicEvent(row);
}

export async function updateEvent(
  id: string,
  input: EventWriteInput,
): Promise<PublicEvent | null> {
  const db = getDb();
  if (db) {
    const [row] = await db
      .update(events)
      .set({ ...toRow(input), updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return row ? toPublicEvent(row) : null;
  }

  const event = mockDb().events.find((item) => item.id === id);
  if (!event) return null;
  Object.assign(event, input, { updatedAt: new Date().toISOString() });
  return toPublicEvent(event);
}

export async function deleteEvent(id: string): Promise<boolean> {
  const db = getDb();
  if (db) {
    const rows = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning({ id: events.id });
    return rows.length > 0;
  }

  const store = mockDb();
  const index = store.events.findIndex((item) => item.id === id);
  if (index === -1) return false;
  store.events.splice(index, 1);
  for (const post of store.posts) {
    if (post.eventId === id) post.eventId = null;
  }
  return true;
}
