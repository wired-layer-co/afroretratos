import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ActionLink } from "@/components/ui/Action";

const TEAM = [
  "Hiago Araújo",
  "Isabella Monteiro",
  "Larissa Gonçalves",
  "Mah Netzel",
  "Maryana Mendes",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-wine text-beige">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[38%] hidden w-px bg-beige/20 lg:block"
      />
      <div className="mx-auto max-w-[96rem] px-5 pt-12 pb-16 sm:px-8 sm:pt-16 lg:pt-20 lg:pb-24">
        <h1 className="max-w-[64rem]" data-hero-enter>
          <Logo
            variant="beige"
            priority
            alt="AfroRetratos: representatividade e autoestima"
            className="h-auto w-full"
          />
        </h1>

        <div className="mt-12 grid gap-10 lg:mt-8 lg:grid-cols-12 lg:gap-0">
          <div
            className="rounded-lg bg-beige p-7 text-brown-deep sm:p-10 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mr-4 lg:p-12"
            data-hero-enter="2"
          >
            <p className="font-display text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.32] tracking-[-0.01em]">
              Quem somos nós
            </p>

            <div className="mt-6 grid gap-8 sm:grid-cols-[2.2fr_1fr]">
              <div className="grid content-start gap-6">
                <p className="max-w-[52ch] text-[1.0625rem] leading-[1.75] text-brown-raised">
                  Um coletivo de estudantes de Publicidade e Propaganda e Cinema e
                  Audiovisual da PUCPR, no Projeto IV: Production Design.
                </p>

                <p className="max-w-[52ch] text-[1.0625rem] leading-[1.75] text-brown-raised">
                  Construímos o AfroRetratos para fortalecer a autoestima e o
                  sentimento de pertencimento de pessoas negras por meio da
                  representatividade e da valorização da identidade.
                </p>
              </div>

              <ul aria-label="Equipe" className="grid content-start">
                {TEAM.map((name) => (
                  <li
                    key={name}
                    className="border-t border-brown-deep/20 py-3 text-sm font-medium"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
              <ActionLink
                href="/eventos"
                variant="wine"
                className="w-full sm:w-auto"
              >
                Ver eventos
              </ActionLink>
              <Link
                href="/feed"
                className="inline-flex min-h-11 items-center justify-center text-sm font-medium tracking-[0.08em] uppercase underline decoration-wine/40 hover:decoration-wine sm:justify-start"
              >
                Ler o Feed
              </Link>
            </div>
          </div>

          <div
            className="lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:pt-4"
            data-hero-enter="3"
          >
            <p className="max-w-[38ch] text-sm leading-relaxed text-beige/85">
              Um projeto da PUCPR sobre o impacto da representatividade na
              autoestima de pessoas negras: ações ao longo do semestre e um
              Feed de relatos anônimos da comunidade.
            </p>
            <dl className="mt-9 border-t border-beige/25 text-sm">
              <div className="flex items-baseline justify-between gap-6 border-b border-beige/25 py-3">
                <dt className="text-beige/75">Ações</dt>
                <dd className="font-medium">Manifesto, rodas e evento</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-b border-beige/25 py-3">
                <dt className="text-beige/75">Feed</dt>
                <dd className="font-medium">Anônimo, sem conta</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 py-3">
                <dt className="text-beige/75">Parceiros</dt>
                <dd className="font-medium">Coletivos e psicóloga</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
