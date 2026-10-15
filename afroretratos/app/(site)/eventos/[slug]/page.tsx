import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCover } from "@/components/events/EventCover";
import { EventGallery } from "@/components/events/EventGallery";
import { EventStatusTag } from "@/components/events/EventStatusTag";
import { PostEntry } from "@/components/feed/PostEntry";
import { ActionLink } from "@/components/ui/Action";
import { Arrow } from "@/components/ui/Arrow";
import { ShareEvent } from "@/components/events/ShareEvent";
import { formatDateTimeRange } from "@/lib/format";
import { listEventImages } from "@/services/event-images";
import { getEventBySlug } from "@/services/events";
import { listPublicPostsByEvent } from "@/services/posts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return { title: "Evento não encontrado" };
  }
  const images = await listEventImages(event.id);
  const cover = images.find((image) => image.kind === "cover");
  return {
    title: event.title,
    description:
      event.description.slice(0, 180) ||
      `Evento do AfroRetratos em ${formatDateTimeRange(event.startsAt, event.endsAt)}.`,
    alternates: { canonical: `/eventos/${event.slug}` },
    openGraph: {
      type: "article",
      title: `${event.title} · AfroRetratos`,
      description: event.description.slice(0, 180),
      images: [
        cover
          ? { url: `/api/event-images/${cover.id}`, alt: `Capa do evento ${event.title}` }
          : {
              url: "/brand/og-default.png",
              width: 1200,
              height: 630,
              alt: `AfroRetratos: ${event.title}`,
            },
      ],
    },
  };
}

export default async function EventoPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [relatedPosts, images] = await Promise.all([
    listPublicPostsByEvent(event.id, 6),
    listEventImages(event.id),
  ]);

  const cover = images.find((image) => image.kind === "cover");
  const gallery = images.filter((image) => image.kind === "gallery");

  return (
    <article>
      <header className="bg-brown text-beige">
        <div className="mx-auto max-w-[96rem] px-5 pt-6 sm:px-8 sm:pt-8">
          <Link
            href="/eventos"
            className="group inline-flex min-h-11 items-center gap-3 text-xs font-medium tracking-[0.16em] uppercase text-beige/80 hover:text-beige"
          >
            <Arrow
              direction="left"
              className="h-3 w-6 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1.5"
            />
            Todos os eventos
          </Link>
        </div>
        <div className="mx-auto grid max-w-[96rem] gap-8 px-5 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10 lg:grid-cols-12 lg:items-end">
          <h1 className="font-display text-[clamp(2.2rem,6vw,4.6rem)] leading-[0.94] tracking-[-0.015em] lg:col-span-8">
            {event.title}
          </h1>
          <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
            <EventStatusTag status={event.status} tone="dark" />
          </div>
        </div>
        <EventCover
          slug={event.slug}
          title={event.title}
          coverImage={cover ? `/api/event-images/${cover.id}` : event.coverImage}
          dateLine={formatDateTimeRange(event.startsAt, event.endsAt)}
          placeLine={`${event.venue} — ${event.location}`}
          priority
          className="w-full"
        />
      </header>

      <section aria-label="Informações do evento" className="bg-wine text-beige">
        <dl className="mx-auto grid max-w-[96rem] gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8">
          <div className="border-t border-beige/30 pt-4">
            <dt className="text-xs font-medium tracking-[0.16em] text-beige/75 uppercase">
              Data
            </dt>
            <dd className="mt-2 text-lg leading-snug">
              {formatDateTimeRange(event.startsAt, event.endsAt)}
            </dd>
          </div>
          <div className="border-t border-beige/30 pt-4">
            <dt className="text-xs font-medium tracking-[0.16em] text-beige/75 uppercase">
              Local
            </dt>
            <dd className="mt-2 text-lg leading-snug">{event.venue}</dd>
          </div>
          <div className="border-t border-beige/30 pt-4">
            <dt className="text-xs font-medium tracking-[0.16em] text-beige/75 uppercase">
              Cidade
            </dt>
            <dd className="mt-2 text-lg leading-snug">{event.location}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="sobre-evento" className="bg-beige text-brown-deep">
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2
              id="sobre-evento"
              className="font-subtitle text-[clamp(1.8rem,4vw,2.8rem)] leading-tight"
            >
              Sobre o evento
            </h2>
            <p className="mt-6 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-brown-raised whitespace-pre-line">
              {event.description}
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <div className="border-t border-brown-deep/25 pt-6">
              <p className="text-[1.0625rem] leading-[1.75]">
                Viveu este evento? Conte como foi no Feed, de forma anônima.
              </p>
              <ActionLink
                href={`/feed?evento=${event.slug}`}
                variant="wine"
                className="mt-6 w-full sm:w-auto"
              >
                Relatar este evento
              </ActionLink>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={`/eventos/${event.slug}/evento.ics`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-brown-deep/40 px-5 py-3 text-sm font-medium tracking-[0.08em] uppercase transition-colors hover:bg-brown-deep hover:text-beige"
                >
                  Adicionar ao calendário
                </a>
                <ShareEvent
                  title={event.title}
                  path={`/eventos/${event.slug}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {gallery.length > 0 ? (
        <EventGallery
          title={event.title}
          images={gallery.map((image) => ({
            id: image.id,
            url: `/api/event-images/${image.id}`,
          }))}
        />
      ) : null}

      <section
        aria-labelledby="relatos-do-evento"
        className="bg-beige-light text-brown-deep"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-16 sm:px-8 sm:py-20">
          <h2
            id="relatos-do-evento"
            className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-[0.95] tracking-[-0.015em]"
          >
            Relatos deste evento
          </h2>
          {relatedPosts.length > 0 ? (
            <div className="mt-10">
              {relatedPosts.map((post) => (
                <PostEntry key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-10 border-t border-brown-deep/20 pt-8 font-subtitle text-2xl">
              Ainda não há relatos deste evento. O primeiro pode ser o seu.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
