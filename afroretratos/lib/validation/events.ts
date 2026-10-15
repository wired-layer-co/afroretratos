import { z } from "zod";
import { slugify } from "@/lib/slug";
import { normalizeContent } from "./posts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Fuso fixo do projeto; o Brasil nao usa mais horario de verao. */
export const EVENT_TIME_ZONE_OFFSET = "-03:00";

export function toEventIso(date: string, time: string): string {
  return `${date}T${time || "00:00"}:00${EVENT_TIME_ZONE_OFFSET}`;
}

export const eventStatusSchema = z.enum(["upcoming", "finished", "cancelled"]);

const optionalText = (max: number) =>
  z
    .string()
    .transform(normalizeContent)
    .pipe(z.string().max(max, `Use no máximo ${max} caracteres.`))
    .optional()
    .default("");

export const eventSchema = z
  .object({
    title: z
      .string()
      .transform(normalizeContent)
      .pipe(
        z
          .string()
          .min(3, "Informe um título com pelo menos 3 caracteres.")
          .max(160, "Título muito longo."),
      ),
    slug: z
      .string()
      .optional()
      .default("")
      .transform((value) => slugify(value))
      .pipe(
        z
          .string()
          .max(80, "Slug muito longo.")
          .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido."),
      ),
    description: optionalText(4000),
    startsDate: z.string().regex(DATE_PATTERN, "Informe a data inicial."),
    startsTime: z
      .union([z.literal(""), z.string().regex(TIME_PATTERN, "Horário inicial inválido.")])
      .optional()
      .default(""),
    endsDate: z
      .union([z.literal(""), z.string().regex(DATE_PATTERN, "Data final inválida.")])
      .optional()
      .default(""),
    endsTime: z
      .union([z.literal(""), z.string().regex(TIME_PATTERN, "Horário final inválido.")])
      .optional()
      .default(""),
    venue: optionalText(160),
    location: optionalText(160),
    status: eventStatusSchema,
  })
  .superRefine((data, context) => {
    if (!data.endsDate) return;
    const startsAt = new Date(toEventIso(data.startsDate, data.startsTime));
    const endsAt = new Date(toEventIso(data.endsDate, data.endsTime));
    if (endsAt.getTime() < startsAt.getTime()) {
      context.addIssue({
        code: "custom",
        path: ["endsDate"],
        message: "A data final não pode ser antes da inicial.",
      });
    }
  });

export type EventInput = z.output<typeof eventSchema>;

/**
 * A capa e gerenciada fora do formulario do evento (arquivo enviado pelo
 * painel ou URL externa), entao tem validacao propria.
 */
export const eventCoverUrlSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null))
  .pipe(z.union([z.url("URL da capa inválida."), z.null()]));

export const eventFormFields = [
  "title",
  "slug",
  "description",
  "startsDate",
  "startsTime",
  "endsDate",
  "endsTime",
  "venue",
  "location",
  "status",
] as const;
