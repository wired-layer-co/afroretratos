"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { eventCoverUrlSchema } from "@/lib/validation/events";
import { parseImageDataUrl } from "@/lib/validation/images";
import {
  addGalleryImage,
  deleteEventCover,
  deleteEventImage,
  saveEventCover,
} from "@/services/event-images";
import { getEventById, setEventCoverUrl } from "@/services/events";

export type ImageActionState = { error?: string; ok?: string } | null;

function revalidateEvent(slug: string | null | undefined): void {
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/admin/eventos");
  if (slug) {
    revalidatePath(`/eventos/${slug}`);
    revalidatePath(`/admin/eventos/${slug}`);
  }
}

async function resolveEvent(eventId: string) {
  if (!eventId) return null;
  return getEventById(eventId);
}

/**
 * Grava a capa do evento. O navegador ja entrega a imagem recortada em 2:1
 * (ver EventCoverField), entao aqui so validamos e guardamos.
 */
export async function saveEventCoverAction(
  formData: FormData,
): Promise<ImageActionState> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const event = await resolveEvent(eventId);
  if (!event) return { error: "Evento não encontrado." };

  const image = parseImageDataUrl(String(formData.get("image") ?? ""));
  if (!image) {
    return { error: "Imagem inválida. Use JPG, PNG ou WebP de até 2,5 MB." };
  }

  try {
    await saveEventCover(event.id, image);
    // Arquivo e URL sao alternativas: enviar um limpa o outro.
    await setEventCoverUrl(event.id, null);
  } catch {
    return { error: "Não foi possível salvar a capa." };
  }

  revalidateEvent(event.slug);
  return { ok: "Capa atualizada." };
}

/** Capa por URL externa (alternativa ao arquivo enviado). */
export async function saveEventCoverUrlAction(
  formData: FormData,
): Promise<ImageActionState> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const event = await resolveEvent(eventId);
  if (!event) return { error: "Evento não encontrado." };

  const parsed = eventCoverUrlSchema.safeParse(String(formData.get("coverUrl") ?? ""));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "URL inválida." };
  }

  await setEventCoverUrl(event.id, parsed.data);
  if (parsed.data) {
    // A URL passa a valer: descarta o arquivo enviado antes.
    await deleteEventCover(event.id);
  }

  revalidateEvent(event.slug);
  return { ok: parsed.data ? "Capa definida pela URL." : "URL da capa removida." };
}

export async function removeEventCoverAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const event = await resolveEvent(eventId);
  if (!event) return;

  await deleteEventCover(event.id);
  await setEventCoverUrl(event.id, null);
  revalidateEvent(event.slug);
}

/** Acrescenta uma foto na galeria (carrossel da página pública). */
export async function addEventImageAction(
  formData: FormData,
): Promise<ImageActionState> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const event = await resolveEvent(eventId);
  if (!event) return { error: "Evento não encontrado." };

  const image = parseImageDataUrl(String(formData.get("image") ?? ""));
  if (!image) {
    return { error: "Imagem inválida. Use JPG, PNG ou WebP de até 2,5 MB." };
  }

  try {
    await addGalleryImage(event.id, image);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível salvar a foto.";
    return { error: message };
  }

  revalidateEvent(event.slug);
  return { ok: "Foto adicionada." };
}

export async function removeEventImageAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const id = String(formData.get("id") ?? "");
  const event = await resolveEvent(eventId);
  if (!event) return;

  await deleteEventImage(id, event.id);
  revalidateEvent(event.slug);
}
