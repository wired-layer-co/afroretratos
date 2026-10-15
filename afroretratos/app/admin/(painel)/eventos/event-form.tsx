"use client";

import Link from "next/link";
import { useActionState } from "react";
import { eventInputDate, eventInputTime } from "@/lib/format";
import type { PublicEvent } from "@/lib/types";
import { saveEventAction, type EventActionState } from "./actions";

const LABEL = "block text-sm font-medium";
const FIELD =
  "mt-2 w-full rounded-md border border-brown-deep/40 bg-beige-light/60 px-3 py-2.5 text-base text-brown-deep focus:border-wine focus-visible:outline-wine sm:text-sm";
const HINT = "mt-1 text-xs text-brown-raised";

export function EventForm({ event }: { event?: PublicEvent }) {
  const [state, formAction, pending] = useActionState<
    EventActionState,
    FormData
  >(saveEventAction, null);

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      {event ? (
        <input type="hidden" name="previousSlug" value={event.slug} />
      ) : null}

      {state?.error ? (
        <p
          role="alert"
          className="rounded-md border border-wine/40 bg-wine/5 p-4 text-sm text-wine"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="title" className={LABEL}>
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={160}
          defaultValue={event?.title ?? ""}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="slug" className={LABEL}>
          Slug (URL)
        </label>
        <input
          id="slug"
          name="slug"
          maxLength={80}
          defaultValue={event?.slug ?? ""}
          placeholder="gerado do título quando vazio"
          className={FIELD}
        />
        <p className={HINT}>
          Endereço do evento em /eventos/&lt;slug&gt;. Se ficar vazio, é
          criado a partir do título; duplicados recebem -2, -3.
        </p>
      </div>

      <div>
        <label htmlFor="description" className={LABEL}>
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={4000}
          defaultValue={event?.description ?? ""}
          className={FIELD}
        />
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="startsDate" className={LABEL}>
            Data inicial
          </label>
          <input
            id="startsDate"
            name="startsDate"
            type="date"
            required
            defaultValue={event ? eventInputDate(event.startsAt) : ""}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="startsTime" className={LABEL}>
            Horário inicial
          </label>
          <input
            id="startsTime"
            name="startsTime"
            type="time"
            defaultValue={event ? eventInputTime(event.startsAt) : ""}
            className={FIELD}
          />
          <p className={HINT}>Deixe vazio para evento de dia inteiro.</p>
        </div>
        <div>
          <label htmlFor="endsDate" className={LABEL}>
            Data final
          </label>
          <input
            id="endsDate"
            name="endsDate"
            type="date"
            defaultValue={
              event?.endsAt ? eventInputDate(event.endsAt) : ""
            }
            className={FIELD}
          />
          <p className={HINT}>Opcional, para ações com mais de um dia.</p>
        </div>
        <div>
          <label htmlFor="endsTime" className={LABEL}>
            Horário final
          </label>
          <input
            id="endsTime"
            name="endsTime"
            type="time"
            defaultValue={
              event?.endsAt ? eventInputTime(event.endsAt) : ""
            }
            className={FIELD}
          />
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="venue" className={LABEL}>
            Local
          </label>
          <input
            id="venue"
            name="venue"
            maxLength={160}
            defaultValue={event?.venue ?? ""}
            placeholder="A definir"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="location" className={LABEL}>
            Cidade
          </label>
          <input
            id="location"
            name="location"
            maxLength={160}
            defaultValue={event?.location ?? ""}
            placeholder="Curitiba, PR"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className={LABEL}>
          Situação
        </label>
        <select
          id="status"
          name="status"
          defaultValue={event?.status ?? "upcoming"}
          className={FIELD}
        >
          <option value="upcoming">Em breve</option>
          <option value="finished">Encerrado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-brown-deep/20 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-wine px-6 py-3 text-sm font-medium tracking-[0.08em] text-beige uppercase transition-colors hover:bg-wine-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : event ? "Salvar alterações" : "Criar evento"}
        </button>
        <Link
          href="/admin/eventos"
          className="text-sm font-medium text-brown-raised underline decoration-brown-deep/40 hover:decoration-brown-deep"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
