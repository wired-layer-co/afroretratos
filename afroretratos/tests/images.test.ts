import { describe, expect, test } from "bun:test";
import { MAX_IMAGE_BYTES, parseImageDataUrl } from "@/lib/validation/images";

function dataUrl(mime: string, bytes: number): string {
  // base64: 4 caracteres por 3 bytes.
  return `data:${mime};base64,${"A".repeat(Math.ceil(bytes / 3) * 4)}`;
}

describe("parseImageDataUrl", () => {
  test("aceita jpeg, png e webp", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
      const parsed = parseImageDataUrl(dataUrl(mime, 900));
      expect(parsed?.mime).toBe(mime);
      expect(parsed?.bytes).toBeGreaterThan(800);
    }
  });

  test("recusa formato que nao e imagem", () => {
    expect(parseImageDataUrl(dataUrl("image/gif", 500))).toBeNull();
    expect(parseImageDataUrl("data:text/plain;base64,QUJD")).toBeNull();
    expect(parseImageDataUrl("https://exemplo.com/capa.jpg")).toBeNull();
    expect(parseImageDataUrl("")).toBeNull();
  });

  test("recusa imagem acima do teto", () => {
    expect(parseImageDataUrl(dataUrl("image/jpeg", MAX_IMAGE_BYTES + 4_000))).toBeNull();
  });
});
