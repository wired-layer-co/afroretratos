"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { removeEventImageAction } from "@/app/admin/(painel)/eventos/image-actions";

export type AdminGalleryImage = {
  id: string;
  url: string;
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className="h-4 w-2"
    >
      <path d={direction === "left" ? "M9 2 L3 12 L9 22" : "M3 2 L9 12 L3 22"} />
    </svg>
  );
}

const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brown-deep/40 px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors hover:bg-brown-deep hover:text-beige disabled:cursor-not-allowed disabled:opacity-60";
const ARROW =
  "grid h-11 w-11 place-items-center border border-brown-deep/40 transition-colors hover:bg-brown-deep hover:text-beige";

/**
 * Previa do carrossel dentro do painel: o mesmo enquadramento que o visitante
 * ve, com a remocao agindo sobre a foto em exibicao.
 */
export function EventGalleryPreview({
  eventId,
  images,
}: {
  eventId: string;
  images: AdminGalleryImage[];
}) {
  const [rawIndex, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const count = images.length;
  // Depois de remover, o indice pode passar do fim.
  const index = Math.min(rawIndex, Math.max(0, count - 1));
  const current = images[index];

  function go(next: number) {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
  }

  function remove(id: string) {
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("id", id);
    startTransition(async () => {
      await removeEventImageAction(formData);
      setIndex(0);
    });
  }

  if (!current) return null;

  return (
    <div className="mt-6">
      <p className="text-xs text-brown-raised">
        É assim que as fotos aparecem na página do evento.
      </p>

      <div className="mt-3 max-w-[42rem]">
        <div className="relative aspect-[4/3] overflow-hidden border border-brown-deep/30 bg-beige sm:aspect-[16/9]">
          {images.map((image, slide) => (
            <div
              key={image.id}
              className="absolute inset-0 motion-reduce:transition-none"
              style={{
                transform: `translateX(${(slide - index) * 100}%)`,
                transition: "transform 480ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              aria-hidden={slide !== index}
            >
              <Image
                src={image.url}
                alt={`Foto ${slide + 1} do carrossel`}
                fill
                sizes="(max-width: 640px) 100vw, 672px"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Foto anterior"
            className={ARROW}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Próxima foto"
            className={ARROW}
          >
            <Chevron direction="right" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => remove(current.id)}
            className={`${BUTTON} border-wine text-wine hover:bg-wine`}
          >
            {pending ? "Removendo…" : "Remover esta foto"}
          </button>
        </div>

        {count > 1 ? (
          <ul className="mt-4 flex flex-wrap gap-3">
            {images.map((image, slide) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => go(slide)}
                  aria-label={`Ver foto ${slide + 1}`}
                  aria-current={slide === index}
                  className={`relative block h-14 w-20 overflow-hidden border transition-opacity ${
                    slide === index
                      ? "border-brown-deep opacity-100"
                      : "border-brown-deep/25 opacity-60 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
