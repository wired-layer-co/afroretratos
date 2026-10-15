"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type GalleryImage = {
  id: string;
  url: string;
};

/**
 * Chevron autoral no mesmo traco do sistema (1.5px, ponta reta).
 */
function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className="h-5 w-2.5"
    >
      <path d={direction === "left" ? "M9 2 L3 12 L9 22" : "M3 2 L9 12 L3 22"} />
    </svg>
  );
}

/**
 * Carrossel de fotos do evento, em campo oliva entre "Sobre o evento" e os
 * relatos. Navega por botoes, teclado e arraste; sem sombra, com emenda de 1px
 * e cantos vivos, conforme o panô.
 */
export function EventGallery({
  title,
  images,
}: {
  title: string;
  images: GalleryImage[];
}) {
  const [index, setIndex] = useState(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;

  function go(next: number) {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? index + 1 : index - 1);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  const pagination = String(index + 1).padStart(2, "0");
  const paginationTotal = String(count).padStart(2, "0");

  const controls = (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium tabular-nums">
        {pagination} / {paginationTotal}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Foto anterior"
          className="grid h-11 w-11 place-items-center border border-beige-light/40 transition-colors hover:bg-beige hover:text-wine focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-beige"
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Próxima foto"
          className="grid h-11 w-11 place-items-center border border-beige-light/40 transition-colors hover:bg-beige hover:text-wine focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-beige"
        >
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );

  return (
    <section aria-labelledby="fotos-do-evento" className="bg-olive text-beige-light">
      <div className="mx-auto grid max-w-[96rem] gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="lg:col-span-4">
          <h2
            id="fotos-do-evento"
            className="font-subtitle text-[clamp(1.8rem,4vw,2.8rem)] leading-tight"
          >
            Fotos do evento
          </h2>
          <p className="mt-5 max-w-[38ch] text-sm leading-relaxed">
            Registros enviados pela equipe. Arraste, use as setas ou toque nas
            miniaturas.
          </p>
          {/* No celular os controles ficam depois da foto, junto do que comandam. */}
          <div className="mt-8 hidden lg:block">{controls}</div>
        </div>

        <div
          className="lg:col-span-8"
          role="group"
          aria-roledescription="carrossel"
          aria-label={`Fotos do evento ${title}`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <div className="relative aspect-[4/3] overflow-hidden border border-beige-light/30 bg-olive-deep sm:aspect-[16/9]">
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
                  alt={`Foto ${slide + 1} de ${count} do evento ${title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                  draggable="false"
                />
              </div>
            ))}
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
                        ? "border-beige-light opacity-100"
                        : "border-beige-light/25 opacity-55 hover:opacity-90"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 lg:hidden">{controls}</div>
        </div>
      </div>
    </section>
  );
}
