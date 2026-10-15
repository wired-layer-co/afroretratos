import { describe, expect, test } from "bun:test";
import { slugify } from "../lib/slug";
import {
  eventCoverUrlSchema,
  eventSchema,
  toEventIso,
} from "../lib/validation/events";

const base = {
  title: "Roda de Conversa PUCPR",
  slug: "",
  description: "",
  startsDate: "2026-09-28",
  startsTime: "",
  endsDate: "",
  endsTime: "",
  venue: "",
  location: "",
  status: "upcoming",
} as const;

describe("slugify", () => {
  test("remove acentos e pontuação", () => {
    expect(slugify("Dia das Crianças")).toBe("dia-das-criancas");
    expect(slugify("  Evento: Beleza & Identidade!  ")).toBe(
      "evento-beleza-identidade",
    );
  });

  test("não deixa hífens nas pontas nem duplicados", () => {
    expect(slugify("--Roda   de___Conversa--")).toBe("roda-de-conversa");
  });
});

describe("toEventIso", () => {
  test("usa 00:00 quando não há horário (dia inteiro)", () => {
    expect(toEventIso("2026-09-28", "")).toBe("2026-09-28T00:00:00-03:00");
  });

  test("respeita o horário informado", () => {
    expect(toEventIso("2026-09-28", "19:30")).toBe(
      "2026-09-28T19:30:00-03:00",
    );
  });
});

describe("eventSchema", () => {
  test("aceita um evento válido e normaliza campos vazios", () => {
    const result = eventSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("");
      expect(result.data.description).toBe("");
      expect(result.data.venue).toBe("");
    }
  });

  test("rejeita título curto", () => {
    expect(eventSchema.safeParse({ ...base, title: "ab" }).success).toBe(false);
  });

  test("rejeita data final antes da inicial", () => {
    const result = eventSchema.safeParse({
      ...base,
      endsDate: "2026-09-27",
    });
    expect(result.success).toBe(false);
  });

  test("aceita intervalo com dia final igual e horário", () => {
    const result = eventSchema.safeParse({
      ...base,
      startsDate: "2026-11-07",
      startsTime: "14:00",
      endsDate: "2026-11-07",
      endsTime: "20:00",
    });
    expect(result.success).toBe(true);
  });

  test("normaliza slug informado", () => {
    const result = eventSchema.safeParse({ ...base, slug: "Meu Evento!" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.slug).toBe("meu-evento");
  });

  test("rejeita URL de capa inválida", () => {
    expect(eventCoverUrlSchema.safeParse("nao-e-url").success).toBe(false);
  });

  test("aceita URL de capa válida e trata vazio como ausência", () => {
    expect(eventCoverUrlSchema.safeParse("https://example.com/capa.png").data).toBe(
      "https://example.com/capa.png",
    );
    expect(eventCoverUrlSchema.safeParse("").data).toBeNull();
    expect(eventCoverUrlSchema.safeParse(undefined).data).toBeNull();
  });
});
