"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { slugify } from "@/lib/slug";
import { eventSchema, toEventIso } from "@/lib/validation/events";
import {
  createEvent,
  deleteEvent,
  uniqueSlug,
  updateEvent,
} from "@/services/events";

export type EventActionState = { error?: string } | null;

function revalidateEventSurfaces(
  slugs: Array<string | null | undefined>,
): void {
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/admin/eventos");
  revalidatePath("/sitemap.xml");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/eventos/${slug}`);
  }
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export async function saveEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  await requireAdmin();

  const parsed = eventSchema.safeParse({
    title: field(formData, "title"),
    slug: field(formData, "slug"),
    description: field(formData, "description"),
    startsDate: field(formData, "startsDate"),
    startsTime: field(formData, "startsTime"),
    endsDate: field(formData, "endsDate"),
    endsTime: field(formData, "endsTime"),
    venue: field(formData, "venue"),
    location: field(formData, "location"),
    status: field(formData, "status") || "upcoming",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const data = parsed.data;
  const id = field(formData, "id");
  const previousSlug = field(formData, "previousSlug");
  const slug = await uniqueSlug(
    data.slug || slugify(data.title),
    id || undefined,
  );

  const payload = {
    title: data.title,
    slug,
    description: data.description,
    startsAt: toEventIso(data.startsDate, data.startsTime),
    endsAt: data.endsDate ? toEventIso(data.endsDate, data.endsTime) : null,
    venue: data.venue,
    location: data.location,
    status: data.status,
  };

  if (id) {
    const updated = await updateEvent(id, payload);
    if (!updated) return { error: "Evento não encontrado." };
    revalidateEventSurfaces([previousSlug, slug]);
  } else {
    await createEvent(payload);
    revalidateEventSurfaces([slug]);
  }

  redirect("/admin/eventos?salvo=1");
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = field(formData, "id");
  const slug = field(formData, "slug");

  if (id) {
    await deleteEvent(id);
    revalidateEventSurfaces([slug]);
  }

  redirect("/admin/eventos?excluido=1");
}
