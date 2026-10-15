/**
 * O painel envia a imagem ja recortada/redimensionada pelo navegador como
 * data URL. Aqui so validamos o formato e o tamanho: nada de biblioteca de
 * imagem no servidor (o container nao tem sharp).
 */

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

// Teto por imagem. O navegador manda no maximo ~1.600px em JPEG, o que fica
// bem abaixo disso; o limite existe para barrar payload absurdo.
export const MAX_IMAGE_BYTES = 2_500_000;

export type ParsedImage = {
  mime: string;
  base64: string;
  bytes: number;
};

export function parseImageDataUrl(value: string): ParsedImage | null {
  const match = DATA_URL_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, mime, base64] = match;
  // base64 carrega 3 bytes a cada 4 caracteres.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes === 0 || bytes > MAX_IMAGE_BYTES) return null;

  return { mime, base64, bytes };
}
