import Image from "next/image";

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

// Larguras limitadas a ~62%: a faixa de texto fica na metade esquerda e o
// icone respira no campo vinho a direita, sem se perder sobre o bege.
const LAYOUTS = [
  [80, 54, 89, 43, 68],
  [63, 86, 48, 75, 57],
  [89, 48, 72, 61, 83],
  [54, 77, 66, 89, 52],
] as const;

/**
 * Capa provisoria: blocos horizontais nas cores oficiais com titulo, data e
 * local do evento, em ritmo irregular, com o icone da marca. Nenhuma
 * fotografia e simulada. Quando o evento tiver coverImage real, ela assume o
 * lugar automaticamente.
 */
export function EventCover({
  slug,
  title,
  coverImage,
  dateLine,
  placeLine,
  className = "",
  priority = false,
}: {
  slug: string;
  title: string;
  coverImage?: string | null;
  dateLine?: string | null;
  placeLine?: string | null;
  className?: string;
  priority?: boolean;
}) {
  if (coverImage) {
    // 2:1 e o formato do recorte enviado pelo painel (ver EventCoverField).
    return (
      <div className={`relative aspect-[2/1] overflow-hidden bg-wine ${className}`}>
        <Image
          src={coverImage}
          alt={`Capa do evento ${title}`}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 66vw"
          className="object-cover"
        />
      </div>
    );
  }

  const seed = hash(slug);
  const widths = LAYOUTS[seed % LAYOUTS.length];
  const palettes = [
    ["#510000", "#CCB49A", "#514D32", "#452A21", "#CCB49A"],
    ["#452A21", "#CCB49A", "#510000", "#514D32", "#CCB49A"],
    ["#514D32", "#CCB49A", "#452A21", "#510000", "#CCB49A"],
  ] as const;
  const palette = palettes[seed % palettes.length];
  const offset = 7 + (seed % 12);

  const BEIGE = "#CCB49A";
  const WINE = "#510000";
  const texts = [title, dateLine, placeLine].filter(Boolean) as string[];
  const rows: { text: string | null; first: boolean }[] = [
    { text: null, first: false },
    ...texts.map((text, index) => ({ text, first: index === 0 })),
    { text: null, first: false },
  ];

  return (
    <div className={`relative overflow-hidden bg-wine-deep ${className}`}>
      {/* O icone vem antes das barras no DOM: onde houver texto, o texto vence. */}
      <Image
        src="/brand/afroretratos-icone-bege.png"
        alt=""
        width={809}
        height={727}
        className="absolute top-1/2 right-[7%] h-[32%] w-auto -translate-y-1/2 sm:h-[40%]"
      />
      <div
        className="relative flex flex-col justify-center gap-1.5 py-8 pr-[30%] sm:gap-2 sm:py-12 sm:pr-[16%]"
        style={{ paddingLeft: `${offset}%` }}
      >
        {rows.map((row, index) => {
          const bg = palette[index % palette.length];
          const fg = bg === BEIGE ? WINE : BEIGE;
          return (
            <span
              key={index}
              style={{ width: `${widths[index % widths.length]}%`, backgroundColor: bg }}
              className={
                row.text
                  ? "flex items-center px-3 py-1.5 sm:min-h-20 sm:px-4 sm:py-2"
                  : "h-5 sm:h-12"
              }
            >
              {row.text ? (
                <span
                  style={{ color: fg }}
                  className={
                    row.first
                      ? "block text-sm leading-snug font-semibold sm:text-xl"
                      : "block text-[10px] font-medium tracking-[0.08em] uppercase sm:text-xs"
                  }
                >
                  {row.text}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
