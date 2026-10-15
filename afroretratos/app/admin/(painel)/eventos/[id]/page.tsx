import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EventCoverField } from "@/components/admin/EventCoverField";
import { EventGalleryField } from "@/components/admin/EventGalleryField";
import { EventGalleryPreview } from "@/components/admin/EventGalleryPreview";
import { EventTabs } from "@/components/admin/EventTabs";
import { hasDatabase } from "@/lib/db/client";
import { formatDateTimeRange } from "@/lib/format";
import {
  MAX_GALLERY_IMAGES,
  findEventCover,
  listGalleryImages,
} from "@/services/event-images";
import { getEventById } from "@/services/events";
import { deleteEventAction } from "../actions";
import { EventForm } from "../event-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const [cover, gallery] = await Promise.all([
    findEventCover(event.id),
    listGalleryImages(event.id),
  ]);
  const databaseReady = hasDatabase();

  return (
    <div>
      <Link
        href="/admin/eventos"
        className="text-xs font-medium tracking-[0.12em] text-brown-raised uppercase underline decoration-brown-deep/30 hover:decoration-brown-deep"
      >
        Voltar para eventos
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-none">
            Editar evento
          </h1>
          <p className="mt-3 text-sm text-brown-raised">
            Página pública:{" "}
            <Link
              href={`/eventos/${event.slug}`}
              className="underline decoration-brown-deep/30 hover:decoration-brown-deep"
            >
              /eventos/{event.slug}
            </Link>
          </p>
        </div>
        <form action={deleteEventAction}>
          <input type="hidden" name="id" value={event.id} />
          <input type="hidden" name="slug" value={event.slug} />
          <ConfirmButton
            message={`Excluir "${event.title}"? Os relatos ligados a ele continuam no Feed, sem evento.`}
            className="rounded-md border border-wine bg-wine px-4 py-2.5 text-xs font-medium tracking-[0.08em] text-beige uppercase transition-colors hover:bg-wine-deep"
          >
            Excluir evento
          </ConfirmButton>
        </form>
      </div>

      {/* Duas abas: os dados do evento e as imagens. */}
      <div className="mt-8 max-w-[64rem]">
        <EventTabs
          imageCount={gallery.length + (cover ? 1 : 0)}
          data={<EventForm event={event} />}
          images={
            <section
              aria-labelledby="fotos-do-evento"
              className="rounded-lg border border-brown-deep/25 bg-beige-light/50 p-6 sm:p-8"
            >
              <h2
                id="fotos-do-evento"
                className="font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-none"
              >
                Fotos do evento
              </h2>
              <p className="mt-3 text-sm text-brown-raised">
                A capa substitui a composição gerada com as cores da marca. As
                fotos do carrossel aparecem na página do evento, antes dos
                relatos. Cada envio é salvo na hora.
              </p>

              {databaseReady ? (
                <>
                  <div className="mt-8">
                    <EventCoverField
                      eventId={event.id}
                      slug={event.slug}
                      title={event.title}
                      dateLine={formatDateTimeRange(event.startsAt, event.endsAt)}
                      placeLine={`${event.venue} — ${event.location}`}
                      coverUrl={cover ? `/api/event-images/${cover.id}` : null}
                      urlValue={event.coverImage}
                    />
                  </div>

                  <EventGalleryField
                    eventId={event.id}
                    remaining={MAX_GALLERY_IMAGES - gallery.length}
                    used={gallery.length}
                  />

                  {gallery.length > 0 ? (
                    <EventGalleryPreview
                      eventId={event.id}
                      images={gallery.map((image) => ({
                        id: image.id,
                        url: `/api/event-images/${image.id}`,
                      }))}
                    />
                  ) : null}
                </>
              ) : (
                <p className="mt-6 rounded-md border border-brown-deep/30 p-4 text-sm text-brown-raised">
                  As fotos precisam do banco de dados. Configure{" "}
                  <code>DATABASE_URL</code> para enviar capa e carrossel.
                </p>
              )}
            </section>
          }
        />
      </div>
    </div>
  );
}
