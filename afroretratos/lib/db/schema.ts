import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const eventStatus = pgEnum("event_status", [
  "upcoming",
  "finished",
  "cancelled",
]);

export const postStatus = pgEnum("post_status", [
  "active",
  "hidden",
  "removed",
]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    coverImage: text("cover_image"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    venue: text("venue").notNull().default(""),
    location: text("location").notNull().default(""),
    status: eventStatus("status").notNull().default("upcoming"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("events_slug_idx").on(table.slug),
    index("events_starts_at_idx").on(table.startsAt),
    index("events_status_idx").on(table.status),
  ],
);

/**
 * Fotos do evento enviadas pelo painel. O container de producao e read-only e
 * troca de imagem a cada deploy, entao o arquivo vive no banco (Supabase) e e
 * servido por /api/event-images/[id] — nada em disco.
 *
 * kind: "cover" e a capa unica (substituida a cada envio);
 *       "gallery" sao ate 3 fotos exibidas em carrossel na pagina do evento.
 */
export const eventImageKind = pgEnum("event_image_kind", ["cover", "gallery"]);

export const eventImages = pgTable(
  "event_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    kind: eventImageKind("kind").notNull().default("gallery"),
    position: integer("position").notNull().default(0),
    mime: text("mime").notNull(),
    // Base64 da imagem. O TOAST do Postgres guarda o valor fora da linha.
    data: text("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("event_images_event_id_idx").on(table.eventId, table.kind),
    uniqueIndex("event_images_cover_idx")
      .on(table.eventId)
      .where(sql`${table.kind} = 'cover'`),
    uniqueIndex("event_images_position_idx")
      .on(table.eventId, table.position)
      .where(sql`${table.kind} = 'gallery'`),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    // E-mail opcional informado pelo autor para a moderacao. Criptografado
    // com AES-256-GCM e visivel apenas no painel; o Feed e sempre anonimo.
    contactEncrypted: text("contact_encrypted"),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    // HMAC deterministico do IP. Nunca e exposto em respostas publicas.
    ipHash: text("ip_hash").notNull(),
    // IP original criptografado (AES-256-GCM). Opcional; so a moderacao le.
    ipEncrypted: text("ip_encrypted"),
    userAgent: text("user_agent"),
    status: postStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("posts_created_at_idx").on(table.createdAt),
    index("posts_event_id_idx").on(table.eventId),
    index("posts_status_idx").on(table.status),
    index("posts_ip_hash_idx").on(table.ipHash),
    index("posts_event_created_at_idx").on(table.eventId, table.createdAt),
  ],
);

export const blockedOrigins = pgTable(
  "blocked_origins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),
    reason: text("reason").notNull(),
    blockedAt: timestamp("blocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // null = bloqueio permanente
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by"),
  },
  (table) => [
    uniqueIndex("blocked_origins_ip_hash_idx").on(table.ipHash),
    index("blocked_origins_expires_at_idx").on(table.expiresAt),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    reporterIpHash: text("reporter_ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_post_id_idx").on(table.postId),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

export const eventsRelations = relations(events, ({ many }) => ({
  posts: many(posts),
  images: many(eventImages),
}));

export const eventImagesRelations = relations(eventImages, ({ one }) => ({
  event: one(events, {
    fields: [eventImages.eventId],
    references: [events.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  event: one(events, {
    fields: [posts.eventId],
    references: [events.id],
  }),
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  post: one(posts, {
    fields: [reports.postId],
    references: [posts.id],
  }),
}));
