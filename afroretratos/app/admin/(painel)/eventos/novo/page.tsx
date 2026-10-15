import Link from "next/link";
import { EventForm } from "../event-form";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="mx-auto w-full max-w-[64rem]">
      <Link
        href="/admin/eventos"
        className="text-xs font-medium tracking-[0.12em] text-brown-raised uppercase underline decoration-brown-deep/30 hover:decoration-brown-deep"
      >
        Voltar para eventos
      </Link>
      <h1 className="mt-5 font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-none">
        Novo evento
      </h1>
      <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-brown-raised">
        O evento entra no site assim que for salvo: home, agenda, página própria
        e sitemap. A capa e as fotos do carrossel são enviadas depois, na tela de
        edição do evento.
      </p>
      <div className="mt-10">
        <EventForm />
      </div>
    </div>
  );
}
