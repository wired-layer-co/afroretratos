"use client";

import { useRef, useState, type ReactNode } from "react";

type Tab = "dados" | "imagens";

const TAB =
  "-mb-px border-b-2 px-4 py-3 text-xs font-medium tracking-[0.12em] uppercase transition-colors";
const ACTIVE = "border-wine text-brown-deep";
const IDLE = "border-transparent text-brown-raised hover:text-brown-deep";

/**
 * Duas abas no painel do evento: dados e imagens. Os dois paineis ficam
 * montados (o inativo so escondido), para trocar de aba nao perder o que foi
 * digitado no formulario.
 */
export function EventTabs({
  data,
  images,
  imageCount,
}: {
  data: ReactNode;
  images: ReactNode;
  imageCount: number;
}) {
  const [tab, setTab] = useState<Tab>("dados");
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({
    dados: null,
    imagens: null,
  });

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next: Tab = tab === "dados" ? "imagens" : "dados";
    setTab(next);
    refs.current[next]?.focus();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dados", label: "Dados" },
    { id: "imagens", label: "Imagens" },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Seções do evento"
        onKeyDown={onKeyDown}
        className="flex gap-2 border-b border-brown-deep/25"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[item.id] = node;
            }}
            type="button"
            role="tab"
            id={`aba-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`painel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            className={`${TAB} ${tab === item.id ? ACTIVE : IDLE}`}
          >
            {item.label}
            {item.id === "imagens" && imageCount > 0 ? (
              <span className="ml-2 tabular-nums">({imageCount})</span>
            ) : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="painel-dados"
        aria-labelledby="aba-dados"
        hidden={tab !== "dados"}
        className="pt-8"
      >
        {data}
      </div>

      <div
        role="tabpanel"
        id="painel-imagens"
        aria-labelledby="aba-imagens"
        hidden={tab !== "imagens"}
        className="pt-8"
      >
        {images}
      </div>
    </div>
  );
}
