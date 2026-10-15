CREATE TYPE "public"."event_image_kind" AS ENUM('cover', 'gallery');--> statement-breakpoint
CREATE TABLE "event_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "event_image_kind" DEFAULT 'gallery' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"mime" text NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_images" ADD CONSTRAINT "event_images_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_images_event_id_idx" ON "event_images" USING btree ("event_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "event_images_cover_idx" ON "event_images" USING btree ("event_id") WHERE "event_images"."kind" = 'cover';--> statement-breakpoint
CREATE UNIQUE INDEX "event_images_position_idx" ON "event_images" USING btree ("event_id","position") WHERE "event_images"."kind" = 'gallery';